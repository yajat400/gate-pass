/* Guard view for approved visitor passes. */
const visitorGuardSessionKey = "campusPassGuardSession";
let selectedVisitor = null;
let visitorListTimer = null;
let pendingVisitorQr = new URLSearchParams(window.location.search).get("visitor") || "";

function guardVisitorRpc(name, params) {
  if (!window.CampusGatePass) return Promise.reject(new Error("GatePass scripts did not load. Reload the page."));
  return window.CampusGatePass.rpc(name, params || {});
}

function visitorQrTokenFrom(raw) {
  const value = raw.trim();
  try {
    const url = new URL(value);
    return url.searchParams.get("visitor") || value;
  } catch (_) {
    const match = value.match(/[?&]visitor=([^&#]+)/);
    return match ? decodeURIComponent(match[1]) : value;
  }
}

function setGuardVisitorMessage(text, type) {
  if (window.CampusGatePass) window.CampusGatePass.message("visitor-scan-message", text, type || "info");
}

function setVisitorMoveOptions(visitor) {
  const select = document.getElementById("visitor-movement");
  select.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choose entry or exit";
  select.append(placeholder);
  const canExit = visitor.gateStatus === "IN";
  const canEnter = visitor.gateStatus === "OUT" && visitor.passStatus !== "OVERDUE";
  if (canEnter) {
    const entry = document.createElement("option");
    entry.value = "ENTRY";
    entry.textContent = "Entry — entering campus";
    select.append(entry);
  }
  if (canExit) {
    const exit = document.createElement("option");
    exit.value = "EXIT";
    exit.textContent = "Exit — leaving campus";
    select.append(exit);
  }
  select.disabled = !canEnter && !canExit;
  document.querySelector("#visitor-confirm-form button[type=submit]").disabled = !canEnter && !canExit;
}

function showGuardVisitor(visitor) {
  selectedVisitor = visitor;
  document.getElementById("guard-visitor-result").classList.remove("hidden");
  document.getElementById("guard-visitor-name").textContent = visitor.name;
  const phone = document.getElementById("guard-visitor-phone");
  phone.textContent = visitor.phone;
  phone.href = "tel:" + visitor.phone.replace(/[^+0-9]/g, "");
  document.getElementById("guard-visitor-host").textContent = visitor.host;
  document.getElementById("guard-visitor-purpose").textContent = visitor.purpose;
  document.getElementById("guard-visitor-pass-status").textContent = visitor.passStatus;
  document.getElementById("guard-visitor-gate-status").textContent = visitor.gateStatus;
  document.getElementById("guard-visitor-expiry").textContent = visitor.expiresAt ? "Pass ends " + new Date(visitor.expiresAt).toLocaleString() : "";

  document.getElementById("visitor-id-check").checked = false;
  setVisitorMoveOptions(visitor);
}

async function lookupVisitor(raw) {
  const token = visitorQrTokenFrom(raw);
  const result = await guardVisitorRpc("guard_lookup_visitor", {
    p_session_token: localStorage.getItem(visitorGuardSessionKey),
    p_qr_token: token
  });
  showGuardVisitor(result.visitor);
  window.CampusGatePass.clearMessage("visitor-scan-message");
}

function visitorCard(visitor) {
  const card = document.createElement("article");
  card.className = "visitor-card" + (visitor.passStatus === "OVERDUE" ? " overdue" : "");
  const title = document.createElement("h3");
  title.textContent = visitor.name + (visitor.passStatus === "OVERDUE" ? " · OVERDUE" : " · ACTIVE");
  const contact = document.createElement("p");
  contact.append("Contact: ");
  const phone = document.createElement("a");
  phone.href = "tel:" + visitor.phone.replace(/[^+0-9]/g, "");
  phone.textContent = visitor.phone;
  contact.append(phone);
  const details = document.createElement("p");
  details.textContent = "Visiting: " + visitor.host + " · Gate status: " + visitor.gateStatus;
  const expiry = document.createElement("p");
  expiry.className = "muted small-copy";
  expiry.textContent = "Pass ends " + new Date(visitor.expiresAt).toLocaleString();
  const actions = document.createElement("div");
  actions.className = "visitor-actions";
  const selectButton = document.createElement("button");
  selectButton.type = "button";
  selectButton.className = "button";
  selectButton.textContent = "Open pass";
  selectButton.addEventListener("click", function () { lookupVisitor(visitor.qrToken).catch(function (error) { setGuardVisitorMessage(error.message, "error"); }); });
  actions.append(selectButton);
  card.append(title, contact, details, expiry, actions);
  return card;
}

async function refreshGuardVisitors() {
  const target = document.getElementById("guard-visitor-list");
  if (!target) return;
  const result = await guardVisitorRpc("guard_visitor_list", { p_session_token: localStorage.getItem(visitorGuardSessionKey) });
  target.replaceChildren();
  if (!result.visitors.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No active or overdue visitors.";
    target.append(empty);
    return;
  }
  result.visitors.forEach(function (visitor) { target.append(visitorCard(visitor)); });
}

async function onGuardReady() {
  try {
    await refreshGuardVisitors();
    if (visitorListTimer) clearInterval(visitorListTimer);
    visitorListTimer = setInterval(function () {
      refreshGuardVisitors().catch(function () {});
    }, 20000);
    if (pendingVisitorQr) {
      document.getElementById("visitor-qr-token").value = pendingVisitorQr;
      await lookupVisitor(pendingVisitorQr);
      pendingVisitorQr = "";
    }
  } catch (error) {
    const target = document.getElementById("guard-visitor-list");
    if (target) target.textContent = error.message;
  }
}

function initGuardVisitors() {
  const form = document.getElementById("visitor-scan-form");
  if (!form) return;
  document.getElementById("start-visitor-camera").addEventListener("click", function () {
    window.CampusGatePass.startQrCamera("visitor");
  });
  document.addEventListener("campus:visitor-qr-scanned", function (event) {
    const rawValue = event.detail && event.detail.text;
    if (!rawValue) return;
    document.getElementById("visitor-qr-token").value = rawValue;
    lookupVisitor(rawValue).catch(function (error) {
      document.getElementById("guard-visitor-result").classList.add("hidden");
      setGuardVisitorMessage(error.message, "error");
    });
  });
  document.addEventListener("campus:guard-ready", onGuardReady);
  document.addEventListener("campus:guard-logout", function () {
    if (visitorListTimer) clearInterval(visitorListTimer);
    visitorListTimer = null;
    selectedVisitor = null;
    document.getElementById("guard-visitor-result").classList.add("hidden");
    document.getElementById("guard-visitor-list").textContent = "Sign in to view approved visitors.";
  });
  document.getElementById("visitor-list-refresh").addEventListener("click", function () {
    refreshGuardVisitors().catch(function (error) { document.getElementById("guard-visitor-list").textContent = error.message; });
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    lookupVisitor(document.getElementById("visitor-qr-token").value).catch(function (error) {
      document.getElementById("guard-visitor-result").classList.add("hidden");
      setGuardVisitorMessage(error.message, "error");
    });
  });
  document.getElementById("visitor-confirm-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!selectedVisitor) return;
    const button = event.currentTarget.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const result = await guardVisitorRpc("guard_record_visitor_scan", {
        p_session_token: localStorage.getItem(visitorGuardSessionKey),
        p_qr_token: selectedVisitor.qrToken,
        p_movement: document.getElementById("visitor-movement").value,
        p_id_checked: document.getElementById("visitor-id-check").checked
      });
      setGuardVisitorMessage(result.visitor.name + ": " + result.movement + " recorded. Gate status is now " + result.visitor.gateStatus + ".", "success");
      document.getElementById("guard-visitor-result").classList.add("hidden");
      selectedVisitor = null;
      await refreshGuardVisitors();
    } catch (error) {
      setGuardVisitorMessage(error.message, "error");
    } finally {
      button.disabled = false;
    }
  });
  if (localStorage.getItem(visitorGuardSessionKey)) onGuardReady();
}

initGuardVisitors();

/* Visitor request, QR pass, and admin approval. */
const visitorSessionKey = "campusPassVisitorSession";
const adminSessionKey = "campusPassVisitorAdminSession";
let visitorRefreshTimer = null;
let adminRefreshTimer = null;

function visitorRpc(name, params) {
  if (!window.CampusGatePass) return Promise.reject(new Error("GatePass scripts did not load. Reload the page."));
  return window.CampusGatePass.rpc(name, params || {});
}

function setVisitorMessage(id, text, type) {
  if (window.CampusGatePass) window.CampusGatePass.message(id, text, type || "info");
}

function clearVisitorMessage(id) {
  if (window.CampusGatePass) window.CampusGatePass.clearMessage(id);
}

function visitorSessionToken() {
  return localStorage.getItem(visitorSessionKey);
}

function showVisitorPass(visitor) {
  document.getElementById("visitor-request").classList.add("hidden");
  document.getElementById("visitor-login").classList.add("hidden");
  document.getElementById("visitor-pass").classList.remove("hidden");
  document.getElementById("visitor-pass-name").textContent = visitor.name;
  document.getElementById("visitor-pass-id").textContent = visitor.id;
  document.getElementById("visitor-pass-status").textContent = visitor.status;
  document.getElementById("visitor-pass-gate-status").textContent = visitor.gateStatus ? "Gate status: " + visitor.gateStatus : "";

  const expiry = document.getElementById("visitor-pass-expiry");
  if (visitor.expiresAt) expiry.textContent = "Approved until " + new Date(visitor.expiresAt).toLocaleString();
  else expiry.textContent = "Your request is waiting for admin review.";

  const qrPanel = document.getElementById("visitor-qr-panel");
  qrPanel.classList.toggle("hidden", !visitor.qrToken);
  if (visitor.qrToken) {
    const guardLink = new URL("guard.html", window.location.href);
    guardLink.searchParams.set("visitor", visitor.qrToken);
    const qr = document.getElementById("visitor-qr");
    qr.replaceChildren();
    if (window.QRCode) new QRCode(qr, { text: guardLink.href, width: 148, height: 148, colorDark: "#1d3551", colorLight: "#ffffff" });
    else setVisitorMessage("visitor-pass-message", "QR library did not load. Reload with an internet connection.", "error");
  }

  if (visitor.status === "REJECTED") setVisitorMessage("visitor-pass-message", "The admin did not approve this request. Contact the campus office if you need help.", "error");
  else if (visitor.status === "COMPLETED") setVisitorMessage("visitor-pass-message", "This visit is complete.", "success");
  else clearVisitorMessage("visitor-pass-message");
}

async function refreshVisitorPass() {
  const token = visitorSessionToken();
  if (!token) return;
  try {
    const result = await visitorRpc("visitor_me", { p_session_token: token });
    showVisitorPass(result.visitor);
  } catch (error) {
    localStorage.removeItem(visitorSessionKey);
    if (visitorRefreshTimer) clearInterval(visitorRefreshTimer);
    visitorRefreshTimer = null;
    document.getElementById("visitor-pass").classList.add("hidden");
    document.getElementById("visitor-request").classList.remove("hidden");
    setVisitorMessage("visitor-request-message", error.message, "error");
  }
}

function startVisitorSession(result) {
  localStorage.setItem(visitorSessionKey, result.sessionToken);
  clearVisitorMessage("visitor-request-message");
  clearVisitorMessage("visitor-login-message");
  if (visitorRefreshTimer) clearInterval(visitorRefreshTimer);
  refreshVisitorPass();
  visitorRefreshTimer = setInterval(refreshVisitorPass, 10000);
}

function initVisitorPage() {
  const requestForm = document.getElementById("visitor-request-form");
  if (!requestForm) return;
  document.getElementById("show-visitor-login").addEventListener("click", function () {
    document.getElementById("visitor-request").classList.add("hidden");
    document.getElementById("visitor-login").classList.remove("hidden");
    clearVisitorMessage("visitor-login-message");
  });
  document.getElementById("show-visitor-request").addEventListener("click", function () {
    document.getElementById("visitor-login").classList.add("hidden");
    document.getElementById("visitor-request").classList.remove("hidden");
    clearVisitorMessage("visitor-request-message");
  });
  requestForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const button = requestForm.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const result = await visitorRpc("visitor_request", {
        p_name: document.getElementById("visitor-name-input").value.trim(),
        p_phone: document.getElementById("visitor-phone-input").value.trim(),
        p_host_name: document.getElementById("visitor-host-input").value.trim(),
        p_purpose: document.getElementById("visitor-purpose-input").value.trim(),
        p_duration_minutes: Number(document.getElementById("visitor-duration-input").value),
        p_access_code: document.getElementById("visitor-access-code-input").value
      });
      requestForm.reset();
      startVisitorSession(result);
    } catch (error) {
      setVisitorMessage("visitor-request-message", error.message, "error");
    } finally {
      button.disabled = false;
    }
  });
  document.getElementById("visitor-login-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const result = await visitorRpc("visitor_login", {
        p_visitor_id: Number(document.getElementById("visitor-request-id").value),
        p_access_code: document.getElementById("visitor-access-code").value
      });
      startVisitorSession(result);
    } catch (error) {
      setVisitorMessage("visitor-login-message", error.message, "error");
    } finally {
      button.disabled = false;
    }
  });
  document.getElementById("visitor-logout").addEventListener("click", async function () {
    const token = visitorSessionToken();
    if (token) {
      visitorRpc("logout_session", { p_session_token: token }).catch(function () {});
    }
    localStorage.removeItem(visitorSessionKey);
    if (visitorRefreshTimer) clearInterval(visitorRefreshTimer);
    visitorRefreshTimer = null;
    document.getElementById("visitor-pass").classList.add("hidden");
    document.getElementById("visitor-request").classList.remove("hidden");
  });
  const existing = visitorSessionToken();
  if (existing) {
    document.getElementById("visitor-request").classList.add("hidden");
    document.getElementById("visitor-pass").classList.remove("hidden");
    refreshVisitorPass();
    visitorRefreshTimer = setInterval(refreshVisitorPass, 10000);
  }
}

function renderAdminRequests(requests) {
  const target = document.getElementById("admin-requests");
  target.replaceChildren();
  if (!requests.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No pending visitor requests.";
    target.append(empty);
    return;
  }
  requests.forEach(function (request) {
    const card = document.createElement("article");
    card.className = "visitor-card";
    const heading = document.createElement("h3");
    heading.textContent = request.name + " · Request #" + request.id;
    const details = document.createElement("p");
    details.textContent = "Contact: " + request.phone + " | Visiting: " + request.host + " | Duration: " + request.requestedMinutes + " minutes";
    const purpose = document.createElement("p");
    purpose.textContent = "Reason: " + request.purpose;
    const created = document.createElement("p");
    created.className = "muted small-copy";
    created.textContent = "Requested " + new Date(request.requestedAt).toLocaleString();
    const actions = document.createElement("div");
    actions.className = "visitor-actions";
    const approve = document.createElement("button");
    approve.type = "button";
    approve.className = "button";
    approve.textContent = "Approve";
    approve.addEventListener("click", function () { decideVisitor(request.id, "APPROVE"); });
    const reject = document.createElement("button");
    reject.type = "button";
    reject.className = "button button-secondary";
    reject.textContent = "Reject";
    reject.addEventListener("click", function () { decideVisitor(request.id, "REJECT"); });
    actions.append(approve, reject);
    card.append(heading, details, purpose, created, actions);
    target.append(card);
  });
}

async function refreshAdminRequests() {
  const result = await visitorRpc("admin_pending_visitors", { p_session_token: localStorage.getItem(adminSessionKey) });
  renderAdminRequests(result.requests);
  clearVisitorMessage("admin-message");
}

async function decideVisitor(id, decision) {
  try {
    const result = await visitorRpc("admin_decide_visitor", {
      p_session_token: localStorage.getItem(adminSessionKey),
      p_visitor_id: id,
      p_decision: decision
    });
    setVisitorMessage("admin-message", "Request #" + id + " " + result.status.toLowerCase() + ".", "success");
    await refreshAdminRequests();
  } catch (error) {
    setVisitorMessage("admin-message", error.message, "error");
  }
}

function initAdminPage() {
  const loginForm = document.getElementById("admin-login-form");
  if (!loginForm) return;
  const dashboard = document.getElementById("admin-dashboard");
  const showAdminDashboard = async function (adminName) {
    document.getElementById("admin-login").classList.add("hidden");
    dashboard.classList.remove("hidden");
    if (adminName) document.getElementById("admin-session-name").textContent = "Signed in as " + adminName;
    await refreshAdminRequests();
    if (adminRefreshTimer) clearInterval(adminRefreshTimer);
    adminRefreshTimer = setInterval(function () {
      refreshAdminRequests().catch(function (error) { setVisitorMessage("admin-message", error.message, "error"); });
    }, 15000);
  };
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const button = loginForm.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const result = await visitorRpc("visitor_admin_login", { p_pin: document.getElementById("admin-pin-input").value });
      localStorage.setItem(adminSessionKey, result.sessionToken);
      loginForm.reset();
      clearVisitorMessage("admin-login-message");
      await showAdminDashboard(result.adminName);
    } catch (error) {
      setVisitorMessage("admin-login-message", error.message, "error");
    } finally {
      button.disabled = false;
    }
  });
  document.getElementById("admin-refresh").addEventListener("click", function () {
    refreshAdminRequests().catch(function (error) { setVisitorMessage("admin-message", error.message, "error"); });
  });
  document.getElementById("admin-logout").addEventListener("click", function () {
    const token = localStorage.getItem(adminSessionKey);
    if (token) visitorRpc("logout_session", { p_session_token: token }).catch(function () {});
    localStorage.removeItem(adminSessionKey);
    if (adminRefreshTimer) clearInterval(adminRefreshTimer);
    adminRefreshTimer = null;
    dashboard.classList.add("hidden");
    document.getElementById("admin-login").classList.remove("hidden");
  });
  if (localStorage.getItem(adminSessionKey)) showAdminDashboard("");
}

initVisitorPage();
initAdminPage();

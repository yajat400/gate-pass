/* Campus Gate Pass shared-backend client.
   Database checks and status changes run in Supabase Postgres functions. */
const config = window.CAMPUS_BACKEND_CONFIG || {};
const studentSessionKey = "campusPassStudentSession";
const guardSessionKey = "campusPassGuardSession";
let selectedStudent = null;
let studentRefreshTimer = null;

const backendReady = Boolean(config.supabaseUrl && config.anonKey);

async function rpc(functionName, params = {}) {
  if (!backendReady) throw new Error("Shared backend is not configured yet. Open backend-config.js and follow BACKEND_SETUP.md.");
  const baseUrl = config.supabaseUrl.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(params)
  });
  let result;
  try { result = await response.json(); } catch { throw new Error(`Backend returned HTTP ${response.status}.`); }
  if (!response.ok) throw new Error(result.message || result.error || `Backend returned HTTP ${response.status}.`);
  if (result && result.ok === false) throw new Error(result.error || "Request could not be completed.");
  return result;
}

function message(id, value, type = "info") {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = value;
  node.className = `message ${type}`;
}

function clearMessage(id) {
  const node = document.getElementById(id);
  if (node) node.className = "message hidden";
}

function showStudentPass(student) {
  document.getElementById("student-login")?.classList.add("hidden");
  document.getElementById("student-register")?.classList.add("hidden");
  document.getElementById("student-pass")?.classList.remove("hidden");
  document.getElementById("student-name").textContent = student.name;
  document.getElementById("student-roll-display").textContent = student.roll;
  document.getElementById("student-status").textContent = student.status;
  const guardLink = new URL("guard.html", window.location.href);
  guardLink.searchParams.set("scan", student.qrToken);
  const qrTarget = document.getElementById("student-qr");
  qrTarget.innerHTML = "";
  if (window.QRCode) new QRCode(qrTarget, { text: guardLink.href, width: 148, height: 148, colorDark: "#1d3551", colorLight: "#ffffff" });
  else message("student-message", "QR library did not load. Check your internet connection and reload.", "error");
}

function startStudentSession(result) {
  localStorage.setItem(studentSessionKey, result.sessionToken);
  clearMessage("student-message");
  clearMessage("register-message");
  showStudentPass(result.student);
  if (studentRefreshTimer) clearInterval(studentRefreshTimer);
  studentRefreshTimer = setInterval(refreshStudentStatus, 3000);
}

async function refreshStudentStatus() {
  const sessionToken = localStorage.getItem(studentSessionKey);
  if (!sessionToken || !document.getElementById("student-pass")) return;
  try {
    const result = await rpc("student_me", { p_session_token: sessionToken });
    document.getElementById("student-status").textContent = result.student.status;
  } catch (error) {
    localStorage.removeItem(studentSessionKey);
    if (studentRefreshTimer) clearInterval(studentRefreshTimer);
    document.getElementById("student-pass").classList.add("hidden");
    document.getElementById("student-login").classList.remove("hidden");
    message("student-message", error.message, "error");
  }
}

function initStudentPage() {
  const form = document.getElementById("student-login-form");
  const registerForm = document.getElementById("student-register-form");
  if (!form) return;
  if (!backendReady) message("student-message", "Shared backend setup is needed. Follow BACKEND_SETUP.md before using this portal.", "error");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const result = await rpc("student_login", {
        p_roll: document.getElementById("student-roll").value.trim(),
        p_pass_code: document.getElementById("student-code").value.trim()
      });
      startStudentSession(result);
    } catch (error) {
      message("student-message", error.message, "error");
    } finally { button.disabled = false; }
  });

  document.getElementById("show-register")?.addEventListener("click", () => {
    document.getElementById("student-login").classList.add("hidden");
    document.getElementById("student-register").classList.remove("hidden");
    clearMessage("register-message");
  });

  document.getElementById("show-login")?.addEventListener("click", () => {
    document.getElementById("student-register").classList.add("hidden");
    document.getElementById("student-login").classList.remove("hidden");
    clearMessage("student-message");
  });

  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const passCode = document.getElementById("student-code-new").value;
    const confirmation = document.getElementById("student-code-confirm").value;
    if (passCode !== confirmation) {
      message("register-message", "The pass codes do not match. Please enter them again.", "error");
      return;
    }
    const button = registerForm.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const result = await rpc("student_register", {
        p_name: document.getElementById("student-name-input").value.trim(),
        p_roll: document.getElementById("student-roll-new").value.trim(),
        p_pass_code: passCode
      });
      startStudentSession(result);
    } catch (error) {
      message("register-message", error.message, "error");
    } finally { button.disabled = false; }
  });

  document.getElementById("student-logout").addEventListener("click", async () => {
    const token = localStorage.getItem(studentSessionKey);
    if (token) rpc("logout_session", { p_session_token: token }).catch(() => {});
    localStorage.removeItem(studentSessionKey);
    if (studentRefreshTimer) clearInterval(studentRefreshTimer);
    document.getElementById("student-pass").classList.add("hidden");
    document.getElementById("student-register")?.classList.add("hidden");
    document.getElementById("student-login").classList.remove("hidden");
    form.reset();
    registerForm?.reset();
  });

  const existingSession = localStorage.getItem(studentSessionKey);
  if (existingSession) {
    rpc("student_me", { p_session_token: existingSession })
      .then((result) => {
        showStudentPass(result.student);
        studentRefreshTimer = setInterval(refreshStudentStatus, 3000);
      })
      .catch(() => localStorage.removeItem(studentSessionKey));
  }
}

function qrTokenFrom(raw) {
  const value = raw.trim();
  try {
    const url = new URL(value);
    return url.searchParams.get("scan") || value;
  } catch {
    const match = value.match(/[?&]scan=([^&#]+)/);
    return match ? decodeURIComponent(match[1]) : value;
  }
}

async function lookupStudent(rawValue) {
  const guardToken = localStorage.getItem(guardSessionKey);
  const result = await rpc("guard_lookup", {
    p_session_token: guardToken,
    p_qr_token: qrTokenFrom(rawValue)
  });
  selectedStudent = result.student;
  document.getElementById("result-name").textContent = selectedStudent.name;
  document.getElementById("result-roll").textContent = selectedStudent.roll;
  document.getElementById("result-status").textContent = selectedStudent.status;
  document.getElementById("movement").value = "";
  document.getElementById("id-check").checked = false;
  document.getElementById("student-result").classList.remove("hidden");
  clearMessage("scan-message");
}

async function refreshHistory() {
  const target = document.getElementById("scan-history");
  if (!target) return;
  const result = await rpc("guard_history", { p_session_token: localStorage.getItem(guardSessionKey) });
  target.replaceChildren();
  if (!result.scans.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No scans recorded yet.";
    target.append(empty);
    return;
  }
  const list = document.createElement("ul");
  list.className = "history-list";
  result.scans.forEach((scan) => {
    const row = document.createElement("li");
    const details = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = scan.name;
    const sub = document.createElement("small");
    sub.textContent = `${scan.roll} · ${new Date(scan.scannedAt).toLocaleString()}`;
    const movement = document.createElement("b");
    movement.textContent = scan.movement;
    details.append(name, sub);
    row.append(details, movement);
    list.append(row);
  });
  target.append(list);
}

function initGuardPage() {
  const form = document.getElementById("guard-login-form");
  if (!form) return;
  if (!backendReady) message("guard-message", "Shared backend setup is needed. Follow BACKEND_SETUP.md before using this portal.", "error");

  const dashboard = async (pendingScan = "") => {
    document.getElementById("guard-login").classList.add("hidden");
    document.getElementById("guard-dashboard").classList.remove("hidden");
    await refreshHistory();
    if (pendingScan) {
      document.getElementById("qr-token").value = pendingScan;
      await lookupStudent(pendingScan);
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const result = await rpc("guard_login", { p_pin: document.getElementById("guard-pin").value.trim() });
      localStorage.setItem(guardSessionKey, result.sessionToken);
      clearMessage("guard-message");
      await dashboard(new URLSearchParams(window.location.search).get("scan") || "");
    } catch (error) {
      message("guard-message", error.message, "error");
    } finally { button.disabled = false; }
  });

  const existingSession = localStorage.getItem(guardSessionKey);
  if (existingSession) {
    dashboard(new URLSearchParams(window.location.search).get("scan") || "").catch((error) => {
      localStorage.removeItem(guardSessionKey);
      document.getElementById("guard-dashboard").classList.add("hidden");
      document.getElementById("guard-login").classList.remove("hidden");
      message("guard-message", error.message, "error");
    });
  }

  document.getElementById("guard-logout").addEventListener("click", async () => {
    const token = localStorage.getItem(guardSessionKey);
    if (token) rpc("logout_session", { p_session_token: token }).catch(() => {});
    localStorage.removeItem(guardSessionKey);
    selectedStudent = null;
    document.getElementById("guard-dashboard").classList.add("hidden");
    document.getElementById("guard-login").classList.remove("hidden");
    form.reset();
  });

  document.getElementById("scan-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try { await lookupStudent(document.getElementById("qr-token").value); }
    catch (error) { document.getElementById("student-result").classList.add("hidden"); message("scan-message", error.message, "error"); }
  });

  document.getElementById("confirm-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedStudent) return;
    const button = event.currentTarget.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const result = await rpc("guard_record_scan", {
        p_session_token: localStorage.getItem(guardSessionKey),
        p_qr_token: selectedStudent.qrToken,
        p_movement: document.getElementById("movement").value,
        p_id_checked: document.getElementById("id-check").checked
      });
      selectedStudent.status = result.student.status;
      document.getElementById("result-status").textContent = result.student.status;
      message("scan-message", `${result.student.name}: ${result.movement} recorded. Status is now ${result.student.status}.`, "success");
      await refreshHistory();
    } catch (error) { message("scan-message", error.message, "error"); }
    finally { button.disabled = false; }
  });

}

initStudentPage();
initGuardPage();

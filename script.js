// ===================== BACKEND CONFIG =====================
const BASE_URL = "http://localhost:3000"; // your backend

// ---------------- TOKEN HELPERS ----------------
function saveToken(token) {
  localStorage.setItem("token", token);
}
function getToken() {
  return localStorage.getItem("token");
}

// ===================== AUTH FUNCTIONS =====================

// REGISTER
async function registerUser(name, email, password) {
  if (!name || !email || !password) {
    alert("⚠️ Please fill all fields!");
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    if (res.ok) {
      alert("✅ Registration successful!");
      console.log("User registered:", data);
    } else {
      alert(`❌ ${data.error || "Registration failed"}`);
    }
  } catch (err) {
    console.error("Register error:", err);
    alert("❌ Registration failed (network/server issue).");
  }
}

// LOGIN
async function loginUser(email, password) {
  if (!email || !password) {
    alert("⚠️ Enter both email and password!");
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      saveToken(data.token);
      alert("✅ Login successful!");
      await showDashboard();
      await loadSchedules();
      console.log("Logged in user:", data.user);
    } else {
      alert(`❌ ${data.error || "Login failed"}`);
    }
  } catch (err) {
    console.error("Login error:", err);
    alert("❌ Login failed (network/server issue).");
  }
}

// LOGOUT
function logout() {
  localStorage.removeItem("token");
  alert("You have logged out!");
  showAuth();
}

// ===================== DASHBOARD / AUTH UI =====================

async function showDashboard() {
  document.getElementById("auth-section").style.display = "none";
  document.getElementById("dashboard-section").style.display = "block";
  initializeScheduler();
  await loadSchedules();
}

function showAuth() {
  document.getElementById("auth-section").style.display = "block";
  document.getElementById("dashboard-section").style.display = "none";
}

window.addEventListener("DOMContentLoaded", () => {
  const token = getToken();
  if (token) showDashboard();
  else showAuth();
});

// ===================== SCHEDULER (MAIN DASHBOARD) =====================

function initializeScheduler() {
  const form = document.getElementById("scheduleForm");
  const nameEl = document.getElementById("name");
  const doseEl = document.getElementById("dose");
  const timeEl = document.getElementById("time");
  const freqEl = document.getElementById("freq");
  const customDaysWrap = document.getElementById("customDaysWrap");
  const notifyTest = document.getElementById("notifyTest");

  freqEl.addEventListener("change", () => {
    customDaysWrap.classList.toggle("hidden", freqEl.value !== "custom");
  });

  // SAVE NEW SCHEDULE
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return alert("Please login first!");

    const name = nameEl.value.trim();
    const dosage = doseEl.value.trim();
    const time = timeEl.value;
    const frequency = freqEl.value;
    const duration = "N/A";

    if (!name || !time) return alert("Please provide name and time!");

    try {
      const res = await fetch(`${BASE_URL}/api/schedules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, dosage, time, frequency, duration }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("✅ Schedule saved!");
        form.reset();
        await loadSchedules();
      } else {
        alert(`❌ ${data.error || "Failed to save schedule"}`);
      }
    } catch (err) {
      console.error("Schedule save error:", err);
      alert("❌ Server error while saving schedule!");
    }
  });

  // TEST NOTIFICATION
  notifyTest.addEventListener("click", async () => {
    const ok = await askNotificationPermission();
    if (ok) {
      new Notification("💊 Sehat Pulse", {
        body: "This is a test reminder!",
        icon: "https://cdn-icons-png.flaticon.com/512/2966/2966484.png",
      });
    } else {
      alert("⚠️ Please allow notifications in your browser settings.");
    }
  });

  askNotificationPermission();
}

// ===================== FETCH & RENDER USER SCHEDULES =====================

async function loadSchedules() {
  const token = getToken();
  if (!token) return;

  const listEl = document.getElementById("list");

  try {
    const res = await fetch(`${BASE_URL}/api/schedules`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    window.reminders = data; // 👈 used by notification logic

    listEl.innerHTML = "";

    if (data.length === 0) {
      listEl.innerHTML = "<div class='muted-2 tiny'>No schedules yet.</div>";
      return;
    }

    // 🗑️ Delete All Button
    const delAllBtn = document.createElement("button");
    delAllBtn.textContent = "🗑️ Delete All Schedules";
    delAllBtn.className = "delete-all-btn";
    delAllBtn.onclick = deleteAllSchedules;
    listEl.appendChild(delAllBtn);

    // Render schedules with delete button
    data.forEach((r) => {
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `
        <div class="pill">
          <strong>${r.name}</strong>
          <div class="muted-2 tiny">${r.dosage || ""}</div>
        </div>
        <div class="meta">
          <div class="tag">${r.time}</div>
          <div class="muted-2 tiny">${r.frequency}</div>
          <button class="delete-btn" onclick="deleteSchedule('${r._id}')">🗑️</button>
        </div>
      `;
      listEl.appendChild(item);
    });
  } catch (err) {
    console.error("Fetch schedules error:", err);
  }
}

// ===================== DELETE FUNCTIONS =====================

async function deleteSchedule(id) {
  const token = getToken();
  if (!token) return alert("Please login first!");
  if (!confirm("Delete this schedule?")) return;

  try {
    const res = await fetch(`${BASE_URL}/api/schedules/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      alert("🗑️ Schedule deleted!");
      await loadSchedules();
    } else {
      alert("❌ Failed to delete schedule!");
    }
  } catch (err) {
    console.error("Delete schedule error:", err);
  }
}

async function deleteAllSchedules() {
  const token = getToken();
  if (!token) return alert("Please login first!");
  if (!confirm("⚠️ Delete ALL schedules?")) return;

  try {
    const res = await fetch(`${BASE_URL}/api/schedules/deleteAll`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      alert("🗑️ All schedules deleted!");
      await loadSchedules();
    } else {
      alert("❌ Failed to delete all schedules!");
    }
  } catch (err) {
    console.error("Delete all error:", err);
  }
}

// ===================== NOTIFICATION LOGIC =====================

async function askNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function sendNotification(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  new Notification(title, {
    body,
    icon: "https://cdn-icons-png.flaticon.com/512/2966/2966484.png",
  });
}

let notifiedToday = new Set();
const todayDate = () => new Date().toDateString();

setInterval(() => {
  if (!window.reminders || window.reminders.length === 0) return;

  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  const today = todayDate();

  window.reminders.forEach((r) => {
    const reminderKey = `${r._id || r.name}-${today}`;
    if (notifiedToday.has(reminderKey)) return;

    if (r.time === currentTime) {
      alert(`💊 Medicine Reminder\n${r.name} ${r.dosage ? "(" + r.dosage + ")" : ""}`);
      sendNotification(
        "💊 Medicine Reminder",
        `${r.name} ${r.dosage ? "(" + r.dosage + ")" : ""}`
      );
      notifiedToday.add(reminderKey);
    }
  });

  if (now.getHours() === 0 && now.getMinutes() === 0) {
    notifiedToday.clear();
  }
}, 30000);

// ===== SIDEBAR LOGIC =====
const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const closeSidebar = document.getElementById("closeSidebar");

menuBtn.addEventListener("click", () => {
  sidebar.classList.add("open");
});

closeSidebar.addEventListener("click", () => {
  sidebar.classList.remove("open");
});

// Optional: Close sidebar when clicking outside
window.addEventListener("click", (e) => {
  if (sidebar.classList.contains("open") && !sidebar.contains(e.target) && e.target !== menuBtn) {
    sidebar.classList.remove("open");
  }
});

// ===== NAVIGATION HANDLERS =====
const navDashboard = document.getElementById("navDashboard");
const navHistory = document.getElementById("navHistory");

navDashboard.addEventListener("click", (e) => {
  e.preventDefault();
  showView("dashboardView");
  loadDashboardStats();
});

navHistory.addEventListener("click", (e) => {
  e.preventDefault();
  showView("historyView");
  loadMedicineHistory();
  sidebar.classList.remove("open");
});

function showView(viewId) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(viewId).classList.add("active");
}

async function loadDashboardStats() {
  const token = getToken();
  if (!token) return;

  try {
    const [schedulesRes, logsRes] = await Promise.all([
      fetch(`${BASE_URL}/api/schedules`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${BASE_URL}/api/logs/history`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    const schedules = await schedulesRes.json();
    const logs = await logsRes.json();

    // Calculate percentage
    const total = schedules.length;
    const taken = logs.filter(l => l.status === "taken").length;
    const percent = total > 0 ? Math.min(100, Math.round((taken / total) * 100)) : 0;

    // Render stats
    document.getElementById("userStats").innerHTML = `
      <p><strong>Total Medicines:</strong> ${total}</p>
      <p><strong>Success Rate:</strong> ${percent}%</p>
    `;

    // Render current medicines
    const meds = schedules.map(s => `<li>${s.name} (${s.dosage || ""}) - ${s.time}</li>`).join("");
    document.getElementById("currentMeds").innerHTML = `
      <h4>Current Medicines</h4>
      <ul>${meds || "<i>No active medicines</i>"}</ul>
    `;
  } catch (err) {
    console.error("Dashboard load error:", err);
  }
}

async function loadMedicineHistory() {
  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`${BASE_URL}/api/logs/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    const historyList = document.getElementById("historyList");

    if (data.length === 0) {
      historyList.innerHTML = "<p class='muted-2'>No history yet.</p>";
      return;
    }

    historyList.innerHTML = data
      .map(
        (l) => `
        <div class="history-item">
          <strong>${l.scheduleRef}</strong> - ${l.status}
          <div class="tiny muted-2">${new Date(l.timestamp).toLocaleString()}</div>
        </div>`
      )
      .join("");
  } catch (err) {
    console.error("History fetch error:", err);
  }
}
async function loadDashboardStats() {
  const token = getToken();
  if (!token) return;

  try {
    const [sRes, lRes] = await Promise.all([
      fetch(`${BASE_URL}/api/schedules`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${BASE_URL}/api/logs/history`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    const schedules = await sRes.json();
    const logs = await lRes.json();

    const total = schedules.length;
    const taken = logs.filter(l => l.status === "taken").length;
    const percent = total > 0 ? Math.min(100, Math.round((taken / total) * 100)) : 0;

    document.getElementById("userStats").innerHTML = `
      <p style="color:white;"><strong>Total Medicines:</strong> ${total}</p>
      <p style="color:white;"><strong>Success Rate:</strong> ${percent}%</p>
    `;

    const meds = schedules.map(s => `<li style="color:white;">${s.name} (${s.dosage || ""}) - ${s.time}</li>`).join("");
    document.getElementById("currentMeds").innerHTML =
      `<h4 style="color:white;">Current Medicines</h4><ul style="color:white;">${meds || "<i>No medicines</i>"}</ul>`;
  } catch (err) {
    console.error("Dashboard error:", err);
  }
}

async function loadMedicineHistory() {
  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`${BASE_URL}/api/logs/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const list = document.getElementById("historyList");

    if (data.length === 0) {
      list.innerHTML = "<p >No history yet.</p>";
      return;
    }

    list.innerHTML = data
      .map(
        l => `<div style="color:white;"><strong>${l.scheduleRef}</strong> (${l.status})<br><small>${new Date(
          l.timestamp
        ).toLocaleString()}</small></div><hr>`
      )
      .join("");
  } catch (err) {
    console.error("History error:", err);
  }
}





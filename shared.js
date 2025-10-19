// ===================== GLOBAL CONFIG =====================
const BASE_URL = "http://localhost:3000"; // Backend URL

// ---------------- TOKEN HELPERS ----------------
function saveToken(token) {
  localStorage.setItem("token", token);
}
function getToken() {
  return localStorage.getItem("token");
}
function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html"; // back to login
}

// ---------------- SIDEBAR (COMMON) ----------------
document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const menuBtn = document.getElementById("menuBtn");
  const closeBtn = document.getElementById("closeSidebar");
  const logoutBtn = document.getElementById("logoutBtn");

  if (menuBtn) menuBtn.addEventListener("click", () => sidebar.classList.add("open"));
  if (closeBtn) closeBtn.addEventListener("click", () => sidebar.classList.remove("open"));
  if (logoutBtn) logoutBtn.addEventListener("click", logout);
});

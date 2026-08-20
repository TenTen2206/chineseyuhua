import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

const cfg = window.YUHUA_FIREBASE_CONFIG || {};
const configReady = cfg.apiKey && !String(cfg.apiKey).startsWith("PASTE_");

let app = null;
let auth = null;
let db = null;

window.YUHUA_AUTH = {
  ready: false,
  user: null,
  profile: null,
  isTeacher: false,
  isActive: false
};

function el(id){ return document.getElementById(id); }

function humanAuthError(error) {
  const code = error?.code || "";
  const map = {
    "auth/email-already-in-use": "Email này đã được đăng ký.",
    "auth/invalid-email": "Địa chỉ email không hợp lệ.",
    "auth/weak-password": "Mật khẩu quá yếu. Hãy dùng ít nhất 6 ký tự.",
    "auth/invalid-credential": "Email hoặc mật khẩu không chính xác.",
    "auth/user-disabled": "Tài khoản này đã bị vô hiệu hóa.",
    "auth/too-many-requests": "Có quá nhiều lần thử. Vui lòng thử lại sau."
  };
  return map[code] || error?.message || "Đã xảy ra lỗi.";
}

function setAuthMessage(message, isError=false) {
  const box = el("authMessage");
  if (!box) return;
  box.textContent = message || "";
  box.className = "auth-message" + (isError ? " error" : "");
}

function openAuthModal(mode="login") {
  const modal = el("authModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  setAuthTab(mode);
}
function closeAuthModal() {
  el("authModal")?.classList.add("hidden");
  setAuthMessage("");
}
function setAuthTab(mode) {
  const login = mode === "login";
  el("loginTab")?.classList.toggle("active", login);
  el("registerTab")?.classList.toggle("active", !login);
  el("loginForm")?.classList.toggle("hidden", !login);
  el("registerForm")?.classList.toggle("hidden", login);
  setAuthMessage("");
}

window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.setAuthTab = setAuthTab;

function updateAuthUI() {
  const state = window.YUHUA_AUTH;
  const signedIn = !!state.user;
  const name = state.profile?.name || state.user?.displayName || state.user?.email || "Học sinh";

  el("guestActions")?.classList.toggle("hidden", signedIn);
  el("userActions")?.classList.toggle("hidden", !signedIn);

  if (el("currentUserName")) el("currentUserName").textContent = name;
  if (el("currentUserRole")) {
    el("currentUserRole").textContent =
      state.isTeacher ? "Giáo viên" : (signedIn ? "Học sinh" : "");
  }

  el("teacherDashboardBtn")?.classList.toggle("hidden", !state.isTeacher);

  document.body.classList.toggle("is-authenticated", signedIn);
  document.body.classList.toggle("is-teacher", state.isTeacher);

  if (signedIn && state.profile?.status === "blocked") {
    el("accountBlockedBanner")?.classList.remove("hidden");
  } else {
    el("accountBlockedBanner")?.classList.add("hidden");
  }
}

async function loadProfile(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const profile = {
      uid: user.uid,
      email: user.email || "",
      name: user.displayName || "Học sinh",
      role: "student",
      status: "active",
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      lastLesson: null,
      lastModule: null
    };
    await setDoc(ref, profile);
    return { ...profile, createdAt: null, lastLoginAt: null };
  }

  await updateDoc(ref, { lastLoginAt: serverTimestamp() });
  return snap.data();
}

async function handleAuthState(user) {
  window.YUHUA_AUTH.ready = true;
  window.YUHUA_AUTH.user = user;
  window.YUHUA_AUTH.profile = null;
  window.YUHUA_AUTH.isTeacher = false;
  window.YUHUA_AUTH.isActive = false;

  if (user) {
    try {
      const profile = await loadProfile(user);
      window.YUHUA_AUTH.profile = profile;
      window.YUHUA_AUTH.isTeacher = profile?.role === "teacher";
      window.YUHUA_AUTH.isActive = profile?.status !== "blocked";
    } catch (e) {
      console.error("Profile load failed", e);
    }
  }
  updateAuthUI();
}

if (configReady) {
  app = initializeApp(cfg);
  auth = getAuth(app);
  db = getFirestore(app);

  onAuthStateChanged(auth, handleAuthState);
} else {
  window.YUHUA_AUTH.ready = true;
  console.warn("Firebase config has not been configured yet.");
  updateAuthUI();
}

// Login
el("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!configReady) return setAuthMessage("Chưa cấu hình Firebase.", true);

  const email = el("loginEmail").value.trim();
  const password = el("loginPassword").value;

  try {
    setAuthMessage("Đang đăng nhập...");
    await signInWithEmailAndPassword(auth, email, password);
    closeAuthModal();
  } catch (error) {
    setAuthMessage(humanAuthError(error), true);
  }
});

// Register
el("registerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!configReady) return setAuthMessage("Chưa cấu hình Firebase.", true);

  const name = el("registerName").value.trim();
  const email = el("registerEmail").value.trim();
  const password = el("registerPassword").value;
  const confirm = el("registerConfirm").value;

  if (name.length < 2) return setAuthMessage("Vui lòng nhập họ tên.", true);
  if (password !== confirm) return setAuthMessage("Mật khẩu xác nhận không khớp.", true);

  try {
    setAuthMessage("Đang tạo tài khoản...");
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });

    await setDoc(doc(db, "users", credential.user.uid), {
      uid: credential.user.uid,
      email,
      name,
      role: "student",
      status: "active",
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      lastLesson: null,
      lastModule: null
    });

    closeAuthModal();
  } catch (error) {
    setAuthMessage(humanAuthError(error), true);
  }
});

el("logoutBtn")?.addEventListener("click", async () => {
  if (auth) await signOut(auth);
});

el("authModal")?.addEventListener("click", (e) => {
  if (e.target?.id === "authModal") closeAuthModal();
});

// Require authentication before opening a lesson.
window.yuhuaRequireLogin = function() {
  if (!configReady) {
    openAuthModal("login");
    setAuthMessage("Website chưa cấu hình Firebase.", true);
    return false;
  }
  if (!window.YUHUA_AUTH.user) {
    openAuthModal("login");
    setAuthMessage("Vui lòng đăng nhập để vào bài học.");
    return false;
  }
  if (window.YUHUA_AUTH.profile?.status === "blocked") {
    alert("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ giáo viên.");
    return false;
  }
  return true;
};

// Save coarse learning activity for teacher monitoring.
window.yuhuaTrackActivity = async function(lesson, moduleName) {
  if (!db || !window.YUHUA_AUTH.user || !window.YUHUA_AUTH.isActive) return;
  const uid = window.YUHUA_AUTH.user.uid;
  try {
    await updateDoc(doc(db, "users", uid), {
      lastLesson: Number(lesson) || null,
      lastModule: String(moduleName || ""),
      lastSeenAt: serverTimestamp()
    });

    await addDoc(collection(db, "users", uid, "activity"), {
      lesson: Number(lesson) || null,
      module: String(moduleName || ""),
      at: serverTimestamp()
    });
  } catch (e) {
    console.warn("Activity tracking failed", e);
  }
};

// Teacher dashboard
window.openTeacherDashboard = async function() {
  if (!window.YUHUA_AUTH.isTeacher || !db) return;
  const panel = el("teacherDashboard");
  panel?.classList.remove("hidden");
  const body = el("teacherUsersBody");
  if (body) body.innerHTML = '<tr><td colspan="6">Đang tải...</td></tr>';

  try {
    const snap = await getDocs(collection(db, "users"));
    const users = [];
    snap.forEach(d => users.push({ id: d.id, ...d.data() }));
    users.sort((a,b) => String(a.name||a.email).localeCompare(String(b.name||b.email)));

    body.innerHTML = users.map(u => `
      <tr>
        <td>${escapeTeacher(u.name || "")}</td>
        <td>${escapeTeacher(u.email || "")}</td>
        <td>${escapeTeacher(u.role || "student")}</td>
        <td>${escapeTeacher(u.status || "active")}</td>
        <td>${u.lastLesson ? "Bài " + Number(u.lastLesson) : "—"}${u.lastModule ? " / " + escapeTeacher(u.lastModule) : ""}</td>
        <td>
          ${u.role !== "teacher" ? `
            <button class="mini-btn" onclick="teacherToggleStatus('${u.id}','${u.status === "blocked" ? "active" : "blocked"}')">
              ${u.status === "blocked" ? "Mở khóa" : "Khóa"}
            </button>` : "—"}
        </td>
      </tr>
    `).join("") || '<tr><td colspan="6">Chưa có tài khoản.</td></tr>';
  } catch (e) {
    body.innerHTML = `<tr><td colspan="6">Không thể tải danh sách: ${escapeTeacher(e.message)}</td></tr>`;
  }
};

window.closeTeacherDashboard = function() {
  el("teacherDashboard")?.classList.add("hidden");
};

window.teacherToggleStatus = async function(uid, nextStatus) {
  if (!window.YUHUA_AUTH.isTeacher || !db) return;
  try {
    await updateDoc(doc(db, "users", uid), { status: nextStatus });
    await window.openTeacherDashboard();
  } catch (e) {
    alert("Không thể cập nhật tài khoản: " + e.message);
  }
};

function escapeTeacher(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

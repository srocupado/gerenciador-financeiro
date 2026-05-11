// ===== Firebase cloud sync (compat SDK, sem ES modules) =====
// Carrega só se o usuário escolher modo "cloud" em Configurações.
// API exposta:
//   cloud.init()              → inicializa Firebase (idempotente)
//   cloud.signIn() / signOut()
//   cloud.onAuth(cb)          → cb(user|null)
//   cloud.load()              → Promise<state|null>
//   cloud.save(state)         → Promise (debounced)
//   cloud.subscribe(cb)       → cb(state) em tempo real; retorna unsubscribe
//   cloud.getStorageMode() / setStorageMode("local" | "cloud")

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB1a5ZSy3_qID_jBH2OZPebnJ41a6uKVws",
  authDomain: "gerenciador-financeiro-1d910.firebaseapp.com",
  projectId: "gerenciador-financeiro-1d910",
  storageBucket: "gerenciador-financeiro-1d910.firebasestorage.app",
  messagingSenderId: "42759099522",
  appId: "1:42759099522:web:7f4bcfbd512cdee88a509b",
};

const MODE_KEY = "gerenciador_financeiro_storage_mode";

let _app = null, _auth = null, _db = null, _initialized = false;
let _saveTimer = null;
let _unsubSnapshot = null;

function init() {
  if (_initialized) return;
  if (!window.firebase) {
    console.warn("Firebase SDK não carregou — verifique os <script> no HTML.");
    return;
  }
  _app = firebase.initializeApp(FIREBASE_CONFIG);
  _auth = firebase.auth();
  _db = firebase.firestore();
  _initialized = true;
}

function getStorageMode() {
  return localStorage.getItem(MODE_KEY) || "local";
}
function setStorageMode(mode) {
  localStorage.setItem(MODE_KEY, mode);
}

async function signIn() {
  init();
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await _auth.signInWithPopup(provider);
    return result.user;
  } catch (e) {
    console.error("Falha no login:", e);
    alert("Não foi possível entrar: " + (e.message || e.code));
    return null;
  }
}

async function signOut() {
  init();
  if (_unsubSnapshot) { _unsubSnapshot(); _unsubSnapshot = null; }
  await _auth.signOut();
}

function onAuth(cb) {
  init();
  return _auth.onAuthStateChanged(cb);
}

function getUser() {
  init();
  return _auth?.currentUser || null;
}

function docRef() {
  const user = getUser();
  if (!user) return null;
  return _db.collection("users").doc(user.uid);
}

async function load() {
  const ref = docRef();
  if (!ref) return null;
  try {
    const snap = await ref.get();
    if (!snap.exists) return null;
    const data = snap.data();
    return data?.state || null;
  } catch (e) {
    console.warn("Falha ao ler do Firestore:", e);
    return null;
  }
}

// Debounced save — evita escrever a cada tecla digitada
function save(state) {
  const ref = docRef();
  if (!ref) return Promise.resolve();
  if (_saveTimer) clearTimeout(_saveTimer);
  return new Promise((resolve) => {
    _saveTimer = setTimeout(async () => {
      try {
        await ref.set({ state, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        resolve();
      } catch (e) {
        console.warn("Falha ao salvar no Firestore:", e);
        resolve();
      }
    }, 800);
  });
}

// Listener em tempo real — chama cb sempre que outro dispositivo gravar
function subscribe(cb) {
  const ref = docRef();
  if (!ref) return () => {};
  if (_unsubSnapshot) _unsubSnapshot();
  _unsubSnapshot = ref.onSnapshot((snap) => {
    if (snap.metadata.hasPendingWrites) return; // ignora ecos do próprio save
    const data = snap.data();
    if (data?.state) cb(data.state);
  }, (err) => console.warn("Snapshot error:", err));
  return _unsubSnapshot;
}

window.cloud = {
  init, signIn, signOut, onAuth, getUser,
  load, save, subscribe,
  getStorageMode, setStorageMode,
};

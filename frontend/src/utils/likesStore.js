// src/utils/likesStore.js

const KEY = 'pcsc_likes';

// --- helpers de storage seguros (SSG/SSR e quota) ---
function canUseStorage() {
  try {
    return typeof window !== 'undefined' && 'localStorage' in window;
  } catch {
    return false;
  }
}

function readRaw() {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeRaw(obj) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(obj));
  } catch {
    // storage cheio/bloqueado — ignorar silenciosamente
  }
}

// Normaliza o formato salvo.
// v1: ["12","25"] (array ou Set serializado)
// v2: { "12": { liked: true, at: 1710000000000 }, ... }
function readMap() {
  const raw = readRaw();

  // já no formato v2
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw;
  }

  // v1 -> migrar para v2
  if (Array.isArray(raw)) {
    const map = {};
    for (const id of raw) {
      map[String(id)] = { liked: true, at: Date.now() };
    }
    writeRaw(map);
    return map;
  }

  // nada salvo ainda
  return {};
}

function writeMap(map) {
  writeRaw(map);
}

// --- API pública ---

export function hasLikedPrompt(promptId) {
  const id = String(promptId);
  const map = readMap();
  const rec = map[id];
  return !!(rec && rec.liked);
}

export function markLikedPrompt(promptId) {
  const id = String(promptId);
  const map = readMap();
  map[id] = { liked: true, at: Date.now() };
  writeMap(map);
}

export function unmarkLikedPrompt(promptId) {
  const id = String(promptId);
  const map = readMap();
  if (id in map) {
    delete map[id];
    writeMap(map);
  }
}

// Quantos likes somar localmente ao contador do servidor.
// Hoje: 1 se já curtiu neste navegador; 0 caso contrário.
export function getLocalLikeDelta(promptId) {
  return hasLikedPrompt(promptId) ? 1 : 0;
}

// Injeta `isLiked` para controle de UI (não altera contador).
export function mergeIsLikedInList(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr.map((p) => {
    const liked = hasLikedPrompt(p?.id);
    return { ...p, isLiked: liked ? true : !!p?.isLiked };
  });
}

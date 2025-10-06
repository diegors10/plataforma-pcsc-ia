// src/utils/postLikesStore.js

/**
 * Armazenamento local para curtidas de posts em discussões.
 * Permite que usuários não autenticados curtam posts de forma local.
 */

const KEY = 'pcsc_post_likes';

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
    // quota excedida ou bloqueado
  }
}

function readMap() {
  const raw = readRaw();
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  return {};
}

function writeMap(map) {
  writeRaw(map);
}

export function hasLikedPost(postId) {
  const id = String(postId);
  const map = readMap();
  const rec = map[id];
  return !!(rec && rec.liked);
}

export function markLikedPost(postId) {
  const id = String(postId);
  const map = readMap();
  map[id] = { liked: true, at: Date.now() };
  writeMap(map);
}

export function unmarkLikedPost(postId) {
  const id = String(postId);
  const map = readMap();
  if (id in map) {
    delete map[id];
    writeMap(map);
  }
}

export function getLocalLikeDelta(postId) {
  return hasLikedPost(postId) ? 1 : 0;
}

export function mergeIsLikedInPostList(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr.map((p) => {
    const delta = getLocalLikeDelta(p?.id);
    const liked = hasLikedPost(p?.id);
    return {
      ...p,
      likes: (Number(p?.likes) || 0) + delta,
      isLiked: liked || !!p?.isLiked,
    };
  });
}
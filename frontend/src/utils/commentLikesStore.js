// src/utils/commentLikesStore.js

/**
 * Um armazenamento simples em localStorage para acompanhar curtidas de comentários
 * para usuários não autenticados. Usa o mesmo conceito de likesStore.js, mas
 * separado para evitar conflito de chaves e facilitar manutenção.
 */

const KEY = 'pcsc_comment_likes';

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
    // quota excedida ou bloqueado — ignorar
  }
}

function readMap() {
  const raw = readRaw();
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw;
  }
  // migrar formatos antigos ou inicializar vazio
  return {};
}

function writeMap(map) {
  writeRaw(map);
}

export function hasLikedComment(commentId) {
  const id = String(commentId);
  const map = readMap();
  const rec = map[id];
  return !!(rec && rec.liked);
}

export function markLikedComment(commentId) {
  const id = String(commentId);
  const map = readMap();
  map[id] = { liked: true, at: Date.now() };
  writeMap(map);
}

export function unmarkLikedComment(commentId) {
  const id = String(commentId);
  const map = readMap();
  if (id in map) {
    delete map[id];
    writeMap(map);
  }
}

export function getLocalLikeDelta(commentId) {
  return hasLikedComment(commentId) ? 1 : 0;
}

/**
 * Mescla informações de curtidas locais em uma lista de comentários.
 * Cada objeto da lista deve ter `id`, `likes` e `isLiked` definidos pelo backend.
 * Para cada comentário, somamos o delta local ao contador e ajustamos o `isLiked`.
 *
 * @param {Array<Object>} list Lista de comentários vinda do backend.
 * @returns {Array<Object>} Lista adaptada com likes e isLiked corrigidos para o cliente.
 */
export function mergeIsLikedInCommentList(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr.map((c) => {
    const delta = getLocalLikeDelta(c?.id);
    const liked = hasLikedComment(c?.id);
    return {
      ...c,
      likes: (Number(c?.likes) || 0) + delta,
      isLiked: liked || !!c?.isLiked,
    };
  });
}
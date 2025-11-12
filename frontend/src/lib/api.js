import axios from 'axios';

// -------- helpers de ambiente/armazenamento --------
const safeLocalStorage = (() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {}
  let store = {};
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
})();

const getToken = () => safeLocalStorage.getItem('token');

// -------- criação do axios (SEM IP em produção) --------
const isProd = import.meta.env.PROD === true;
let RESOLVED_API_BASE = '';

if (isProd) {
  // Em produção, trava no domínio HTTPS da API
  RESOLVED_API_BASE = 'https://plataforma-pcsc-api.iacop.com.br/api';
} else {
  // Em dev, usa env ou localhost
  const envUrl = import.meta?.env?.VITE_API_BASE_URL;
  RESOLVED_API_BASE = (envUrl && envUrl.replace(/\/$/, '')) || 'http://localhost:3001/api';
}

// Guarda-chuva extra: se a página está em HTTPS e o baseURL começa com http://, reescreve para HTTPS da API
if (typeof window !== 'undefined' && window.location.protocol === 'https:' && RESOLVED_API_BASE.startsWith('http://')) {
  console.warn('[api] Reescrevendo baseURL insegura para HTTPS do domínio');
  RESOLVED_API_BASE = 'https://plataforma-pcsc-api.iacop.com.br/api';
}

const api = axios.create({
  baseURL: RESOLVED_API_BASE,
  timeout: 20000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});





// -------- in-flight dedupe (evita spam em curto intervalo) --------
const DEDUPE_WINDOW_MS = 1500;
const inflight = new Map(); // key -> { ts, promise }

function stableStringify(obj) {
  if (!obj || typeof obj !== 'object') return JSON.stringify(obj);
  const keys = Object.keys(obj).sort();
  const sorted = {};
  for (const k of keys) sorted[k] = obj[k];
  return JSON.stringify(sorted);
}

function buildKeyFromArgs(method, args, baseURL) {
  const m = (method || 'get').toUpperCase();
  let url = '';
  let params = undefined;

  switch (m) {
    case 'GET':
    case 'DELETE': {
      url = args[0] || '';
      const config = args[1] || {};
      params = config.params || undefined;
      break;
    }
    case 'POST':
    case 'PUT':
    case 'PATCH': {
      url = args[0] || '';
      const config = args[2] || {};
      params = config.params || undefined;
      break;
    }
    default: {
      url = args[0] || '';
      break;
    }
  }

  const fullUrl = `${(baseURL || '').replace(/\/$/, '')}${url}`;
  return `${m} ${fullUrl} ${stableStringify(params)}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// -------- interceptors --------

// token
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  // contador de retries
  config.__retryCount = config.__retryCount || 0;
  return config;
});

// 401 (com opção de não redirecionar) + 429 backoff
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error || {};

    if (response?.status === 401) {
      if (config?.meta?.noRedirectOn401) return Promise.reject(error);
      // ✅ usar storage seguro (evita ReferenceError em ambientes sem window)
      safeLocalStorage.removeItem('token');
      if (typeof window !== 'undefined') window.location.href = '/login';
      return Promise.reject(error);
    }

    if (response?.status === 429 && config) {
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount >= 3) return Promise.reject(error);
      config.__retryCount += 1;

      const retryAfterHeader = response.headers?.['retry-after'];
      const retryAfterSec = retryAfterHeader ? Number(retryAfterHeader) : null;

      const base = 400 * Math.pow(2, config.__retryCount - 1);
      const jitter = Math.floor(Math.random() * 150);
      const delay = retryAfterSec ? retryAfterSec * 1000 : base + jitter;

      await new Promise((r) => setTimeout(r, delay));
      const nextConfig = { ...config, __noDedupe: true };
      return api(nextConfig);
    }

    // <- AQUI: melhora mensagem para sem response (timeout/CORS/servidor off)
    if (!response) {
      // preserva informações úteis
      if (error.code === 'ECONNABORTED') {
        error.message = 'Tempo de resposta excedido (timeout).';
      } else if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        error.message = 'Sem conexão com a internet.';
      } else {
        error.message = 'Falha de rede ou CORS bloqueado (backend indisponível).';
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

// -------- salva métodos originais para evitar recursão --------
const original = {
  get: api.get.bind(api),
  delete: api.delete.bind(api),
  post: api.post.bind(api),
  put: api.put.bind(api),
  patch: api.patch.bind(api),
};

// -------- wrappers com dedupe sem recursão --------
function withDedupe(methodName) {
  const originalMethod = original[methodName];

  return (...args) => {
    // tenta ler config para flag __noDedupe
    let cfg = {};
    if (['get', 'delete'].includes(methodName)) {
      cfg = args[1] || {};
    } else if (['post', 'put', 'patch'].includes(methodName)) {
      cfg = args[2] || {};
    }
    if (cfg?.__noDedupe) {
      return originalMethod(...args);
    }

    const key = buildKeyFromArgs(methodName, args, api.defaults.baseURL);
    const now = Date.now();

    // limpa entradas antigas
    for (const [k, v] of inflight.entries()) {
      if (now - v.ts > DEDUPE_WINDOW_MS) inflight.delete(k);
    }

    // já existe chamada idêntica recente?
    const existing = inflight.get(key);
    if (existing && now - existing.ts <= DEDUPE_WINDOW_MS) {
      return existing.promise;
    }

    // dispara chamada real e registra
    const promise = originalMethod(...args)
      .finally(() => {
        // remove do inflight um pouco depois para evitar disputa imediata
        setTimeout(() => inflight.delete(key), DEDUPE_WINDOW_MS);
      });

    inflight.set(key, { ts: now, promise });
    return promise;
  };
}

// aplica wrappers
api.get = withDedupe('get');
api.delete = withDedupe('delete');
api.post = withDedupe('post');
api.put = withDedupe('put');
api.patch = withDedupe('patch');

// ----------------- Serviços -----------------
export const promptsAPI = {
  // Inclui meta.noRedirectOn401 por padrão para evitar redirecionamentos indesejados
  getAll: (params = {}, axiosConfig = {}) =>
    api.get('/prompts', {
      params,
      ...axiosConfig,
      meta: { ...(axiosConfig.meta || {}), noRedirectOn401: true },
    }),
  getById: (id, axiosConfig = {}) =>
    api.get(`/prompts/${id}`, {
      ...axiosConfig,
      meta: { ...(axiosConfig.meta || {}), noRedirectOn401: true },
    }),
  create: (data, axiosConfig = {}) => api.post('/prompts', data, axiosConfig),
  update: (id, data, axiosConfig = {}) => api.put(`/prompts/${id}`, data, axiosConfig),
  delete: (id, axiosConfig = {}) => api.delete(`/prompts/${id}`, axiosConfig),

  // 👇 envia {} (corpo JSON) e não redireciona em 401
  like: (id, axiosConfig = {}) =>
    api.post(`/prompts/${id}/like`, {}, {
      ...axiosConfig,
      meta: { ...(axiosConfig.meta || {}), noRedirectOn401: true },
    }),

  getFeatured: (axiosConfig = {}) =>
    api.get('/prompts/featured', {
      ...axiosConfig,
      meta: { ...(axiosConfig.meta || {}), noRedirectOn401: true },
    }),
  getRelated: (id, axiosConfig = {}) =>
    api.get(`/prompts/${id}/related`, {
      ...axiosConfig,
      meta: { ...(axiosConfig.meta || {}), noRedirectOn401: true },
    }),
};

export const commentsAPI = {
  // Inclui meta.noRedirectOn401 por padrão para evitar redirecionamentos indesejados
  getByPrompt: (promptId, axiosConfig = {}) =>
    api.get(`/prompts/${promptId}/comments`, {
      ...axiosConfig,
      meta: { ...(axiosConfig.meta || {}), noRedirectOn401: true },
    }),

  // comentários não precisam de aprovação (ajuste solicitado)
  create: (promptId, data, axiosConfig = {}) =>
    api.post(`/prompts/${promptId}/comments`, data, axiosConfig),

  update: (id, data, axiosConfig = {}) => api.put(`/comments/${id}`, data, axiosConfig),
  delete: (id, axiosConfig = {}) => api.delete(`/comments/${id}`, axiosConfig),

  // 👇 idem
  like: (id, axiosConfig = {}) =>
    api.post(`/comments/${id}/like`, {}, {
      ...axiosConfig,
      meta: { ...(axiosConfig.meta || {}), noRedirectOn401: true },
    }),
};

export const discussionsAPI = {
  getAll: (params = {}, axiosConfig = {}) => api.get('/discussions', { params, ...axiosConfig }),
  getById: (id, axiosConfig = {}) => api.get(`/discussions/${id}`, axiosConfig),
  create: (data, axiosConfig = {}) => api.post('/discussions', data, axiosConfig),
  update: (id, data, axiosConfig = {}) => api.put(`/discussions/${id}`, data, axiosConfig),
  delete: (id, axiosConfig = {}) => api.delete(`/discussions/${id}`, axiosConfig),
};

export const postsAPI = {
  getByDiscussion: (discussionId, axiosConfig = {}) =>
    api.get(`/discussions/${discussionId}/posts`, axiosConfig),
  create: (discussionId, data, axiosConfig = {}) =>
    api.post(`/discussions/${discussionId}/posts`, data, axiosConfig),
  update: (id, data, axiosConfig = {}) => api.put(`/posts/${id}`, data, axiosConfig),
  delete: (id, axiosConfig = {}) => api.delete(`/posts/${id}`, axiosConfig),

  like: (id, axiosConfig = {}) =>
    api.post(`/posts/${id}/like`, {}, {
      ...axiosConfig,
      meta: { ...(axiosConfig.meta || {}), noRedirectOn401: true },
    }),
};

export const specialtiesAPI = {
  getAll: (params = {}, axiosConfig = {}) => api.get('/specialties', { params, ...axiosConfig }),
};

export const usersAPI = {
  getProfile: (axiosConfig = {}) => api.get('/users/profile', axiosConfig),
  updateProfile: (data, axiosConfig = {}) => api.put('/users/profile', data, axiosConfig),
  getById: (id, axiosConfig = {}) => api.get(`/users/${id}`, axiosConfig),
};

export const authAPI = {
  login: (credentials, axiosConfig = {}) => api.post('/auth/login', credentials, axiosConfig),
  register: (userData, axiosConfig = {}) => api.post('/auth/register', userData, axiosConfig),

  // ✅ CORRIGIDO: não enviar null (causava 400 no body-parser). Envia {}.
  logout: (axiosConfig = {}) => api.post('/auth/logout', {}, axiosConfig),

  getMe: (axiosConfig = {}) => api.get('/auth/me', axiosConfig),

  // tenta obter o usuário sem forçar login (não redireciona em 401)
  getMeOptional: () => api.get('/auth/me', { meta: { noRedirectOn401: true } }),

  /**
   * Login via Google OAuth. Recebe um idToken emitido pelo Google
   * e retorna um JWT da API juntamente com os dados do usuário.
   * @param {string} idToken
   * @param {object} axiosConfig
   */
  googleLogin: (idToken, axiosConfig = {}) =>
    api.post('/auth/google', { idToken }, axiosConfig),
};

export const statsAPI = {
  getDashboard: (axiosConfig = {}) => api.get('/stats/dashboard', axiosConfig),
  getPrompts: (axiosConfig = {}) => api.get('/stats/prompts', axiosConfig),
  getUsers: (axiosConfig = {}) => api.get('/stats/users', axiosConfig),
};

export default api;

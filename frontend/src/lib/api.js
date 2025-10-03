import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  timeout: 10000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 401 (com opção de não redirecionar) + 429 backoff
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;

    // 401
    if (response?.status === 401) {
      // Se o caller pediu explicitamente para NÃO redirecionar, só propaga o erro.
      if (config?.meta?.noRedirectOn401) {
        return Promise.reject(error);
      }
      // Fluxo padrão: limpar token e ir para login
      localStorage.removeItem('token');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // 429
    if (response?.status === 429 && config) {
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount >= 3) return Promise.reject(error);

      config.__retryCount += 1;

      const retryAfterHeader = response.headers?.['retry-after'];
      const retryAfterSec = retryAfterHeader ? Number(retryAfterHeader) : null;

      const base = 400 * Math.pow(2, config.__retryCount - 1);
      const jitter = Math.floor(Math.random() * 150);
      const delay = retryAfterSec ? retryAfterSec * 1000 : base + jitter;

      await sleep(delay);
      return api(config);
    }

    return Promise.reject(error);
  }
);

// ----------------- Serviços -----------------
export const promptsAPI = {
  getAll: (params = {}, axiosConfig = {}) => api.get('/prompts', { params, ...axiosConfig }),
  getById: (id, axiosConfig = {}) => api.get(`/prompts/${id}`, axiosConfig),
  create: (data, axiosConfig = {}) => api.post('/prompts', data, axiosConfig),
  update: (id, data, axiosConfig = {}) => api.put(`/prompts/${id}`, data, axiosConfig),
  delete: (id, axiosConfig = {}) => api.delete(`/prompts/${id}`, axiosConfig),

  // 👇 envia {} (corpo JSON) e não redireciona em 401
  like: (id, axiosConfig = {}) =>
    api.post(`/prompts/${id}/like`, {}, {
      ...axiosConfig,
      meta: { ...(axiosConfig.meta || {}), noRedirectOn401: true },
    }),

  getFeatured: (axiosConfig = {}) => api.get('/prompts/featured', axiosConfig),
};

export const commentsAPI = {
  getByPrompt: (promptId, axiosConfig = {}) =>
    api.get(`/prompts/${promptId}/comments`, axiosConfig),
  create: (promptId, data, axiosConfig = {}) =>
    api.post(`/prompts/${promptId}/comments`, data, axiosConfig),
  update: (id, data, axiosConfig = {}) => api.put(`/comments/${id}`, data, axiosConfig),
  delete: (id, axiosConfig = {}) => api.delete(`/comments/${id}`, axiosConfig),

  // 👇 idem: corpo {} e sem redirecionar em 401
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

  // 👇 idem
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
  logout: (axiosConfig = {}) => api.post('/auth/logout', null, axiosConfig),
  getMe: (axiosConfig = {}) => api.get('/auth/me', axiosConfig),

  // tenta obter o usuário sem forçar login (não redireciona em 401)
  getMeOptional: () => api.get('/auth/me', { meta: { noRedirectOn401: true } }),
};

export const statsAPI = {
  getDashboard: (axiosConfig = {}) => api.get('/stats/dashboard', axiosConfig),
};

export default api;

// AuthContext.jsx | AuthContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authAPI } from '@/lib/api';

const AuthContext = createContext({
  user: null,
  loading: true,
  isAuthenticated: false,
  login: async (_credentials, _options) => {},
  register: async (_userData, _options) => {},
  logout: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const initAuth = async () => {
      try {
        const response = await authAPI.getMeOptional?.();
        const fetchedUser = response?.data?.user ?? response?.user ?? null;
        setUser(fetchedUser || null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (credentials, options = {}) => {
    const {
      suppressRedirect = true,        // default: quem chama decide o redirect
      handleErrorInCaller = true,     // default: quem chama trata o erro
    } = options;

    try {
      // >>> Evita redirect automático do interceptor no 401 <<<
      const response = await authAPI.login(credentials, { meta: { noRedirectOn401: true } });
      const token = response?.data?.token;
      const loggedUser = response?.data?.user;

      if (!token) throw new Error('Token não retornado');

      localStorage.setItem('token', token);
      setUser(loggedUser);

      if (!suppressRedirect) {
        toast.success('Login realizado com sucesso!');
        navigate('/', { replace: true });
      }

      return { success: true, user: loggedUser };
    } catch (error) {
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Erro ao realizar login';

      if (handleErrorInCaller) {
        const err = new Error(msg);
        err.response = error?.response;
        throw err; // >>> deixa o componente mostrar a mensagem persistente
      } else {
        toast.error(msg, { duration: 12000 });
        return { success: false, error: msg };
      }
    }
  };

  const register = async (userData, options = {}) => {
    const { suppressRedirect = false } = options;
    try {
      const response = await authAPI.register(userData, { meta: { noRedirectOn401: true } });
      const token = response?.data?.token;
      const newUser = response?.data?.user;

      if (!token) throw new Error('Token não retornado');

      localStorage.setItem('token', token);
      setUser(newUser);

      if (!suppressRedirect) {
        toast.success('Cadastro realizado com sucesso!');
        navigate('/', { replace: true });
      }

      return { success: true, user: newUser };
    } catch (error) {
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Erro ao realizar cadastro';
      toast.error(msg, { duration: 12000 });
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout?.();
    } catch {}
    localStorage.removeItem('token');
    setUser(null);
    toast.success('Logout realizado com sucesso');
    navigate('/', { replace: true });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

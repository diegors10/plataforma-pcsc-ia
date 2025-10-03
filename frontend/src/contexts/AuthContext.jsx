import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authAPI } from '@/lib/api';

/**
 * Contexto de autenticação responsável por armazenar o usuário logado
 * e fornecer funções para login, cadastro e logout.
 */
const AuthContext = createContext({
  user: null,
  loading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Ao iniciar, tenta recuperar o usuário atual usando o token salvo.
  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await authAPI.getMeOptional();
        const fetchedUser = response?.data?.user;
        if (fetchedUser) {
          setUser(fetchedUser);
        } else {
          setUser(null);
        }
      // eslint-disable-next-line no-unused-vars
      } catch (_err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  /**
   * Efetua login com email e senha. Armazena o token no localStorage
   * e define o usuário no contexto. Exibe feedback via toast.
   */
  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const token = response?.data?.token;
      const loggedUser = response?.data?.user;
      if (token) {
        localStorage.setItem('token', token);
        setUser(loggedUser);
        toast.success('Login realizado com sucesso!');
        navigate('/');
        return { success: true };
      }
      throw new Error('Token não retornado');
    } catch (error) {
      const msg = error?.response?.data?.error || 'Erro ao realizar login';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  /**
   * Cadastra um novo usuário. Em caso de sucesso, faz login automaticamente.
   */
  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const token = response?.data?.token;
      const newUser = response?.data?.user;
      if (token) {
        localStorage.setItem('token', token);
        setUser(newUser);
        toast.success('Cadastro realizado com sucesso!');
        navigate('/');
        return { success: true };
      }
      throw new Error('Token não retornado');
    } catch (error) {
      const msg = error?.response?.data?.error || 'Erro ao realizar cadastro';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  /**
   * Realiza logout limpando o token e resetando o usuário.
   */
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // ignora erros
    }
    localStorage.removeItem('token');
    setUser(null);
    toast.success('Logout realizado com sucesso');
    navigate('/');
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

/**
 * Hook utilitário para acessar o AuthContext.
 */
export const useAuth = () => useContext(AuthContext);

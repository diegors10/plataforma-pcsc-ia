import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // 1. Prioridade: verificar se há um tema salvo no localStorage
    const savedTheme = localStorage.getItem('pcsc-theme');
    if (savedTheme) {
      return savedTheme;
    }
    
    // 2. Padrão: se não houver tema salvo, define 'dark' como inicial
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Garante que apenas a classe de tema atual esteja no elemento <html>
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    
    // Salva a escolha do tema no localStorage para persistir a seleção
    localStorage.setItem('pcsc-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const setLightTheme = () => setTheme('light');
  const setDarkTheme = () => setTheme('dark');
  
  // Esta função ainda permite que o usuário sincronize com o tema do sistema se desejar
  const setSystemTheme = () => {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    setTheme(systemTheme);
  };

  const value = {
    theme,
    toggleTheme,
    setLightTheme,
    setDarkTheme,
    setSystemTheme,
    isLight: theme === 'light',
    isDark: theme === 'dark'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
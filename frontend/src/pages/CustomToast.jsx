import React from 'react';
import { toast as sonnerToast } from 'sonner';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

/**
 * Toast personalizado com melhor estilo e barra de progresso
 */
export const toast = {
  success: (message, options = {}) => {
    return sonnerToast.custom((t) => (
      <div className="flex items-center space-x-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 shadow-lg">
        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            {message}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 h-1 bg-green-600 dark:bg-green-400 rounded-b-lg animate-[shrink_4s_linear_forwards]" 
             style={{ width: '100%' }} />
      </div>
    ), {
      duration: 4000,
      ...options
    });
  },

  error: (message, options = {}) => {
    return sonnerToast.custom((t) => (
      <div className="flex items-center space-x-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 shadow-lg">
        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            {message}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 h-1 bg-red-600 dark:bg-red-400 rounded-b-lg animate-[shrink_4s_linear_forwards]" 
             style={{ width: '100%' }} />
      </div>
    ), {
      duration: 4000,
      ...options
    });
  },

  warning: (message, options = {}) => {
    return sonnerToast.custom((t) => (
      <div className="flex items-center space-x-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 shadow-lg">
        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            {message}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 h-1 bg-yellow-600 dark:bg-yellow-400 rounded-b-lg animate-[shrink_4s_linear_forwards]" 
             style={{ width: '100%' }} />
      </div>
    ), {
      duration: 4000,
      ...options
    });
  },

  info: (message, options = {}) => {
    return sonnerToast.custom((t) => (
      <div className="flex items-center space-x-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 shadow-lg">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            {message}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 h-1 bg-blue-600 dark:bg-blue-400 rounded-b-lg animate-[shrink_4s_linear_forwards]" 
             style={{ width: '100%' }} />
      </div>
    ), {
      duration: 4000,
      ...options
    });
  }
};

// Adicionar estilos CSS para a animação da barra de progresso
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shrink {
      from { width: 100%; }
      to { width: 0%; }
    }
  `;
  document.head.appendChild(style);
}

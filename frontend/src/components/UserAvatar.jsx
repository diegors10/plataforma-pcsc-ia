import React from 'react';

/**
 * Componente para exibir avatar do usuário com iniciais
 */
const UserAvatar = ({ 
  user, 
  size = 'md', 
  className = '',
  showName = false 
}) => {
  // Função para gerar iniciais
  const getUserInitials = (name) => {
    if (!name || typeof name !== 'string') return 'U';
    
    const names = name.trim().split(' ').filter(n => n.length > 0);
    
    if (names.length === 0) return 'U';
    if (names.length === 1) {
      // Para nomes simples (ex: "Maria"), usamos as duas primeiras letras
      const word = names[0];
      return word.slice(0, 2).toUpperCase();
    }

    // Pegar primeira e última palavra
    const firstName = names[0];
    const lastName = names[names.length - 1];

    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  };

  // Definir tamanhos
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  };

  const initials = getUserInitials(user?.nome || user?.name);
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {user?.avatar ? (
        <img
          src={user.avatar}
          alt={user.nome || user.name || 'Usuário'}
          className={`${sizeClass} rounded-full object-cover border-2 border-accent/20`}
        />
      ) : (
        <div className={`${sizeClass} rounded-full bg-accent/10 border-2 border-accent/20 flex items-center justify-center font-medium text-accent`}>
          {initials}
        </div>
      )}
      
      {showName && (
        <div className="flex flex-col">
          <span className="font-medium text-foreground text-sm">
            {user?.nome || user?.name || 'Usuário'}
          </span>
          {user?.cargo && (
            <span className="text-xs text-muted-foreground">
              {user.cargo}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default UserAvatar;

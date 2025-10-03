import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Página de perfil do usuário. Exibe informações básicas do usuário logado.
 * Caso não esteja autenticado, redireciona para a página de login.
 */
const Profile = () => {
  const { user, loading } = useAuth();

  if (!loading && !user) {
    // Não autenticado: redireciona
    return <Navigate to="/login" state={{ message: 'Você precisa estar logado para acessar o perfil.' }} />;
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-4 py-8">
      <div className="max-w-lg w-full">
        <Card>
          <CardHeader>
            <CardTitle>Meu Perfil</CardTitle>
            <CardDescription>Informações da sua conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="text-lg font-medium text-foreground">{user?.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-lg font-medium text-foreground">{user?.email}</p>
                </div>
                {user?.departamento && (
                  <div>
                    <p className="text-sm text-muted-foreground">Departamento</p>
                    <p className="text-lg font-medium text-foreground">{user.departamento}</p>
                  </div>
                )}
                {user?.cargo && (
                  <div>
                    <p className="text-sm text-muted-foreground">Cargo</p>
                    <p className="text-lg font-medium text-foreground">{user.cargo}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
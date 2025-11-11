import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

/**
 * Página de cadastro desabilitada.
 * Exibe uma mensagem informando que o registro está indisponível e direciona para login.
 */
const Register = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Cadastro desativado</CardTitle>
            <CardDescription>
              O registro de novas contas está temporariamente indisponível. Para acessar a plataforma,
              utilize o login via Google com sua conta institucional.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Button onClick={() => navigate('/login')} className="w-full">
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
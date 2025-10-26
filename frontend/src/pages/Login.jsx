import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, UserPlus, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const Login = () => {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Se quiser exibir mensagem de origem, descomente:
  // const state = location.state || {};
  // const fromMessage = state?.message;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setFormError(null);

    try {
      // Use as opções suportadas pelo AuthContext:
      // - suppressRedirect: false -> deixa o AuthContext redirecionar em sucesso
      // - handleErrorInCaller: true -> erros são lançados para este componente tratar
      await login(
        { email, senha: password },
        { suppressRedirect: false, handleErrorInCaller: true }
      );
      // Nada aqui: o AuthContext já faz navigate('/', { replace: true }) em sucesso
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Credenciais inválidas. Verifique seus dados e tente novamente.';

      toast.error(msg, { duration: 12000 });
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Acessar Conta</CardTitle>
                <CardDescription>Informe suas credenciais para continuar.</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="h-8 w-8 p-0"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {/* Se quiser mostrar mensagem de origem:
            {fromMessage && (
              <div className="mb-4 text-sm text-red-600 font-medium">
                {fromMessage}
              </div>
            )} */}

            {formError && (
              <div
                className="mb-4 flex items-start rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle className="mr-2 h-4 w-4 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9"
                    autoComplete="username"
                    aria-invalid={!!formError}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-9"
                    autoComplete="current-password"
                    aria-invalid={!!formError}
                  />
                </div>
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin text-accent" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            <p className="mt-6 text-sm text-muted-foreground text-center">
              Não tem uma conta?{' '}
              <Link to="/register" className="text-accent underline-offset-4 hover:underline inline-flex items-center">
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                Cadastre-se
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;

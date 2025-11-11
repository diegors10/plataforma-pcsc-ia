import React from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '@/contexts/AuthContext'
import banner from '@/assets/banner-ia-pcsc.jpeg'

// shadcn/ui
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// ícones
import { LogIn, Info } from 'lucide-react'

const Login = () => {
  const { loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  const handleGoogleSuccess = async (cred) => {
    try {
      await loginWithGoogle(cred?.credential, { suppressRedirect: false })
    } catch (err) {
      console.error('Falha no login com Google:', err)
    }
  }

  const handleGoogleError = () => {
    console.error('Falha ao iniciar login com Google')
  }

  return (
    <div
      className="
        min-h-screen w-full flex items-center justify-center p-4
        bg-white text-zinc-900
        dark:bg-gradient-to-br dark:from-zinc-950 dark:via-zinc-900 dark:to-black dark:text-white
      "
    >
      {/* Card único centralizado */}
      <div className="w-full max-w-3xl">
        <Card
          className="
            overflow-hidden rounded-2xl shadow-2xl h-full min-h-[560px] flex flex-col
            bg-black text-white border border-zinc-800
          "
        >
          {/* Banner 16:9 mostrando a arte inteira sem cortes/linhas */}
          <div className="relative w-full aspect-[16/9] bg-black">
            <img
              src={banner}
              alt="Polícia Civil de Santa Catarina - Inteligência Artificial"
              className="absolute inset-0 block h-full w-full object-contain select-none pointer-events-none m-0 p-3 border-0"
              draggable={false}
            />
          </div>

          <CardContent className="p-6 flex flex-col">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  Plataforma PCSC-IA
                </h1>
                <p className="text-sm text-zinc-300">
                  Acesso exclusivo para contas <span className="font-medium text-white">@pc.sc.gov.br</span>
                </p>
              </div>
            </div>

            <div className="mt-4 text-sm text-zinc-300 leading-relaxed">
              <p className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-200" />
                Para sua segurança, o acesso é realizado apenas via autenticação Google do domínio institucional.
              </p>
            </div>

            {/* Ação principal alinhada à base do card */}
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 mt-auto">
              <div className="rounded-lg bg-white p-1">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap
                  auto_select
                />
              </div>

              <div className="text-xs text-zinc-300">
                Ao entrar, você concorda com os termos internos e a política de privacidade.
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <p className="text-[11px] text-zinc-400">
                Não há cadastro manual. Caso não possua conta institucional, contate os administradores através do e-mail{' '}
                <a
                  href="mailto:getin-ia@pc.sc.gov.br"
                  className="text-zinc-200 hover:underline"
                >
                  getin-ia@pc.sc.gov.br
                </a>.
              </p>
            </div>

            <div className="mt-auto pt-4">
              <Button
                variant="secondary"
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white"
                onClick={() => navigate(-1)}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Login

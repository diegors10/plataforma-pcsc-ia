import React from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

// ícones
import { Mail, User, Building2, MapPin, Copy, ShieldCheck, ArrowLeft } from 'lucide-react'

const Profile = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  if (!loading && !user) {
    return (
      <Navigate
        to="/login"
        state={{ message: 'Você precisa estar logado para acessar o perfil.' }}
        replace
      />
    )
  }

  const initials = React.useMemo(() => {
    const n = (user?.nome || '').trim()
    if (!n) return 'PC'
    const parts = n.split(/\s+/).slice(0, 2)
    return parts.map(p => p[0]?.toUpperCase()).join('') || 'PC'
  }, [user?.nome])

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(user?.email || '')
    } catch { /* noop */ }
  }

  const ultimoLoginFmt = React.useMemo(() => {
    if (!user?.ultimo_login) return '—'
    try {
      const d = new Date(user.ultimo_login)
      return d.toLocaleString()
    } catch {
      return String(user.ultimo_login)
    }
  }, [user?.ultimo_login])

  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              {/* Esquerda: avatar + títulos */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-2 ring-yellow-500/30">
                  <AvatarImage
                    src={user?.avatar || ''}
                    alt={user?.nome || 'Avatar'}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-yellow-500/10 text-yellow-300">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <CardTitle className="truncate">
                    {loading ? 'Carregando…' : user?.nome || 'Usuário'}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <ShieldCheck className="h-4 w-4" />
                    Perfil institucional da Polícia Civil de Santa Catarina
                  </CardDescription>
                </div>
              </div>

              {/* Direita: botão Voltar */}
              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => navigate(-1)}
                title="Voltar"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="pt-4 space-y-5">
            {/* E-mail */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                {loading ? (
                  <span className="h-4 w-40 animate-pulse rounded bg-muted/60" />
                ) : (
                  <span className="truncate">{user?.email}</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={copyEmail}
                title="Copiar e-mail"
                aria-label="Copiar e-mail"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {/* Chips de informações */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoChip
                icon={<User className="h-4 w-4" />}
                label="Cargo"
                value={loading ? null : (user?.cargo || '—')}
              />
              <InfoChip
                icon={<Building2 className="h-4 w-4" />}
                label="Departamento"
                value={loading ? null : (user?.departamento || '—')}
              />
              <InfoChip
                icon={<MapPin className="h-4 w-4" />}
                label="Localização"
                value={loading ? null : (user?.localizacao || '—')}
              />
              <InfoChip
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Último login"
                value={loading ? null : ultimoLoginFmt}
              />
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Dados sincronizados automaticamente após autenticação via Google do domínio
              <span className="font-medium"> @pc.sc.gov.br</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/** Pequeno componente para exibir “chips” com label + valor ou skeleton */
function InfoChip({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {value === null ? (
          <div className="mt-1 h-4 w-28 animate-pulse rounded bg-muted/60" />
        ) : (
          <span className="mt-1 inline-flex max-w-full items-center rounded-full bg-muted px-2 py-0.5 text-sm">
            {value}
          </span>
        )}
      </div>
    </div>
  )
}

export default Profile

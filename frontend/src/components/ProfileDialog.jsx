import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { X, User, Mail, Building2, MapPin, Copy } from 'lucide-react'

/**
 * Props:
 *  - open: boolean
 *  - onOpenChange: (boolean) => void
 */
export default function ProfileDialog({ open, onOpenChange }) {
  const { user, loading } = useAuth()

  const initials = React.useMemo(() => {
    const n = (user?.nome || '').trim()
    if (!n) return 'PC'
    const parts = n.split(/\s+/).slice(0, 2)
    return parts.map((p) => p[0]?.toUpperCase()).join('') || 'PC'
  }, [user?.nome])

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(user?.email || '')
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white focus:outline-none"
        aria-label="Perfil do usuário"
      >
        {/* Botão fechar */}
        <button
          onClick={() => onOpenChange?.(false)}
          className="absolute right-3 top-3 rounded-full p-1.5 hover:bg-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-zinc-700"
          aria-label="Fechar"
        >
          <X className="h-5 w-5 text-zinc-300" />
        </button>

        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-yellow-500/30">
              {/* Avatar do banco */}
              <AvatarImage
                src={user?.avatar || ''}
                alt={user?.nome || 'Avatar'}
                className="object-cover"
              />
              <AvatarFallback className="bg-yellow-500/10 text-yellow-300">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-base sm:text-lg">
              {user?.nome || (loading ? 'Carregando…' : 'Usuário')}
            </span>
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Informações do seu perfil institucional
          </DialogDescription>
        </DialogHeader>

        {/* Conteúdo */}
        <div className="mt-2 space-y-3 text-sm">
          {/* E-mail */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Mail className="h-4 w-4 text-zinc-400 shrink-0" />
              {loading ? (
                <span className="h-4 w-40 animate-pulse rounded bg-zinc-800" />
              ) : (
                <span className="truncate text-zinc-300">{user?.email}</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-300 hover:text-white"
              onClick={handleCopyEmail}
              title="Copiar e-mail"
              aria-label="Copiar e-mail"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          {/* Cargo */}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-zinc-400 shrink-0" />
            {loading ? (
              <span className="h-4 w-28 animate-pulse rounded bg-zinc-800" />
            ) : (
              <span className="inline-flex max-w-full items-center rounded-full bg-zinc-800/60 px-2 py-0.5 text-zinc-200">
                {user?.cargo || '—'}
              </span>
            )}
          </div>

          {/* Departamento */}
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-zinc-400 shrink-0" />
            {loading ? (
              <span className="h-4 w-44 animate-pulse rounded bg-zinc-800" />
            ) : (
              <span className="inline-flex max-w-full items-center rounded-full bg-zinc-800/60 px-2 py-0.5 text-zinc-200">
                {user?.departamento || '—'}
              </span>
            )}
          </div>

          {/* Localização */}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-zinc-400 shrink-0" />
            {loading ? (
              <span className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
            ) : (
              <span className="inline-flex max-w-full items-center rounded-full bg-zinc-800/60 px-2 py-0.5 text-zinc-200">
                {user?.localizacao || '—'}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            variant="secondary"
            className="bg-zinc-800 hover:bg-zinc-700 text-white"
            onClick={() => onOpenChange?.(false)}
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { X as XIcon } from 'lucide-react';

export default function LoginDialog({ open, onOpenChange }) {
  const navigate = useNavigate();

  const go = (path) => {
    // Fecha a modal antes de navegar, preservando estado da página
    if (onOpenChange) onOpenChange(false);
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Botão X acessível no topo direito */}
        <DialogClose
          asChild
          aria-label="Fechar"
          className="absolute right-3 top-3 rounded-md p-1 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <button type="button">
            <XIcon className="h-4 w-4" />
          </button>
        </DialogClose>

        <DialogHeader>
          <DialogTitle>Participe da comunidade PCSC-IA</DialogTitle>
          <DialogDescription>
            Crie sua conta ou entre para curtir, comentar, publicar prompts e participar dos fóruns.
          </DialogDescription>
        </DialogHeader>

        {/* CTA primário com autoFocus para melhor acessibilidade */}
        <div className="flex flex-col gap-2">
          <Button autoFocus onClick={() => go('/login')}>
            Entrar
          </Button>
          <Button variant="outline" onClick={() => go('/register')}>
            Criar conta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

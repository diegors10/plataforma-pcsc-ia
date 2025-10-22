import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageCircle, 
  Plus, 
  Clock, 
  Eye, 
  ThumbsUp, 
  Loader2, 
  AlertCircle,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { discussionsAPI } from '@/lib/api';
import { Switch } from '@/components/ui/switch';
import { formatTimeAgo } from '@/utils/time';
import UserAvatar from '@/components/UserAvatar';

const Discussoes = () => {
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDiscussionTitle, setNewDiscussionTitle] = useState('');
  const [newDiscussionContent, setNewDiscussionContent] = useState('');
  const [submittingDiscussion, setSubmittingDiscussion] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [contentError, setContentError] = useState('');

  // Define se a discussão é aberta (qualquer um pode interagir) ou fechada (somente logados)
  const [isOpen, setIsOpen] = useState(true);

  // Discussões serão carregadas da API

  useEffect(() => {
    fetchDiscussions();
  }, []);

  const fetchDiscussions = async () => {
    try {
      setLoading(true);
      const response = await discussionsAPI.getAll({ page: 1, limit: 20 });
      const data = response.data.discussions || [];
      // Adaptar dados da API para o formato utilizado no componente
      const adapted = data.map((d) => ({
        id: d.id,
        title: d.titulo || d.title,
        content: d.descricao || d.content,
        author: {
          id: d.usuarios?.id,
          name: d.usuarios?.nome || 'Usuário',
          avatar: d.usuarios?.avatar || null
        },
        commentsCount: d.posts || d.commentsCount || 0,
        views: d.views || d.visualizacoes || 0,
        likes: 0,
        createdAt: d.criado_em || d.createdAt,
        tags: []
      }));
      setDiscussions(adapted);
    } catch (error) {
      console.error('Erro ao buscar discussões:', error);
      toast.error('Erro ao carregar discussões. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewDiscussionSubmit = async (e) => {
    e.preventDefault();
    let valid = true;

    if (!newDiscussionTitle.trim()) {
      setTitleError('O título da discussão é obrigatório.');
      valid = false;
    } else if (newDiscussionTitle.trim().length < 10) {
      setTitleError('O título deve ter pelo menos 10 caracteres.');
      valid = false;
    } else if (newDiscussionTitle.trim().length > 150) {
      setTitleError('O título deve ter no máximo 150 caracteres.');
      valid = false;
    } else {
      setTitleError('');
    }

    if (!newDiscussionContent.trim()) {
      setContentError('O conteúdo da discussão é obrigatório.');
      valid = false;
    } else if (newDiscussionContent.trim().length < 20) {
      setContentError('O conteúdo deve ter pelo menos 20 caracteres.');
      valid = false;
    } else if (newDiscussionContent.trim().length > 2000) {
      setContentError('O conteúdo deve ter no máximo 2000 caracteres.');
      valid = false;
    } else {
      setContentError('');
    }

    if (!valid) {
      toast.error('Por favor, corrija os erros no formulário.');
      return;
    }

    try {
      setSubmittingDiscussion(true);
      // Enviar nova discussão para a API
      const payload = {
        titulo: newDiscussionTitle.trim(),
        descricao: newDiscussionContent.trim(),
        categoria: 'Geral',
        e_aberta: isOpen
      };
      const response = await discussionsAPI.create(payload);
      const created = response.data.discussion;
      const adapted = {
        id: created.id,
        title: created.titulo || created.title,
        content: created.descricao || created.content,
        author: {
          id: created.usuarios?.id,
          name: created.usuarios?.nome || 'Usuário',
          avatar: created.usuarios?.avatar || null
        },
        commentsCount: 0,
        views: 0,
        likes: 0,
        createdAt: created.criado_em || new Date().toISOString(),
        tags: []
      };
      setDiscussions([adapted, ...discussions]);
      setNewDiscussionTitle('');
      setNewDiscussionContent('');
      setIsOpen(true);
      toast.success('Discussão criada com sucesso!', {
        description: 'Sua discussão foi publicada e está aguardando interações.'        
      });
    } catch (error) {
      console.error('Erro ao criar discussão:', error);
      toast.error('Erro ao criar discussão. Tente novamente.');
    } finally {
      setSubmittingDiscussion(false);
    }
  };

  // formatTimeAgo é importado de '@/utils/time'; ele lida com datas inválidas e formata data/hora

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div className="mb-4 lg:mb-0">
            <h1 className="text-3xl font-bold text-foreground mb-2">Fórum de Discussões</h1>
            <p className="text-muted-foreground">
              Participe de discussões e troque ideias com a comunidade
            </p>
          </div>
        </div>

        {/* Nova Discussão */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Iniciar Nova Discussão</CardTitle>
            <CardDescription>Compartilhe suas perguntas e insights com a comunidade.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleNewDiscussionSubmit} className="space-y-4">
              <div>
                <Input
                  placeholder="Título da discussão..."
                  value={newDiscussionTitle}
                  onChange={(e) => {
                    setNewDiscussionTitle(e.target.value);
                    if (titleError) setTitleError('');
                  }}
                  className={titleError ? 'border-red-500' : ''}
                />
                {titleError && <p className="text-red-500 text-sm mt-1">{titleError}</p>}
              </div>
              <div>
                <Textarea
                  placeholder="Escreva o conteúdo da sua discussão aqui..."
                  value={newDiscussionContent}
                  onChange={(e) => {
                    setNewDiscussionContent(e.target.value);
                    if (contentError) setContentError('');
                  }}
                  className={`min-h-[100px] ${contentError ? 'border-red-500' : ''}`}
                />
                {contentError && <p className="text-red-500 text-sm mt-1">{contentError}</p>}
              </div>
              {/* Toggle Aberta/Fechada */}
              <div className="flex items-center space-x-3">
                <Switch
                  checked={isOpen}
                  onCheckedChange={setIsOpen}
                  id="toggle-open-discussion"
                />
                <label
                  htmlFor="toggle-open-discussion"
                  className="text-sm text-muted-foreground cursor-pointer select-none"
                >
                  {isOpen
                    ? 'Discussão aberta – qualquer usuário pode curtir e comentar'
                    : 'Discussão fechada – somente usuários logados podem interagir'}
                </label>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={submittingDiscussion}>
                  {submittingDiscussion ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin text-accent" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Publicar Discussão
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Lista de Discussões */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <span className="ml-2 text-muted-foreground">Carregando discussões...</span>
          </div>
        ) : discussions.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma discussão encontrada</h3>
            <p className="text-muted-foreground mb-4">
              Seja o primeiro a iniciar uma discussão!
            </p>
            <Button onClick={() => document.querySelector('textarea').focus()}>
              <Plus className="h-4 w-4 mr-2" />
              Iniciar Discussão
            </Button>
          </div>
        ) : (
          <div className="grid gap-6">
            {discussions.map((discussion) => (
              <Card key={discussion.id} className="hover:shadow-lg transition-all duration-300 group cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {discussion.tags && discussion.tags.map(tag => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                      
                      <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-accent transition-colors">
                        <Link to={`/discussoes/${discussion.id}`}>
                          {discussion.title}
                        </Link>
                      </h3>
                      
                      <p className="text-muted-foreground mb-4 line-clamp-2">
                        {discussion.content}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        {/* Exibir avatar ou iniciais do autor */}
                        <UserAvatar user={discussion.author} size="sm" />
                        <div className="ml-2">
                          <p className="text-sm font-medium text-foreground">
                            {discussion.author?.name || 'Usuário'}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatTimeAgo(discussion.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        {discussion.likes}
                      </Button>
                      
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/discussoes/${discussion.id}#comments`}>
                          <MessageCircle className="h-4 w-4 mr-1" />
                          {discussion.commentsCount}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Discussoes;

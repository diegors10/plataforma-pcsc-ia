import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  ThumbsUp,
  MessageCircle,
  ArrowLeft,
  Send,
  Loader2,
  AlertCircle,
  Edit,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
// Utilizaremos o componente UserAvatar em vez dos avatares base para exibir iniciais
import UserAvatar from '@/components/UserAvatar';
import { Separator } from '@/components/ui/separator';
import { discussionsAPI, postsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  hasLikedPost,
  markLikedPost,
  unmarkLikedPost,
  mergeIsLikedInPostList,
} from '@/utils/postLikesStore';
import { toast } from 'sonner';


import { formatDateTime } from '@/utils/time';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Página para visualizar uma discussão específica e suas postagens
const VisualizarDiscussao = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [discussion, setDiscussion] = useState(null);
  const [posts, setPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Estados para edição da discussão
  const [editingDiscussion, setEditingDiscussion] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Contexto de autenticação e usuário
  const { isAuthenticated, user } = useAuth();

  // Carregar dados da discussão e postagens ao montar
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Buscar discussão
        const respDisc = await discussionsAPI.getById(id);
        const d = respDisc.data;
        const adaptedDiscussion = {
          id: d.id,
          title: d.titulo || d.title,
          description: d.descricao || d.description,
          category: d.categoria || d.category,
          createdAt: d.criado_em || d.createdAt,
          updatedAt: d.atualizado_em || d.updatedAt,
          views: d.views || d.visualizacoes || 0,
          postsCount: d.posts || d.postsCount || 0,
          isOpen: d.e_aberta !== undefined ? d.e_aberta : true,
          author: d.usuarios
            ? {
                id: d.usuarios.id,
                name: d.usuarios.nome,
                avatar: d.usuarios.avatar,
                role: d.usuarios.cargo,
                department: d.usuarios.departamento,
              }
            : null,
        };
        setDiscussion(adaptedDiscussion);
        // Buscar postagens
        const respPosts = await postsAPI.getByDiscussion(id);
        const rawPosts = respPosts.data.posts || [];
        const adaptedPosts = rawPosts.map((p) => ({
          id: p.id,
          author: p.usuarios
            ? {
                id: p.usuarios.id,
                name: p.usuarios.nome,
                avatar: p.usuarios.avatar,
                role: p.usuarios.cargo,
              }
            : null,
          content: p.conteudo,
          createdAt: p.criado_em,
          likes: p.likes || 0,
          comments: p.comments || 0,
          isLiked: p.isLiked || false,
        }));
        // Mesclar curtidas locais para posts quando usuário não está autenticado
        const mergedPosts = isAuthenticated ? adaptedPosts : mergeIsLikedInPostList(adaptedPosts);
        setPosts(mergedPosts);
      } catch (err) {
        console.error('Erro ao carregar discussão', err);
        
        toast.error('Erro ao carregar discussão.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  /**
   * Determina se o usuário atual pode editar ou excluir a discussão.
   * Apenas o autor da discussão ou moderadores podem editá-la.
   */
  const canEditDiscussion = !!(
    user &&
    discussion &&
    discussion.author &&
    (String(user.id) === String(discussion.author.id) || user.e_moderador)
  );

  /**
   * Salva as alterações da discussão após edição.
   */
  const handleUpdateDiscussion = async () => {
    if (!discussion) return;
    const title = editTitle.trim();
    const description = editDescription.trim();
    if (!title || !description) {
      toast.error('Título e descrição são obrigatórios.');
      return;
    }
    try {
      await discussionsAPI.update(discussion.id, {
        titulo: title,
        descricao: description,
      });
      setDiscussion((prev) =>
        prev ? { ...prev, title: title, description: description } : prev
      );
      toast.success('Discussão atualizada com sucesso!');
      setEditingDiscussion(false);
    } catch (err) {
      console.error('Erro ao atualizar discussão', err);
      toast.error('Erro ao atualizar discussão.');
    }
  };

  /**
   * Exclui a discussão atual após confirmação do usuário.
   */
  const handleDeleteDiscussion = async () => {
    if (!discussion) return;
    const confirmDelete = window.confirm(
      'Tem certeza que deseja excluir esta discussão? Esta ação não pode ser desfeita.'
    );
    if (!confirmDelete) return;
    try {
      await discussionsAPI.delete(discussion.id);
      toast.success('Discussão excluída com sucesso!');
      // Redireciona para a lista de discussões após a exclusão
      navigate('/discussoes');
    } catch (err) {
      console.error('Erro ao excluir discussão', err);
      toast.error('Erro ao excluir discussão.');
    }
  };

  // NOTE: Removido formatDateTime local; utiliza-se util importado

  // Criar nova postagem
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) {
      toast.error('Escreva algo antes de publicar');
      return;
    }
    // Se a discussão estiver fechada e o usuário não estiver autenticado, impedir criação
    if (discussion && discussion.isOpen === false && !isAuthenticated) {
      toast.error('Faça login para publicar nesta discussão.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await postsAPI.create(id, { conteudo: newPostContent.trim() });
      const p = res.data.post;
      const adapted = {
        id: p.id,
        author: p.usuarios
          ? {
              id: p.usuarios.id,
              name: p.usuarios.nome,
              avatar: p.usuarios.avatar,
              role: p.usuarios.cargo,
            }
          : null,
        content: p.conteudo,
        createdAt: p.criado_em,
        likes: 0,
        comments: 0,
        isLiked: false,
      };
      // Se não autenticado, não há necessidade de chamar merge
      setPosts((prev) => [...prev, adapted]);
      setNewPostContent('');
      toast.success('Post publicado com sucesso!');
    } catch (err) {
      console.error('Erro ao criar post', err);
      toast.error('Erro ao criar post');
    } finally {
      setSubmitting(false);
    }
  };

  // Curtir ou descurtir uma postagem
  const toggleLike = async (postId) => {
    // se discussão está fechada e usuário não autenticado, não permite
    if (discussion && discussion.isOpen === false && !isAuthenticated) {
      toast.error('Faça login para curtir nesta discussão.');
      return;
    }
    // Localizar o post atual
    const current = posts.find((p) => p.id === postId);
    if (!current) return;

    // Se usuário autenticado, realiza a chamada ao backend
    if (isAuthenticated) {
      const dir = current.isLiked ? 'dec' : 'inc';
      try {
        // Chama a API com dir apropriado; usa params para query string
        await postsAPI.like(postId, { params: { dir } });
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  isLiked: !p.isLiked,
                  likes: p.isLiked ? Math.max(0, p.likes - 1) : p.likes + 1,
                }
              : p
          )
        );
      } catch (err) {
        console.error('Erro ao curtir post', err);
        toast.error('Erro ao curtir post');
      }
    } else {
      // Usuário não autenticado: manipula curtida localmente
      const alreadyLiked = hasLikedPost(postId);
      if (alreadyLiked) {
        unmarkLikedPost(postId);
      } else {
        markLikedPost(postId);
      }
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                isLiked: !alreadyLiked,
                likes: !alreadyLiked ? p.likes + 1 : Math.max(0, p.likes - 1),
              }
            : p
        )
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando discussão...</p>
        </div>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Discussão não encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mr-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">{discussion.title}</h1>
        </div>
        {/* Se estiver editando, mostre um formulário para editar título e descrição */}
        {editingDiscussion ? (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Editar Discussão</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleUpdateDiscussion();
              }} className="space-y-4">
                <div>
                  <Input
                    placeholder="Título da discussão"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className=""
                  />
                </div>
                <div>
                  <Textarea
                    placeholder="Descrição da discussão"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="submit" disabled={!editTitle.trim() || !editDescription.trim()}>Salvar</Button>
                  <Button type="button" variant="outline" onClick={() => setEditingDiscussion(false)}>Cancelar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <p className="text-muted-foreground mb-4">{discussion.description}</p>
        )}
        <div className="flex items-center space-x-4 mb-6">
          {discussion.author && (
            <div className="flex items-center">
              {/* Avatar ou iniciais do autor */}
              <UserAvatar user={discussion.author} size="sm" />
              <div className="ml-2">
                <p className="text-sm font-medium text-foreground">{discussion.author.name}</p>
                <p className="text-xs text-muted-foreground flex items-center">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {formatDateTime(discussion.createdAt)}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center space-x-4 ml-auto">
            <span className="text-sm text-muted-foreground">{discussion.postsCount} posts</span>
            <span className="text-sm text-muted-foreground">{discussion.views} visualizações</span>
            {/* Dropdown de ações para editar/excluir se permitido */}
            {canEditDiscussion && !editingDiscussion && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditTitle(discussion.title || '');
                      setEditDescription(discussion.description || '');
                      setEditingDiscussion(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDeleteDiscussion}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <Separator className="my-6" />
        {/* Lista de postagens */}
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma postagem encontrada</h3>
            <p className="text-muted-foreground mb-4">Seja o primeiro a publicar nesta discussão.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.id} className="hover:shadow-md transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-start mb-2">
                    {/* Avatar ou iniciais do autor da postagem */}
                    <UserAvatar user={post.author} size="sm" className="mr-3" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{post.author?.name || 'Usuário'}</p>
                      <p className="text-xs text-muted-foreground flex items-center">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatDateTime(post.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLike(post.id)}
                        disabled={discussion.isOpen === false && !isAuthenticated}
                        className={post.isLiked ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        {post.likes}
                      </Button>
                    </div>
                  </div>
                  <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {/* Novo Post */}
        <Separator className="my-6" />
        {discussion.isOpen === false && !isAuthenticated ? (
          <Card>
            <CardHeader>
              <CardTitle>Discussão Fechada</CardTitle>
              <CardDescription>Apenas usuários autenticados podem participar.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground">Faça login para comentar ou curtir nesta discussão fechada.</div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Nova Postagem</CardTitle>
              <CardDescription>Compartilhe sua opinião na discussão.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePost} className="space-y-4">
                <Textarea
                  placeholder="Escreva sua postagem aqui..."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin text-accent" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Publicar Post
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default VisualizarDiscussao;
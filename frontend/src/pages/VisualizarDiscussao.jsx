import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  User,
  Clock,
  ThumbsUp,
  MessageCircle,
  ArrowLeft,
  Send,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { discussionsAPI, postsAPI } from '@/lib/api';
import { toast } from 'sonner';

// Página para visualizar uma discussão específica e suas postagens
const VisualizarDiscussao = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [discussion, setDiscussion] = useState(null);
  const [posts, setPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
          author: d.usuarios
            ? {
                id: d.usuarios.id,
                name: d.usuarios.nome,
                avatar: d.usuarios.avatar,
                role: d.usuarios.cargo,
                department: d.usuarios.departamento
              }
            : null
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
                role: p.usuarios.cargo
              }
            : null,
          content: p.conteudo,
          createdAt: p.criado_em,
          likes: p.likes || 0,
          comments: p.comments || 0,
          isLiked: p.isLiked || false
        }));
        setPosts(adaptedPosts);
      } catch (err) {
        console.error('Erro ao carregar discussão', err);
        toast.error('Erro ao carregar discussão.', { className: 'bg-red-500 text-white' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Criar nova postagem
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) {
      toast.error('Escreva algo antes de publicar');
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
              role: p.usuarios.cargo
            }
          : null,
        content: p.conteudo,
        createdAt: p.criado_em,
        likes: 0,
        comments: 0,
        isLiked: false
      };
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
    try {
      await postsAPI.like(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                isLiked: !p.isLiked,
                likes: p.isLiked ? p.likes - 1 : p.likes + 1
              }
            : p
        )
      );
    } catch (err) {
      console.error('Erro ao curtir post', err);
      toast.error('Erro ao curtir post');
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
        <p className="text-muted-foreground mb-4">{discussion.description}</p>
        <div className="flex items-center space-x-4 mb-6">
          {discussion.author && (
            <div className="flex items-center">
              <Avatar className="w-8 h-8 mr-2">
                {discussion.author.avatar ? (
                  <AvatarImage src={discussion.author.avatar} alt={discussion.author.name} />
                ) : (
                  <AvatarFallback>{discussion.author.name[0]}</AvatarFallback>
                )}
              </Avatar>
              <div>
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
                    <Avatar className="w-8 h-8 mr-3">
                      {post.author?.avatar ? (
                        <AvatarImage src={post.author.avatar} alt={post.author.name} />
                      ) : (
                        <AvatarFallback>{post.author?.name?.[0] || '?'}</AvatarFallback>
                      )}
                    </Avatar>
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
      </div>
    </div>
  );
};

export default VisualizarDiscussao;
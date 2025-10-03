import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Plus, Eye, ThumbsUp, MessageCircle, Clock, User, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api, { promptsAPI } from '@/lib/api';
import { toast } from 'sonner';
import { hasLikedPrompt, markLikedPrompt, mergeIsLikedInList } from '@/utils/likesStore';

const PromptsSimple = () => {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');

  // debounce
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // cancelamento axios
  const cancelRef = useRef(null);

  const fetchPrompts = async ({ search, category }) => {
    try {
      // cancela request anterior se houver
      if (cancelRef.current) {
        cancelRef.current.abort();
      }
      const controller = new AbortController();
      cancelRef.current = controller;

      setLoading(true);

      const params = { limit: 20 };
      if (search) params.search = search;
      if (category) params.category = category;

      // Usamos api.get direto para suportar AbortController (signal)
      const resp = await api.get('/prompts', { params, signal: controller.signal });
      const data = resp?.data?.prompts || resp?.data?.items || resp?.data || [];
      const withLocalLiked = mergeIsLikedInList(data);
      setPrompts(withLocalLiked);
    } catch (error) {
      // ignorar se foi cancelado
      if (error?.name === 'CanceledError' || error?.message === 'canceled' || error?.code === 'ERR_CANCELED') return;

      console.error('Erro ao buscar prompts:', error);
      const status = error?.response?.status;
      if (status === 429) {
        toast.error('Muitas requisições. Aguarde um instante…');
      } else {
        toast.error('Erro ao carregar prompts. Tente novamente.');
      }
      setPrompts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts({ search: debouncedSearch, category: selectedCategory });
    return () => {
      if (cancelRef.current) cancelRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedCategory]);

  const handleSearch = (value) => {
    setSearchTerm(value);
    const next = new URLSearchParams(searchParams);
    if (value) next.set('search', value);
    else next.delete('search');
    setSearchParams(next);
  };

  const handleCategoryFilter = (category) => {
    setSelectedCategory(category);
    const next = new URLSearchParams(searchParams);
    if (category) next.set('category', category);
    else next.delete('category');
    setSearchParams(next);
  };

  const handleLike = async (promptId) => {
    const target = prompts.find((p) => p.id === promptId);
    if (!target) return;

    // Se já curtiu neste navegador, não chama a API
    if (target.isLiked || hasLikedPrompt(promptId)) return;

    // UI otimista
    setPrompts((prev) =>
      prev.map((p) =>
        p.id === promptId ? { ...p, isLiked: true, likes: (Number(p.likes) || 0) + 1 } : p
      )
    );
    markLikedPrompt(promptId);

    try {
      // Tentativa silenciosa na API; caso 401/429, não redireciona nem desfaz
      await promptsAPI.like(promptId);
    } catch {
      // silencioso
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Agora mesmo';
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d atrás`;
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div className="mb-4 lg:mb-0">
            <h1 className="text-3xl font-bold text-foreground mb-2">Prompts</h1>
            <p className="text-muted-foreground">
              Explore e compartilhe prompts para uso de IA na atividade policial
            </p>
          </div>
          <Button asChild className="w-fit">
            <Link to={isAuthenticated ? "/prompts/novo" : "/login"}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Prompt
            </Link>
          </Button>
        </div>

        {/* Busca */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar prompts..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Resultados */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <span className="ml-2 text-muted-foreground">Carregando prompts...</span>
          </div>
        ) : prompts.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum prompt encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Tente ajustar os filtros ou criar um novo prompt.
            </p>
            <Button asChild>
              <Link to={isAuthenticated ? "/prompts/novo" : "/login"}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Prompt
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6">
            {prompts.map((prompt) => {
              const categoryLabel = prompt?.category ?? prompt?.categoria ?? '—';
              const views = Number(prompt?.views ?? prompt?.visualizacoes ?? 0);
              const title = prompt?.title ?? prompt?.titulo ?? 'Sem título';
              const description = prompt?.description ?? prompt?.descricao ?? '';
              const tags = Array.isArray(prompt?.tags) ? prompt.tags : [];
              const likes = Number(prompt?.likes ?? 0);
              const isLiked = !!prompt?.isLiked;
              const comments = Number(prompt?.comments ?? 0);
              const createdAt = prompt?.createdAt ?? prompt?.criado_em ?? new Date().toISOString();
              const authorName = prompt?.author?.name ?? prompt?.usuarios?.nome ?? 'Usuário';

              return (
                <Card key={prompt.id} className="hover:shadow-lg transition-all duration-300 group cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge variant="secondary">{categoryLabel}</Badge>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Eye className="h-4 w-4 mr-1" />
                            {views}
                          </div>
                        </div>

                        <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-accent transition-colors">
                          <Link to={`/prompts/${prompt.id}`}>{title}</Link>
                        </h3>

                        <p className="text-muted-foreground mb-4 line-clamp-2">
                          {description}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center mr-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{authorName}</p>
                            <p className="text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {formatTimeAgo(createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isLiked}
                          onClick={(e) => {
                            e.preventDefault();
                            handleLike(prompt.id);
                          }}
                          className={`${isLiked ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-foreground'} transition-colors`}
                        >
                          <ThumbsUp className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                          {likes}
                        </Button>

                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/prompts/${prompt.id}#comments`}>
                            <MessageCircle className="h-4 w-4 mr-1" />
                            {comments}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptsSimple;

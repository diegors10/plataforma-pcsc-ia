import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Plus, Eye, ThumbsUp, MessageCircle, Clock, User, Loader2, AlertCircle } from 'lucide-react';

import { Switch } from '@/components/ui/switch';

import { specialtiesAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { promptsAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatTimeAgo } from '@/utils/time';
import { hasLikedPrompt, markLikedPrompt, mergeIsLikedInList, getLocalLikeDelta } from '@/utils/likesStore';

const PromptsSimple = () => {
  const { isAuthenticated, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');

  const [onlyMine, setOnlyMine] = useState(() => {
    const param = searchParams.get('author');
    return !!param;
  });

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // debounce
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Helper robusto para extrair o nome do autor em diferentes formatos do backend
  const getAuthorName = (p) => {
    // Objetos aninhados comuns
    const objName =
      p?.author?.name ??
      p?.autor?.nome ?? p?.autor?.name ??
      p?.usuarios?.nome ??
      p?.user?.name ??
      p?.criado_por_nome ??
      null;

    if (typeof objName === 'string' && objName.trim()) return objName.trim();

    // Às vezes o backend envia string direta em `author`/`autor`
    if (typeof p?.author === 'string' && p.author.trim()) return p.author.trim();
    if (typeof p?.autor === 'string' && p.autor.trim()) return p.autor.trim();

    // Último recurso
    return 'Usuário';
  };

  const getInitials = (name) => {
    if (!name) return '';
    const cleaned = String(name).trim();
    // Se vier email, usa parte antes do @
    const base = cleaned.includes('@') ? cleaned.split('@')[0] : cleaned;
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${(parts[0][0] ?? '')}${(parts[1][0] ?? '')}`.toUpperCase();
  };

  // Fetch prompts
  const fetchPrompts = async ({ search, category, author }) => {
    try {
      setLoading(true);
      const params = { limit: 20 };
      if (search) params.search = search;
      if (category) params.category = category;
      if (author) params.author = author;

      const resp = await promptsAPI.getAll(params);
      const data = Array.isArray(resp?.data)
        ? resp.data
        : resp?.data?.prompts || resp?.data?.items || resp?.data || [];

      // injeta estado local de like
      const withLocalLiked = mergeIsLikedInList(data);

      // soma delta local no contador
      const withDeltaLikes = withLocalLiked.map((p) => ({
        ...p,
        likes: (Number(p.likes) || Number(p._count?.curtidas) || 0) + getLocalLikeDelta(p.id),
      }));

      setPrompts(withDeltaLikes);
    } catch (error) {
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
    fetchPrompts({
      search: debouncedSearch,
      category: selectedCategory,
      author: onlyMine && user?.id ? user.id : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedCategory, onlyMine, user?.id]);

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

  const handleOnlyMineChange = (checked) => {
    setOnlyMine(checked);
    const next = new URLSearchParams(searchParams);
    if (checked && user?.id) {
      next.set('author', user.id);
    } else {
      next.delete('author');
    }
    setSearchParams(next);
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        const resp = await specialtiesAPI.getAll({ all: true });
        const items = resp?.data?.specialties || resp?.data || [];
        const list = items.map((s) => {
          const name = s?.nome ?? s?.name ?? s?.titulo ?? '';
          const count =
            s?._count?.prompts ??
            s?.promptsCount ??
            s?.total_prompts ??
            s?.totalPrompts ??
            0;
          return { name: String(name), count: Number(count) };
        });
        const seen = new Set();
        const uniq = [];
        for (const it of list) {
          if (!it.name) continue;
          if (seen.has(it.name)) continue;
          seen.add(it.name);
          uniq.push(it);
        }
        uniq.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        setCategories(uniq);
      } catch (err) {
        console.error('Erro ao carregar categorias:', err);
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };
    loadCategories();
  }, []);

  const handleLike = async (promptId) => {
    const target = prompts.find((p) => p.id === promptId);
    if (!target) return;

    if (target.isLiked || hasLikedPrompt(promptId)) return;

    setPrompts((prev) =>
      prev.map((p) =>
        p.id === promptId ? { ...p, isLiked: true, likes: (Number(p.likes) || 0) + 1 } : p
      )
    );
    markLikedPrompt(promptId);

    try {
      await promptsAPI.like(promptId);
    } catch {
      // silencioso
    }
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

        {/* Busca e filtros rápidos */}
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

          <div className="flex flex-wrap items-center gap-2 py-3 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCategoryFilter('')}
              className={`shrink-0 ${selectedCategory === '' ? 'bg-accent/20 text-accent border-accent' : ''}`}
            >
              Todas
            </Button>
            {categoriesLoading && categories.length === 0 ? (
              <>
                <div className="h-8 w-20 bg-muted rounded-md animate-pulse shrink-0" />
                <div className="h-8 w-24 bg-muted rounded-md animate-pulse shrink-0" />
              </>
            ) : (
              (categories || []).map((cat) => {
                const label = cat?.name ?? '';
                if (!label) return null;
                const active = selectedCategory === label;
                return (
                  <Button
                    key={label}
                    variant="outline"
                    size="sm"
                    onClick={() => handleCategoryFilter(label)}
                    className={`shrink-0 ${active ? 'bg-accent/20 text-accent border-accent' : ''}`}
                  >
                    {label}
                  </Button>
                );
              })
            )}
            {user?.id && (
              <div className="flex items-center gap-2 ml-4">
                <Switch
                  id="toggle-only-mine-simple"
                  checked={onlyMine}
                  onCheckedChange={handleOnlyMineChange}
                />
                <label
                  htmlFor="toggle-only-mine-simple"
                  className="text-sm text-muted-foreground select-none"
                >
                  Meus prompts
                </label>
              </div>
            )}
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
              const likes = Number(
                (prompt?.likes ?? 0) + getLocalLikeDelta(prompt?.id)
              );
              const isLiked = !!(prompt?.isLiked || hasLikedPrompt(prompt?.id));
              const comments = Number(prompt?.comments ?? prompt?._count?.comentarios ?? 0);
              const createdAt = prompt?.createdAt ?? prompt?.criado_em ?? new Date().toISOString();

              const authorName = getAuthorName(prompt);
              const initials = getInitials(authorName);

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
                            <span className="text-sm font-medium text-accent">{initials}</span>
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

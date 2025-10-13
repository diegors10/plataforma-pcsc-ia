import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  Eye,
  ThumbsUp,
  MessageCircle,
  Clock,
  User,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { promptsAPI, specialtiesAPI } from '@/lib/api';
import {
  hasLikedPrompt,
  markLikedPrompt,
  mergeIsLikedInList,
  getLocalLikeDelta, // <-- IMPORTADO
} from '@/utils/likesStore';

import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { formatTimeAgo } from '@/utils/time';

const CATEGORIES_CACHE_KEY = 'pcsc_categories_cache';

// Normaliza o shape vindo do backend (/prompts)
// Esta função converte campos em português (ex.: titulo, descricao, categoria)
// para os nomes esperados pelo frontend (title, description, category). Também
// lida com likes/comments vindos no `_count`.
const normalizePrompt = (p) => ({
  id: p.id,
  // fallback to 'titulo' if 'title' is missing
  title: p.title ?? p.titulo ?? 'Sem título',
  description: p.description ?? p.descricao ?? '',
  category: p.category ?? p.categoria ?? '—',
  tags: Array.isArray(p.tags) ? p.tags : [],
  // some APIs return 'views', others 'visualizacoes'
  views: Number(p.views ?? p.visualizacoes ?? 0),
  likes: Number(
    p.likes ??
    (p._count ? p._count.curtidas : undefined) ??
    0
  ),
  comments: Number(
    p.comments ??
    (p._count ? p._count.comentarios : undefined) ??
    0
  ),
  createdAt: p.createdAt ?? p.criado_em ?? p.atualizado_em ?? new Date().toISOString(),
  // unify author fields (some APIs return `author`, others `autor`)
  author: p.author ??
    (p.autor ? { id: p.autor.id, name: p.autor.nome, avatar: p.autor.avatar } : undefined),
  isLiked: !!p.isLiked,
});

const Prompts = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);                // 1ª carga
  const [filtersLoading, setFiltersLoading] = useState(false); // transição de filtro

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'recent');

  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(Number(searchParams.get('page') || 1));
  const [totalPages, setTotalPages] = useState(1);

  // Categorias com cache para nunca sumirem na UI
  const [categories, setCategories] = useState(() => {
    try {
      const cached = sessionStorage.getItem(CATEGORIES_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [categoriesLoading, setCategoriesLoading] = useState(categories.length === 0);

  // Mostra somente prompts criados pelo usuário logado
  const { user } = useAuth();
  const [onlyMine, setOnlyMine] = useState(() => {
    const param = searchParams.get('author');
    return !!param;
  });

  // PROMPTS
useEffect(() => {
  let cancelled = false;
  const load = async () => {
    setFiltersLoading((prev) => (loading ? prev : true));
    try {
      const params = { page, limit: 10, sort: sortBy };
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.category = selectedCategory;
      // AJUSTE GPT: filtrar por autor quando solicitado
      if (onlyMine && user?.id) params.author = user.id;


    const response = await promptsAPI.getAll(params, { meta: { noRedirectOn401: true } });
    if (cancelled) return;

     // Aceita tanto { prompts: [...] } quanto um array direto [...]
    const raw = Array.isArray(response?.data)
       ? response.data
       : (response?.data?.prompts || []);

     const normalized = (raw || []).map(normalizePrompt);
     const withLocalLiked = mergeIsLikedInList(normalized);
     // soma o delta local de likes ao contador vindo do servidor
     const withDeltaLikes = withLocalLiked.map((p) => ({
       ...p,
       likes: (Number(p.likes) || 0) + getLocalLikeDelta(p.id),
     }));
     setPrompts(withDeltaLikes);
     setTotalPages(
       Array.isArray(response?.data) ? 1 : (response?.data?.pagination?.pages || 1)
     );
    } catch (err) {
     console.error('Erro ao buscar /prompts:', err?.response?.status, err?.response?.data || err?.message);
      if (cancelled) return;
      setPrompts([]);
      setTotalPages(1);
    } finally {
      if (cancelled) return;
      setLoading(false);
      setFiltersLoading(false);
    }
  };
  load();
  return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedCategory, sortBy, page, onlyMine, user]);


  // CATEGORIAS (cacheadas)
  useEffect(() => {
    let cancelled = false;
    const loadCategories = async () => {
      if (categories.length > 0) {
        setCategoriesLoading(false);
        return;
      }
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
          return { name: String(name || ''), count: Number(count || 0) };
        });

        const seen = new Set();
        const unique = [];
        for (const it of list) {
          if (!it.name) continue;
          if (seen.has(it.name)) continue;
          seen.add(it.name);
          unique.push(it);
        }
        unique.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

        if (!cancelled) {
          setCategories(unique);
          try {
            sessionStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(unique));
          } catch {}
        }
      } catch (_err) {
        if (!cancelled) setCategories([]);
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    };
    loadCategories();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (normalizePrompt is declared above)


  const updateSearchParams = (params) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([key, value]) => {
      if (value || value === 0) newParams.set(key, value);
      else newParams.delete(key);
    });
    setSearchParams(newParams, { replace: true });
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setPage(1);
    updateSearchParams({ search: value, page: 1 });
  };

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    setPage(1);
    updateSearchParams({ category: value, page: 1 });
  };

  const handleSortChange = (value) => {
    setSortBy(value);
    setPage(1);
    updateSearchParams({ sort: value, page: 1 });
  };

  const handleLike = async (promptId) => {
    const target = prompts.find((p) => p.id === promptId);
    if (!target) return;
    if (target.isLiked || hasLikedPrompt(promptId)) return;

    // UI otimista
    setPrompts((prev) =>
      prev.map((p) =>
        p.id === promptId
          ? { ...p, isLiked: true, likes: (Number(p.likes) || 0) + 1 }
          : p
      )
    );
    markLikedPrompt(promptId);

    try {
      await promptsAPI.like(promptId, { meta: { noRedirectOn401: true } });
    } catch {
      // silencioso
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSortBy('recent');
    setPage(1);
    setSearchParams({}, { replace: true });
  };

  const handleOnlyMineChange = (checked) => {
    setOnlyMine(checked);
    setPage(1);
    if (checked && user?.id) {
      updateSearchParams({ author: user.id, page: 1 });
    } else {
      // remove author param
      updateSearchParams({ author: '', page: 1 });
    }
  };

  // formatTimeAgo é importado de '@/utils/time' e já lida com pluralização e datas inválidas.

  const PromptSkeleton = () => (
    <Card className="animate-pulse">
      <CardContent className="p-6 space-y-4">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-6 w-2/3 bg-muted rounded" />
        <div className="h-4 w-full bg-muted rounded" />
        <div className="h-4 w-5/6 bg-muted rounded" />
        <div className="flex justify-between">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
      </CardContent>
    </Card>
  );

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
            <Link to="/prompts/novo">
              <Plus className="h-4 w-4 mr-2" />
              Novo Prompt
            </Link>
          </Button>
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Linha 1 */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Busca */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar prompts..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Selects (desktop) */}
            <div className="hidden lg:flex items-center gap-4">
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Especialidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as especialidades</SelectItem>
                  {(categories || []).map((category) => {
                    const label = category?.name ? String(category.name) : '';
                    const count =
                      typeof category?.count === 'number' ? category.count : undefined;
                    if (!label) return null;
                    return (
                      <SelectItem key={label} value={label}>
                        {label} {typeof count === 'number' ? `(${count})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Mais recentes</SelectItem>
                  <SelectItem value="popular">Mais curtidos</SelectItem>
                  <SelectItem value="views">Mais visualizados</SelectItem>
                </SelectContent>
              </Select>

              {(searchTerm || selectedCategory || sortBy !== 'recent') && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              )}
            </div>

            {/* Filtros Mobile */}
            <div className="lg:hidden">
              <Sheet open={showFilters} onOpenChange={setShowFilters}>
                <SheetTrigger asChild>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filtros</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-6 mt-6">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Especialidade</label>
                      <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas as especialidades" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todas as especialidades</SelectItem>
                          {(categories || []).map((category) => {
                            const label = category?.name ? String(category.name) : '';
                            const count =
                              typeof category?.count === 'number' ? category.count : undefined;
                            if (!label) return null;
                            return (
                              <SelectItem key={label} value={label}>
                                {label} {typeof count === 'number' ? `(${count})` : ''}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Ordenar por</label>
                      <Select value={sortBy} onValueChange={handleSortChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recent">Mais recentes</SelectItem>
                          <SelectItem value="popular">Mais curtidos</SelectItem>
                          <SelectItem value="views">Mais visualizados</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filtro "Meus prompts" no modal mobile */}
                    {user?.id && (
                      <div className="flex items-center space-x-3">
                        <Switch
                          id="mobile-toggle-mine"
                          checked={onlyMine}
                          onCheckedChange={handleOnlyMineChange}
                        />
                        <label
                          htmlFor="mobile-toggle-mine"
                          className="text-sm text-muted-foreground select-none"
                        >
                          Meus prompts
                        </label>
                      </div>
                    )}

                    {(searchTerm || selectedCategory || sortBy !== 'recent') && (
                      <Button variant="outline" onClick={clearFilters} className="w-full">
                        <X className="h-4 w-4 mr-2" />
                        Limpar Filtros
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Linha 2: Chips de categorias (sempre visíveis) e filtro "Meus prompts" */}
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <Button
              variant={selectedCategory === '' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => handleCategoryChange('')}
              className="shrink-0"
            >
              Todas
            </Button>

            {categoriesLoading && categories.length === 0 ? (
              <>
                <div className="h-8 w-24 bg-muted rounded-md animate-pulse shrink-0" />
                <div className="h-8 w-28 bg-muted rounded-md animate-pulse shrink-0" />
                <div className="h-8 w-20 bg-muted rounded-md animate-pulse shrink-0" />
              </>
            ) : (
              (categories || []).map((category) => {
                const label = category?.name ? String(category.name) : '';
                if (!label) return null;
                const active = selectedCategory === label;
                return (
                  <Button
                    key={label}
                    variant={active ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => handleCategoryChange(label)}
                    className="shrink-0"
                  >
                    {label}
                  </Button>
                );
              })
            )}

            {/* Filtro "Meus prompts" */}
            {user?.id && (
              <div className="flex items-center gap-2 ml-4">
                <Switch
                  id="toggle-only-mine"
                  checked={onlyMine}
                  onCheckedChange={handleOnlyMineChange}
                />
                <label
                  htmlFor="toggle-only-mine"
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
          <div className="space-y-4">
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
              <span className="ml-2 text-muted-foreground">Carregando prompts...</span>
            </div>
            <div className="grid gap-6 mb-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <PromptSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : (prompts || []).length === 0 && !filtersLoading ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum prompt encontrado</h3>
            <p className="text-muted-foreground">
              Tente ajustar os filtros ou criar um novo prompt.
            </p>
            <Button asChild>
              <Link to="/prompts/novo">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Prompt
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* barra de transição durante filtro */}
            {filtersLoading && (
              <div className="mb-4">
                <div className="h-1 w-full bg-muted overflow-hidden rounded">
                  <div className="h-full w-1/3 bg-foreground animate-[loadingBar_1s_linear_infinite]" />
                </div>
                <style>{`
                  @keyframes loadingBar {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(300%); }
                  }
                `}</style>
              </div>
            )}

            <div className="grid gap-6 mb-8">
              {filtersLoading
                ? Array.from({ length: 3 }).map((_, i) => <PromptSkeleton key={`sk-${i}`} />)
                : (prompts || []).map((prompt) => {
                    const categoryLabel = prompt?.category ?? prompt?.categoria ?? '—';
                    const views = Number(prompt?.views ?? prompt?.visualizacoes ?? 0);
                    const title = prompt?.title ?? prompt?.titulo ?? 'Sem título';
                    const description = prompt?.description ?? prompt?.descricao ?? '';
                    const tags = Array.isArray(prompt?.tags) ? prompt.tags : [];

                    // >>> likes com delta local persistente
                    const likesServer = Number(prompt?.likes ?? 0);
                    const likes = likesServer + getLocalLikeDelta(prompt.id);

                    const isLiked = !!(prompt?.isLiked || hasLikedPrompt(prompt.id));
                    const comments = Number(prompt?.comments ?? 0);
                    const createdAt = prompt?.createdAt ?? prompt?.criado_em ?? new Date().toISOString();
                    // Combine possible fields for author name: prefer `author.name`, fallback to
                    // `usuarios.nome` or `autor.nome`, and then default to 'Usuário'.
                    const authorName = prompt?.author?.name ?? prompt?.usuarios?.nome ?? prompt?.autor?.nome ?? 'Usuário';

                    return (
                      <Card key={prompt.id} className="hover:shadow-lg transition-all duration-300 group">
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
                                  <p className="text-sm font-medium text-foreground">
                                    {authorName}
                                  </p>
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
                                onClick={() => handleLike(prompt.id)}
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

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex justify-center">
                <div className="flex items-center space-x-2">
                  <Button variant="outline" disabled={page === 1} onClick={() => {
                    setPage(page - 1);
                    updateSearchParams({ page: page - 1 });
                  }}>
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </span>
                  <Button variant="outline" disabled={page === totalPages} onClick={() => {
                    setPage(page + 1);
                    updateSearchParams({ page: page + 1 });
                  }}>
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Prompts;

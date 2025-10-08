import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { hasLikedPrompt, markLikedPrompt, getLocalLikeDelta } from '@/utils/likesStore';
import { formatTimeAgo } from '@/utils/time';
import {
  Loader2,
  ArrowLeft,
  Eye,
  MessageCircle,
  ThumbsUp,
  Clock,
  User,
  Tag,
  Share2,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { promptsAPI, authAPI } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import CommentsSection from '@/components/CommentsSection';

const toArray = (val) => (Array.isArray(val) ? val : (val ? [val] : []));
const safeNumber = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const safeString = (v, d = '') => (v !== null && v !== undefined ? String(v) : d);

function normalizePrompt(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const id = raw.id ?? raw.prompt_id ?? raw.promptId;

  const titulo = safeString(raw.titulo ?? raw.title, 'Sem título');
  const descricao = safeString(raw.descricao ?? raw.description, '');
  const conteudo = safeString(raw.conteudo ?? raw.content, '');

  const categoria = safeString(
    raw.categoria ?? raw.category ?? raw.especialidade ?? raw.specialty,
    ''
  );

  const visualizacoes = safeNumber(raw.visualizacoes ?? raw.views, 0);
  const criadoEm =
    raw.criado_em ?? raw.createdAt ?? raw.created_at ?? new Date().toISOString();
  const atualizadoEm =
    raw.atualizado_em ?? raw.updatedAt ?? raw.updated_at ?? criadoEm;

  const autor = {
    id: raw.autor_id ?? raw.author_id ?? raw.author?.id,
    nome: safeString(raw.autor_nome ?? raw.author?.name ?? raw.usuarios?.nome, 'Usuário'),
    avatar: raw.autor_avatar ?? raw.author?.avatar ?? raw.usuarios?.avatar ?? null,
    cargo: safeString(raw.author?.role ?? raw.usuarios?.cargo, '')
  };

  let tags = raw.tags;
  if (typeof tags === 'string') {
    try {
      tags = JSON.parse(tags);
    } catch {
      tags = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }
  tags = toArray(tags).map((t) => safeString(t)).filter(Boolean);

  const likesCount = safeNumber(
    raw.likes ?? raw._aggr_count_curtidas ?? raw.curtidas_count ?? raw._count?.curtidas,
    0
  );
  const commentsCount = safeNumber(
    raw.comments ??
      raw._aggr_count_comentarios ??
      raw.comentarios_count ??
      raw._count?.comentarios,
    0
  );

  const comentarios = toArray(raw.comentarios ?? raw.comments).map((c) => ({
    id: c?.id ?? c?.comment_id ?? Math.random().toString(36).slice(2),
    autor: {
      id: c?.autor_id ?? c?.user_id ?? c?.author?.id,
      nome: safeString(c?.autor_nome ?? c?.author?.name ?? c?.usuario?.nome ?? 'Usuário'),
      avatar: c?.autor_avatar ?? c?.author?.avatar ?? c?.usuario?.avatar ?? null
    },
    conteudo: safeString(c?.conteudo ?? c?.content ?? c?.texto, ''),
    criadoEm: c?.criado_em ?? c?.created_at ?? c?.createdAt ?? new Date().toISOString()
  }));

  return {
    id,
    titulo,
    descricao,
    conteudo,
    categoria,
    visualizacoes,
    criadoEm,
    atualizadoEm,
    autor,
    tags,
    likesCount,
    commentsCount,
    comentarios
  };
}

function normalizeRelated(list) {
  return toArray(list).map((r) => {
    const n = normalizePrompt(r);
    if (n) return n;
    return {
      id: r?.id ?? Math.random().toString(36).slice(2),
      titulo: safeString(r?.titulo ?? r?.title, 'Sem título'),
      descricao: safeString(r?.descricao ?? r?.description, ''),
      categoria: safeString(r?.categoria ?? r?.category, ''),
      visualizacoes: safeNumber(r?.visualizacoes ?? r?.views, 0)
    };
  });
}

const VisualizarPrompt = () => {
  const { id } = useParams();
  const promptId = Number(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [error, setError] = useState(null);

  const [prompt, setPrompt] = useState(null);
  const [relacionados, setRelacionados] = useState([]);
  const [liking, setLiking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);
  const [sharing, setSharing] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);

  // Ref para evitar chamadas duplicadas no modo Strict do React
  const fetchedRef = useRef(false);

  const applyLocalLikeState = (normalized) => {
    const delta = getLocalLikeDelta(normalized.id); // 0 ou 1 no nosso caso
    const alreadyLiked = hasLikedPrompt(normalized.id);
    return {
      ...normalized,
      likesCount: safeNumber(normalized.likesCount, 0) + safeNumber(delta, 0),
      isLiked: alreadyLiked
    };
  };

  const fetchPrompt = async (pid) => {
    setError(null);
    try {
      const resp = await promptsAPI.getById(pid);
      const raw = resp?.data;
      const data = raw?.prompt ?? raw;

      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        setError('Prompt não encontrado.');
        setPrompt(null);
        return;
      }

      const normalized = normalizePrompt(data);
      setPrompt(applyLocalLikeState(normalized));

      // Buscar prompts relacionados separadamente
      try {
        const relatedResp = await promptsAPI.getRelated(pid);
        const relatedData = relatedResp?.data?.prompts || [];
        setRelacionados(normalizeRelated(relatedData));
      } catch (relatedErr) {
        console.error('Erro ao buscar prompts relacionados:', relatedErr);
        setRelacionados([]);
      }
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar o prompt.');
    } finally {
      setLoading(false);
      setTransitionLoading(false);
    }
  };

  const fetchMe = async () => {
    try {
      // versão que não redireciona em 401 (garanta no api.js)
      const me = await (authAPI.getMeOptional ? authAPI.getMeOptional() : authAPI.getMe());
      const user = me?.data || null;
      setCurrentUser(user);
    } catch {
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    setLoading(true);
    if (!Number.isFinite(promptId)) {
      setError('ID inválido');
      setLoading(false);
      return;
    }
    // Em ambientes de desenvolvimento com React Strict Mode, useEffect pode disparar duas vezes.
    // Usamos uma ref para garantir que a busca seja feita apenas uma vez.
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchPrompt(promptId);
      fetchMe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptId]);

  const handleLike = async () => {
    if (!prompt || liking) return;

    // se já curtiu neste navegador, não chama API e mantém contagem como está
    if (prompt.isLiked || hasLikedPrompt(prompt.id)) return;

    // UI otimista + persistência local
    setLiking(true);
    setPrompt((prev) =>
      prev ? { ...prev, likesCount: safeNumber(prev.likesCount, 0) + 1, isLiked: true } : prev
    );
    markLikedPrompt(prompt.id);

    try {
      // tenta no servidor, mas qualquer erro é silencioso
      await promptsAPI.like(prompt.id);
    } catch {
      // não desfazer localmente
    } finally {
      setLiking(false);
    }
  };

  const handleShare = async () => {
    if (!prompt) return;
    try {
      setSharing(true);
      const url = window.location.href;
      if (navigator.share) {
        await navigator.share({ title: prompt.titulo, text: prompt.descricao, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }
    } catch {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } finally {
      setSharing(false);
    }
  };

  const handleCopyContent = async () => {
    if (!prompt?.conteudo) return;
    try {
      await navigator.clipboard.writeText(prompt.conteudo);
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 1200);
      toast.success('Conteúdo copiado!');
    } catch {
      toast.error('Não foi possível copiar o conteúdo.');
    }
  };

  // Removemos a função local de formatação de tempo. Em vez disso, utilizamos o util compartilhado.

  const ContentSkeleton = () => (
    <div className="space-y-3 animate-pulse">
      <div className="h-5 w-1/3 bg-muted rounded" />
      <div className="h-7 w-2/3 bg-muted rounded" />
      <div className="h-4 w-full bg-muted rounded" />
      <div className="h-4 w-11/12 bg-muted rounded" />
      <div className="h-4 w-10/12 bg-muted rounded" />
      <div className="h-64 w-full bg-muted rounded" />
    </div>
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <ContentSkeleton />
      </div>
    );
  }

  if (error || !prompt) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{error || 'Prompt não encontrado.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tags = prompt.tags || [];
  const comentarios = prompt.comentarios || [];
  const canEdit =
    currentUser?.id && prompt.autor?.id && String(currentUser.id) === String(prompt.autor.id);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Barra superior */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          {prompt.categoria && <Badge variant="secondary">{prompt.categoria}</Badge>}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center">
            <Eye className="h-4 w-4 mr-1" />
            {prompt.visualizacoes}
          </Badge>
          <Badge variant="outline" className="flex items-center">
            <MessageCircle className="h-4 w-4 mr-1" />
            {prompt.commentsCount}
          </Badge>
        </div>
      </div>

      {/* Card único */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          {/* Autor acima do título */}
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mr-3">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-medium">
                {prompt.autor?.nome || 'Usuário'}
              </div>
              <div className="text-xs text-muted-foreground">
                {prompt.autor?.cargo || 'Autor'}
              </div>
            </div>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl">{prompt.titulo}</CardTitle>
              {prompt.descricao && (
                <CardDescription className="mt-1">{prompt.descricao}</CardDescription>
              )}
            </div>

            {canEdit && (
              <Button asChild size="sm">
                <Link to={`/prompts/${prompt.id}/editar`}>Editar</Link>
              </Button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center">
              <Clock className="inline h-3 w-3 mr-1" />
              Criado: {formatTimeAgo(prompt.criadoEm)}
            </span>
            {prompt.atualizadoEm && (
              <span className="flex items-center">
                <Clock className="inline h-3 w-3 mr-1" />
                Atualizado: {formatTimeAgo(prompt.atualizadoEm)}
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Ações rápidas */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyContent}>
              {copiedContent ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar conteúdo
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare} disabled={sharing}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Link copiado
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartilhar
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => window.print()}
            >
              Imprimir
            </Button>
          </div>

          {/* Conteúdo */}
          <div className="rounded-lg border bg-background p-4">
            <div className="whitespace-pre-wrap text-sm leading-6">{prompt.conteudo}</div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center mb-2 text-sm text-muted-foreground">
                <Tag className="h-4 w-4 mr-2" /> Tags
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Curtir */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground">
              {prompt.likesCount} {prompt.likesCount === 1 ? 'curtida' : 'curtidas'}
            </div>
            <Button
              variant="default"
              onClick={handleLike}
              disabled={liking || hasLikedPrompt(prompt.id) || prompt.isLiked}
              className="flex items-center"
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              {hasLikedPrompt(prompt.id) || prompt.isLiked ? 'Já curtido' : 'Curtir'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comentários */}
      <div className="mb-6">
        <CommentsSection promptId={prompt.id} />
      </div>

      {/* Relacionados */}
      <Card>
        <CardHeader>
          <CardTitle>Relacionados</CardTitle>
          <CardDescription>Outros prompts que podem interessar</CardDescription>
        </CardHeader>
        <CardContent>
          {(relacionados || []).length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum item relacionado.</div>
          ) : (
            <div className="grid gap-4">
              {(relacionados || []).map((r) => (
                <Link
                  key={r.id}
                  to={`/prompts/${r.id}`}
                  onClick={() => setTransitionLoading(true)}
                  className="block"
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{r.titulo}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {r.descricao}
                          </div>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Eye className="h-4 w-4 mr-1" />
                          {safeNumber(r.visualizacoes, 0)}
                        </div>
                      </div>
                      {r.categoria && (
                        <div className="mt-2">
                          <Badge variant="secondary">{r.categoria}</Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {transitionLoading && (
        <div className="fixed left-0 right-0 bottom-0 h-1 bg-muted overflow-hidden">
          <div className="h-full w-1/3 bg-foreground animate-[loadingBar_1s_linear_infinite]" />
          <style>{`
            @keyframes loadingBar {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(300%); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default VisualizarPrompt;

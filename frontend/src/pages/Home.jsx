import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  Brain, 
  Shield, 
  Users, 
  TrendingUp,
  Lightbulb,
  Clock,
  Eye,
  MessageCircle,
  ThumbsUp,
  Globe,
  BookOpen,
  Plus,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import backgroundImage from '@/assets/ia_policial_background.png';
import { promptsAPI, statsAPI } from '@/lib/api';
import { formatTimeAgo } from '@/utils/time';
import { useAuth } from '@/contexts/AuthContext';
import CategoriesCarousel from '@/components/CategoriesCarousel';

const Home = () => {
  const [featuredPrompts, setFeaturedPrompts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({ totalPrompts: 0, totalUsers: 0 });
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const { isAuthenticated } = useAuth();
  const ran = useRef(false); // evita chamadas duplicadas (Strict Mode)
  const navigate = useNavigate();

  // Navegar para /prompts com o filtro de categoria aplicado
  const handleCategoryClick = (category) => {
    const name =
      (typeof category === 'string' && category) ||
      category?.slug ||
      category?.nome ||
      category?.name ||
      category?.titulo ||
      '';
    const count =
      typeof category === 'object'
        ? Number(
            category?.totalPrompts ??
              category?.promptsCount ??
              category?._count?.prompts ??
              category?.total_prompts ??
              category?.count ??
              0
          )
        : undefined;

    if (!name) return;
    if (typeof count === 'number' && count <= 0) return;

    const qs = new URLSearchParams();
    qs.set('category', name);
    navigate(`/prompts?${qs.toString()}`);
  };

  // Monta URL de prompts com filtros (categoria e/ou busca) a partir de um payload de prompt
  const buildPromptsURLWithFilters = (payload) => {
    const qs = new URLSearchParams();
    const category =
      payload?.categoria ??
      payload?.category ??
      payload?.especialidade ??
      payload?.specialty ??
      payload?.prompt?.categoria ??
      payload?.prompt?.category ??
      '';
    const title =
      payload?.titulo ??
      payload?.title ??
      payload?.prompt?.titulo ??
      payload?.prompt?.title ??
      '';

    if (category) qs.set('category', String(category));
    if (title) qs.set('search', String(title));

    // fallback: se não houve nenhum filtro identificável, retorna a listagem simples
    return qs.toString() ? `/prompts?${qs.toString()}` : '/prompts';
  };

  // Resolve a URL de navegação para cada atividade recente
  const resolveActivityLink = (act) => {
    const pid = act?.promptId ?? act?.prompt_id ?? act?.prompt?.id;
    const did = act?.discussionId ?? act?.discussao_id ?? act?.discussion?.id ?? act?.discussao?.id;
    const postId = act?.postId ?? act?.post_id ?? act?.post?.id;

    switch (act?.type) {
      case 'prompt':
        // Para criação de prompt, ir para a página de prompts já com filtros do prompt clicado
        return buildPromptsURLWithFilters(act);
      case 'comment':
        if (pid) return `/prompts/${pid}#comments`;
        if (did && postId) return `/discussoes/${did}#post-${postId}`;
        if (did) return `/discussoes/${did}#comments`;
        return '/prompts';
      case 'discussion':
        return did ? `/discussoes/${did}` : '/discussoes';
      case 'post':
        if (did && postId) return `/discussoes/${did}#post-${postId}`;
        if (did) return `/discussoes/${did}`;
        return '/discussoes';
      default:
        if (pid) return `/prompts/${pid}`;
        if (did) return `/discussoes/${did}`;
        return '/prompts';
    }
  };

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const dashboardRes = await statsAPI.getDashboard();
        const dashboardData = dashboardRes?.data ?? {};

        setStats({
          totalPrompts: Number(dashboardData.totalPrompts ?? dashboardData.totals?.prompts ?? 0),
          totalUsers: Number(dashboardData.totalActiveUsers ?? dashboardData.totals?.activeUsers ?? 0),
        });

        setCategories(Array.isArray(dashboardData.categories) ? dashboardData.categories : []);

        // Prompts em destaque
        try {
          const respPopular = await promptsAPI.getAll({ page: 1, limit: 3, sort: 'popular' }, { meta: { noRedirectOn401: true } });
          const popularList = Array.isArray(respPopular?.data?.prompts)
            ? respPopular.data.prompts
            : Array.isArray(respPopular?.data) ? respPopular.data : [];
          let list = (popularList || []).map((p) => ({
            id: p.id,
            title: p.titulo ?? p.title ?? '—',
            description: p.descricao ?? p.description ?? '',
            author: { name: p.autor?.nome ?? p.author?.name ?? 'Usuário' },
            views: Number(p.visualizacoes ?? p.views ?? 0),
            likes: Number(p._count?.curtidas ?? p.likes ?? 0),
            comments: Number(p._count?.comentarios ?? p.comments ?? 0),
            category: p.categoria ?? p.category ?? '—',
          }));
          const totalLikes = list.reduce((sum, it) => sum + (Number(it.likes) || 0), 0);
          if (totalLikes === 0) {
            const respViews = await promptsAPI.getAll({ page: 1, limit: 3, sort: 'views' }, { meta: { noRedirectOn401: true } });
            const viewsList = Array.isArray(respViews?.data?.prompts)
              ? respViews.data.prompts
              : Array.isArray(respViews?.data) ? respViews.data : [];
            list = (viewsList || []).map((p) => ({
              id: p.id,
              title: p.titulo ?? p.title ?? '—',
              description: p.descricao ?? p.description ?? '',
              author: { name: p.autor?.nome ?? p.author?.name ?? 'Usuário' },
              views: Number(p.visualizacoes ?? p.views ?? 0),
              likes: Number(p._count?.curtidas ?? p.likes ?? 0),
              comments: Number(p._count?.comentarios ?? p.comments ?? 0),
              category: p.categoria ?? p.category ?? '—',
            }));
          }
          setFeaturedPrompts(list);
        } catch (e) {
          console.error('Erro ao carregar prompts em destaque:', e);
          setFeaturedPrompts([]);
        }

        // Atividades recentes
        const activitiesRaw = Array.isArray(dashboardData.recentActivities)
          ? dashboardData.recentActivities
          : [];
        const adaptedActivities = activitiesRaw
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 4)
          .map((act) => {
            const userName = act.user?.nome ?? act.user?.name ?? 'Usuário';
            let action;
            let item;
            if (act.type === 'prompt') {
              action = 'criou o prompt';
              item = act.title ?? 'Prompt';
            } else if (act.type === 'comment') {
              action = 'comentou';
              item = act.content ? act.content.slice(0, 30) + '…' : 'comentário';
            } else if (act.type === 'discussion') {
              action = 'abriu uma discussão';
              item = act.title ?? 'Discussão';
            } else if (act.type === 'post') {
              action = 'respondeu na discussão';
              item = act.title ?? act.content?.slice(0, 30) + '…' ?? 'Post';
            } else {
              action = 'realizou uma atividade em';
              item = act.title ?? act.content ?? 'item';
            }
            return {
              user: userName,
              action,
              item,
              time: new Date(act.createdAt),
              timeLabel: formatTimeAgo(act.createdAt),
              type: act.type,
              // preserva o payload para resolver o link depois
              payload: act
            };
          });
        setRecentActivities(adaptedActivities);
      } catch (err) {
        console.error('Erro ao carregar dados da página inicial', err);
        setStats({ totalPrompts: 0, totalUsers: 0 });
        setCategories([]);
        setRecentActivities([]);
        setFeaturedPrompts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Banner Principal */}
      <section 
        className="relative bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-20 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(26, 26, 26, 0.85), rgba(26, 26, 26, 0.85)), url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6 text-white drop-shadow-lg">
              PCSC-IA
            </h1>
            <p className="text-xl mb-4 text-white/90 drop-shadow-md">
              Plataforma Colaborativa de Inteligência Artificial
            </p>
            <p className="text-lg mb-8 text-white/80 max-w-3xl mx-auto drop-shadow-md">
              Compartilhe conhecimento, prompts e boas práticas para o uso ético e eficaz da 
              Inteligência Artificial na atividade policial de Santa Catarina.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg">
                <Link to="/prompts">
                  Explorar Prompts
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild  size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg">
                <Link to={isAuthenticated ? "/prompts/novo" : "/login"}>
                  <Plus className="mr-2 h-5 w-5" />
                  Compartilhar Prompt
                </Link>
              </Button>
            </div>
          </div>
        </div>
        {/* Overlay decorativo */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent pointer-events-none"></div>
      </section>

      {/* Introdução */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">
                Revolucionando a Segurança Pública com IA
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                A PCSC-IA é uma plataforma inovadora que conecta policiais civis de Santa Catarina 
                para compartilhar conhecimento sobre o uso de Inteligência Artificial na atividade policial.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-accent">{stats.totalPrompts}+</div>
                  <div className="text-muted-foreground">Prompts Compartilhados</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-accent">{stats.totalUsers}+</div>
                  <div className="text-muted-foreground">Policiais Ativos</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-yellow-500/20 transition-colors duration-300">
                    <Brain className="h-6 w-6 text-yellow-500 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <h3 className="font-semibold mb-2 text-foreground">IA Aplicada</h3>
                  <p className="text-sm text-muted-foreground">Prompts práticos para investigações</p>
                </CardContent>
              </Card>
              <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-yellow-500/20 transition-colors duration-300">
                    <Shield className="h-6 w-6 text-yellow-500 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <h3 className="font-semibold mb-2 text-foreground">Ética</h3>
                  <p className="text-sm text-muted-foreground">Uso responsável da tecnologia</p>
                </CardContent>
              </Card>
              <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-yellow-500/20 transition-colors duration-300">
                    <Users className="h-6 w-6 text-yellow-500 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <h3 className="font-semibold mb-2 text-foreground">Colaboração</h3>
                  <p className="text-sm text-muted-foreground">Compartilhamento de conhecimento</p>
                </CardContent>
              </Card>
              <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-yellow-500/20 transition-colors duration-300">
                    <Lightbulb className="h-6 w-6 text-yellow-500 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <h3 className="font-semibold mb-2 text-foreground">Inovação</h3>
                  <p className="text-sm text-muted-foreground">Métodos modernos de investigação</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Prompts em Destaque */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Prompts em Destaque</h2>
            <p className="text-lg text-muted-foreground">Os prompts mais úteis e bem avaliados pela comunidade</p>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded mb-4"></div>
                    <div className="h-6 bg-muted rounded mb-3"></div>
                    <div className="h-16 bg-muted rounded mb-4"></div>
                    <div className="flex justify-between">
                      <div className="h-4 bg-muted rounded w-24"></div>
                      <div className="h-4 bg-muted rounded w-16"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredPrompts.map((prompt) => (
                <Card key={prompt.id} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-l-4 border-l-accent">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                        {prompt.category}
                      </Badge>
                      <div className="flex items-center text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                        <Eye className="h-3 w-3 mr-1" />
                        {prompt.views}
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-accent transition-colors duration-300">
                      <Link 
                        to={`/prompts/${prompt.id}`}
                        className="flex items-center"
                      >
                        {prompt.title}
                        <ArrowRight className="h-4 w-4 ml-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-0 group-hover:translate-x-1" />
                      </Link>
                    </h3>
                    
                    <p className="text-muted-foreground mb-4 line-clamp-3">
                      {prompt.description}
                    </p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <span className="text-sm text-muted-foreground flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        {prompt.author?.name || prompt.author}
                      </span>
                      <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                        <div className="flex items-center hover:text-accent transition-colors ">
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          {prompt.likes}
                        </div>
                        <div className="flex items-center hover:text-accent transition-colors ">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          {prompt.comments}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          <div className="text-center mt-12">
            <Button asChild size="lg">
              <Link to="/prompts">
                Ver Todos os Prompts
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Categorias de Prompts</h2>
            <p className="text-lg text-muted-foreground">Explore prompts organizados por área de atuação</p>
          </div>
          
          <CategoriesCarousel
            categories={categories}
            onCategoryClick={handleCategoryClick}
            onSelect={handleCategoryClick}
          />
        </div>
      </section>

      {/* Atividades Recentes (com links e seta) */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-foreground mb-8">Atividades Recentes</h2>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => {
                  const url = resolveActivityLink(activity.payload || {});
                  const content = (
                    <>
                      <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center group-hover:bg-accent/20 transition-colors duration-300">
                        {(() => {
                          const name = activity.user || '';
                          const parts = name.split(' ').filter(Boolean);
                          const initials = parts.length <= 1
                            ? name.substring(0, 2)
                            : parts.slice(0, 2).map((p) => p[0]).join('');
                          return (
                            <span className="text-accent font-semibold text-sm group-hover:scale-110 transition-transform duration-300">
                              {initials.toUpperCase()}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="flex-1">
                        <p className="text-foreground">
                          <span className="font-medium text-accent">{activity.user}</span> {activity.action}{' '}
                          <span className="font-medium text-foreground group-hover:text-accent transition-colors cursor-pointer">{activity.item}</span>
                        </p>
                        <div className="flex items-center mt-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {activity.timeLabel}
                        </div>
                      </div>
                    </>
                  );

                  return (
                    <Card key={index} className="group hover:shadow-md transition-all duration-300 hover:border-accent/20">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-4">
                          {/* Clique no texto leva para a página referente */}
                          <Link to={url} className="flex items-start space-x-4 flex-1 no-underline">
                            {content}
                          </Link>

                          {/* Ícone seta -> alinhado à direita, mesmo link */}
                          <Link
                            to={url}
                            aria-label="Abrir item"
                            className="self-center text-muted-foreground hover:text-accent transition-colors"
                          >
                            <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-8">Links Úteis</h2>
              <div className="space-y-4">
                <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-yellow-500">
                  <CardContent className="p-4">
                    <Link to="/boas-praticas" className="flex items-center">
                      <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center mr-3 group-hover:bg-yellow-500/20 transition-colors duration-300">
                        <BookOpen className="h-5 w-5 text-yellow-500 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground group-hover:text-yellow-500 transition-colors duration-300">Boas Práticas</h3>
                        <p className="text-sm text-muted-foreground">Guias para uso ético da IA</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-yellow-500 group-hover:translate-x-1 transition-all duration-300" />
                    </Link>
                  </CardContent>
                </Card>
                
                <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-yellow-500">
                  <CardContent className="p-4">
                    <Link to="/discussoes" className="flex items-center">
                      <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center mr-3 group-hover:bg-yellow-500/20 transition-colors duration-300">
                        <MessageCircle className="h-5 w-5 text-yellow-500 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground group-hover:text-yellow-500 transition-colors duration-300">Fórum de Discussões</h3>
                        <p className="text-sm text-muted-foreground">Participe das conversas</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-yellow-500 group-hover:translate-x-1 transition-all duration-300" />
                    </Link>
                  </CardContent>
                </Card>
                
                <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-yellow-500">
                  <CardContent className="p-4">
                    <Link to="/sobre" className="flex items-center">
                      <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center mr-3 group-hover:bg-yellow-500/20 transition-colors duration-300">
                        <Globe className="h-5 w-5 text-yellow-500 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground group-hover:text-yellow-500 transition-colors duração-300">Sobre o Projeto</h3>
                        <p className="text-sm text-muted-foreground">Conheça nossa missão</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-yellow-500 group-hover:translate-x-1 transition-all duração-300" />
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

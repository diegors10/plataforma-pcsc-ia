import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Brain, 
  FileText, 
  Shield, 
  Search, 
  Users, 
  TrendingUp,
  Clock,
  Eye,
  MessageCircle,
  ThumbsUp,
  Database,
  Gavel,
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

  const categoryIcons = {
    'Investigação Digital': Database,
    'Análise Criminal': Search,
    'Documentação': FileText,
    'Direito Penal': Gavel,
    'Segurança Pública': Shield,
    'Inteligência': Brain,
    'Perícia': BookOpen
  };

  const categoryColors = {
    'Investigação Digital': 'bg-blue-500',
    'Análise Criminal': 'bg-green-500',
    'Documentação': 'bg-purple-500',
    'Direito Penal': 'bg-red-500',
    'Segurança Pública': 'bg-yellow-500',
    'Inteligência': 'bg-indigo-500',
    'Perícia': 'bg-orange-500'
  };

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        // Buscar estatísticas do dashboard
        const dashboardRes = await statsAPI.getDashboard();
        const dashboardData = dashboardRes?.data ?? dashboardRes ?? {};

        // Definir estatísticas (prompts compartilhados e usuários ativos)
        setStats({
          totalPrompts: dashboardData.stats?.totalPrompts || 0,
          totalUsers: dashboardData.stats?.totalUsers || 0
        });

        // Definir categorias de destaque
        setCategories(Array.isArray(dashboardData.categories) ? dashboardData.categories : []);

        // Obter prompts em destaque (top 3 mais visualizados). Caso venham mais, recortar aqui.
        const topPrompts = Array.isArray(dashboardData.topPrompts)
          ? dashboardData.topPrompts.slice(0, 3)
          : [];
        const adaptedFeatured = topPrompts.map((p) => ({
          id: p.id,
          title: p.titulo || p.title,
          description: '',
          author: { name: p.usuarios?.nome || 'Usuário' },
          views: p.visualizacoes || 0,
          likes: 0,
          comments: 0,
          category: p.categoria || p.category
        }));
        setFeaturedPrompts(adaptedFeatured);

        // Processar atividades recentes
        let activities = [];
        if (dashboardData.recentActivities?.prompts) {
          dashboardData.recentActivities.prompts.forEach((prompt) => {
            activities.push({
              user: prompt.usuarios?.nome || 'Usuário',
              action: 'adicionou um novo prompt',
              item: prompt.titulo,
              time: new Date(prompt.criado_em),
              type: 'prompt'
            });
          });
        }
        if (dashboardData.recentActivities?.comments) {
          dashboardData.recentActivities.comments.forEach((comment) => {
            activities.push({
              user: comment.usuarios?.nome || 'Usuário',
              action: 'comentou em',
              item: comment.prompts?.titulo || 'Prompt',
              time: new Date(comment.criado_em),
              type: 'comment'
            });
          });
        }

        // Ordenar e limitar
        activities.sort((a, b) => b.time - a.time);
        const adaptedActivities = activities.slice(0, 4).map((act) => ({
          ...act,
          timeLabel: formatTimeAgo(act.time),
        }));
        setRecentActivities(adaptedActivities);
      } catch (err) {
        console.error('Erro ao carregar dados da página inicial', err);
        setStats({ totalPrompts: 0, totalUsers: 0 });
        setCategories([]);
        setRecentActivities([]);
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
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors duration-300">
                    <Brain className="h-6 w-6 text-accent group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <h3 className="font-semibold mb-2 text-foreground">IA Aplicada</h3>
                  <p className="text-sm text-muted-foreground">Prompts práticos para investigações</p>
                </CardContent>
              </Card>
              <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-500/20 transition-colors duration-300">
                    <Users className="h-6 w-6 text-green-600 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <h3 className="font-semibold mb-2 text-foreground">Colaboração</h3>
                  <p className="text-sm text-muted-foreground">Compartilhamento de conhecimento</p>
                </CardContent>
              </Card>
              <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-red-500/20 transition-colors duration-300">
                    <Shield className="h-6 w-6 text-red-600 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <h3 className="font-semibold mb-2 text-foreground">Ética</h3>
                  <p className="text-sm text-muted-foreground">Uso responsável da tecnologia</p>
                </CardContent>
              </Card>
              <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-500/20 transition-colors duration-300">
                    <TrendingUp className="h-6 w-6 text-purple-600 group-hover:scale-110 transition-transform duration-300" />
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
                        <div className="flex items-center hover:text-accent transition-colors cursor-pointer">
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          {prompt.likes}
                        </div>
                        <div className="flex items-center hover:text-accent transition-colors cursor-pointer">
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
          
          <CategoriesCarousel categories={categories} />
        </div>
      </section>

      {/* Atividades Recentes */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-foreground mb-8">Atividades Recentes</h2>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <Card key={index} className="group hover:shadow-md transition-all duration-300 hover:border-accent/20">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center group-hover:bg-accent/20 transition-colors duration-300">
                          <Users className="h-5 w-5 text-accent group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div className="flex-1">
                          <p className="text-foreground">
                            <span className="font-medium text-accent">{activity.user}</span> {activity.action}{' '}
                            <span className="font-medium text-foreground hover:text-accent transition-colors cursor-pointer">{activity.item}</span>
                          </p>
                          <div className="flex items-center mt-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            {activity.timeLabel}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-8">Links Úteis</h2>
              <div className="space-y-4">
                <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <Link to="/boas-praticas" className="flex items-center">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-500/20 transition-colors duration-300">
                        <BookOpen className="h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground group-hover:text-blue-500 transition-colors duration-300">Boas Práticas</h3>
                        <p className="text-sm text-muted-foreground">Guias para uso ético da IA</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-300" />
                    </Link>
                  </CardContent>
                </Card>
                
                <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <Link to="/discussoes" className="flex items-center">
                      <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center mr-3 group-hover:bg-green-500/20 transition-colors duration-300">
                        <MessageCircle className="h-5 w-5 text-green-500 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground group-hover:text-green-500 transition-colors duration-300">Fórum de Discussões</h3>
                        <p className="text-sm text-muted-foreground">Participe das conversas</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-green-500 group-hover:translate-x-1 transition-all duration-300" />
                    </Link>
                  </CardContent>
                </Card>
                
                <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-purple-500">
                  <CardContent className="p-4">
                    <Link to="/sobre" className="flex items-center">
                      <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mr-3 group-hover:bg-purple-500/20 transition-colors duration-300">
                        <Globe className="h-5 w-5 text-purple-500 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground group-hover:text-purple-500 transition-colors duration-300">Sobre o Projeto</h3>
                        <p className="text-sm text-muted-foreground">Conheça nossa missão</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-500 group-hover:translate-x-1 transition-all duration-300" />
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

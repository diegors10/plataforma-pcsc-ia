import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  Eye, 
  Heart, 
  Shield, 
  Users, 
  Lightbulb,
  CheckCircle,
  Globe,
  Award,
  Zap
} from 'lucide-react';

const Sobre = () => {
  const valores = [
    {
      icon: Lightbulb,
      title: 'Inovação',
      description: 'Busca constante por novas soluções e tecnologias que aprimorem a atividade policial.',
      color: 'bg-yellow-500'
    },
    {
      icon: Shield,
      title: 'Ética',
      description: 'Uso responsável e justo da IA, respeitando a privacidade e os direitos humanos.',
      color: 'bg-green-500'
    },
    {
      icon: Users,
      title: 'Colaboração',
      description: 'Fomento à troca de conhecimento e experiências entre os profissionais.',
      color: 'bg-blue-500'
    },
    {
      icon: Globe,
      title: 'Transparência',
      description: 'Clareza nos processos e decisões assistidas por IA.',
      color: 'bg-purple-500'
    },
    {
      icon: Award,
      title: 'Excelência',
      description: 'Compromisso com a qualidade e aprimoramento contínuo.',
      color: 'bg-red-500'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4 bg-accent/10 text-accent border-accent/20">
              Sobre o Projeto
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              PCSC-IA
            </h1>
            <p className="text-xl mb-4 text-white/90 max-w-3xl mx-auto">
              Plataforma Colaborativa de Inteligência Artificial
            </p>
            <p className="text-lg text-white/80 max-w-4xl mx-auto">
              Uma iniciativa da Polícia Civil de Santa Catarina para fomentar o uso estratégico, 
              ético e colaborativo da Inteligência Artificial na atividade policial.
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Missão */}
        <Card className="mb-12 group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-accent">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center group-hover:bg-accent/20 transition-colors duration-300">
                <Target className="h-6 w-6 text-accent group-hover:scale-110 transition-transform duration-300" />
              </div>
              <CardTitle className="text-2xl">Nossa Missão</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed">
            <p className="mb-4 text-lg">
              Capacitar os profissionais da segurança pública com ferramentas e conhecimentos em 
              Inteligência Artificial, promovendo a <strong className="text-accent">inovação</strong>, 
              a <strong className="text-accent">eficiência</strong> e a <strong className="text-accent">justiça</strong> nas 
              investigações e operações policiais.
            </p>
            <p className="text-lg">
              Acreditamos que a colaboração e o compartilhamento de informações são fundamentais 
              para o desenvolvimento de soluções de IA que atendam às necessidades específicas da 
              Polícia Civil, sempre com foco na ética, transparência e respeito aos direitos fundamentais.
            </p>
          </CardContent>
        </Card>

        {/* Visão */}
        <Card className="mb-12 group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition-colors duration-300">
                <Eye className="h-6 w-6 text-blue-500 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <CardTitle className="text-2xl">Nossa Visão</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed">
            <p className="text-lg">
              Ser <strong className="text-blue-500">referência nacional</strong> no uso de Inteligência 
              Artificial em segurança pública, impulsionando a modernização e aprimoramento contínuo 
              das práticas policiais através da tecnologia e da colaboração.
            </p>
          </CardContent>
        </Card>

        {/* Valores */}
        <div className="mb-12">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                <Heart className="h-6 w-6 text-red-500" />
              </div>
              <h2 className="text-3xl font-bold text-foreground">Nossos Valores</h2>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Os princípios que guiam nossa atuação e desenvolvimento da plataforma
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {valores.map((valor, index) => {
              const IconComponent = valor.icon;
              return (
                <Card key={index} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-t-4 border-t-accent">
                  <CardContent className="p-6 text-center">
                    <div className={`w-16 h-16 ${valor.color} rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-accent transition-colors duration-300">
                      {valor.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {valor.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Benefícios */}
        <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-green-500">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:bg-green-500/20 transition-colors duration-300">
                <CheckCircle className="h-6 w-6 text-green-500 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <CardTitle className="text-2xl">Benefícios da Plataforma</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Zap className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground">Eficiência Operacional</h4>
                    <p className="text-muted-foreground">Otimização de processos investigativos com IA</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Users className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground">Colaboração</h4>
                    <p className="text-muted-foreground">Compartilhamento de conhecimento entre equipes</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground">Segurança</h4>
                    <p className="text-muted-foreground">Ambiente seguro e controlado para dados sensíveis</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Lightbulb className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground">Inovação Contínua</h4>
                    <p className="text-muted-foreground">Desenvolvimento de novas soluções em IA</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Globe className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground">Transparência</h4>
                    <p className="text-muted-foreground">Processos claros e auditáveis</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Award className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground">Qualidade</h4>
                    <p className="text-muted-foreground">Padrões elevados de excelência</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Sobre;

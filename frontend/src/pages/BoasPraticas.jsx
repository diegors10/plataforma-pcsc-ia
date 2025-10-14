import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

import {
  Scale,
  Shield,
  GraduationCap,
  Users,
  CheckCircle,
  Monitor,
  Eye,
  UserCheck,
  ExternalLink,
} from 'lucide-react';

const BoasPraticas = () => {
  const practices = [
    {
      id: 'item-1',
      title: 'Uso Ético da IA na Atividade Policial',
      content:
        'A inteligência artificial deve ser utilizada de forma ética, respeitando os direitos humanos, a privacidade e a dignidade das pessoas. É fundamental evitar vieses algorítmicos e garantir a transparência nas decisões assistidas por IA.',
      icon: Scale,
    },
    {
      id: 'item-2',
      title: 'Segurança e Proteção de Dados',
      content:
        'Ao lidar com dados sensíveis, é imprescindível implementar medidas robustas de segurança cibernética e proteção de dados. O acesso deve ser restrito e auditável, e a conformidade com a LGPD (Lei Geral de Proteção de Dados) deve ser rigorosamente observada.',
      icon: Shield,
    },
    {
      id: 'item-3',
      title: 'Treinamento e Capacitação Contínua',
      content:
        'Os profissionais que utilizam ferramentas de IA devem receber treinamento adequado e contínuo. A compreensão dos princípios de funcionamento da IA, suas limitações e potenciais impactos é crucial para o uso eficaz e responsável.',
      icon: GraduationCap,
    },
    {
      id: 'item-4',
      title: 'Colaboração e Compartilhamento de Conhecimento',
      content:
        'A troca de experiências e o compartilhamento de boas práticas entre as equipes e instituições são essenciais para o aprimoramento coletivo. Fóruns e plataformas colaborativas, como esta, são ferramentas valiosas para esse fim.',
      icon: Users,
    },
    {
      id: 'item-5',
      title: 'Validação e Auditoria de Sistemas de IA',
      content:
        'Sistemas de IA devem ser regularmente validados e auditados para garantir sua precisão, imparcialidade e conformidade com os objetivos operacionais. A documentação detalhada dos modelos e dos dados utilizados é fundamental para a rastreabilidade e a prestação de contas.',
      icon: CheckCircle,
    },
   
    {
      id: 'item-6',
      title: 'Monitoramento Contínuo e Atualização',
      content:
        'É essencial monitorar continuamente o desempenho dos sistemas de IA utilizados na segurança pública, avaliando sua precisão e detectando desvios ou erros. Modelos e algoritmos devem ser atualizados regularmente para refletir mudanças nos padrões criminais e evoluções tecnológicas.',
      icon: Monitor,
    },
    {
      id: 'item-7',
      title: 'Transparência e Explicabilidade',
      content:
        'As decisões assistidas por IA devem ser transparentes e explicáveis para os operadores e as partes interessadas. Sempre que possível, forneça justificativas compreensíveis das recomendações da IA para promover a confiança e permitir a revisão humana.',
      icon: Eye,
    },
    {
      id: 'item-8',
      title: 'Supervisão Humana e Tomada de Decisão',
      content:
        'A IA deve apoiar, e não substituir, o julgamento humano. Supervisores humanos devem ter capacidade de intervir e tomar decisões finais, especialmente em situações críticas que envolvem direitos ou liberdades individuais.',
      icon: UserCheck,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-6">Boas Práticas no Uso de IA</h1>
        <p className="text-muted-foreground mb-8">
          Explore diretrizes e recomendações para o uso eficaz e responsável da Inteligência Artificial na atividade policial.
        </p>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Princípios Fundamentais</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {practices.map((practice) => {
                // Extrai o componente de ícone de cada prática
                const Icon = practice.icon;
                return (
                  <AccordionItem key={practice.id} value={practice.id}>
                    <AccordionTrigger className="text-lg font-semibold text-foreground hover:no-underline">
                      <span className="flex items-center">
                        {Icon && <Icon className="h-5 w-5 text-accent mr-2" />}
                        {practice.title}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {practice.content}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recursos Adicionais</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p className="mb-2">Para aprofundar seus conhecimentos, recomendamos os seguintes recursos:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <ExternalLink className="h-4 w-4 mt-1 text-accent" />
                <a href="#" className="text-accent hover:underline">
                  Guia de Ética para IA em Segurança Pública
                </a>
              </li>
              <li className="flex items-start gap-2">
                <ExternalLink className="h-4 w-4 mt-1 text-accent" />
                <a href="#" className="text-accent hover:underline">
                  Relatório sobre IA e Direitos Humanos
                </a>
              </li>
              <li className="flex items-start gap-2">
                <ExternalLink className="h-4 w-4 mt-1 text-accent" />
                <a href="#" className="text-accent hover:underline">
                  Cursos Online sobre IA Responsável
                </a>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BoasPraticas;

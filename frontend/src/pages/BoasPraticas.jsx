import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const BoasPraticas = () => {
  const practices = [
    {
      id: 'item-1',
      title: 'Uso Ético da IA na Atividade Policial',
      content: 'A inteligência artificial deve ser utilizada de forma ética, respeitando os direitos humanos, a privacidade e a dignidade das pessoas. É fundamental evitar vieses algorítmicos e garantir a transparência nas decisões assistidas por IA.',
    },
    {
      id: 'item-2',
      title: 'Segurança e Proteção de Dados',
      content: 'Ao lidar com dados sensíveis, é imprescindível implementar medidas robustas de segurança cibernética e proteção de dados. O acesso deve ser restrito e auditável, e a conformidade com a LGPD (Lei Geral de Proteção de Dados) deve ser rigorosamente observada.',
    },
    {
      id: 'item-3',
      title: 'Treinamento e Capacitação Contínua',
      content: 'Os profissionais que utilizam ferramentas de IA devem receber treinamento adequado e contínuo. A compreensão dos princípios de funcionamento da IA, suas limitações e potenciais impactos é crucial para o uso eficaz e responsável.',
    },
    {
      id: 'item-4',
      title: 'Colaboração e Compartilhamento de Conhecimento',
      content: 'A troca de experiências e o compartilhamento de boas práticas entre as equipes e instituições são essenciais para o aprimoramento coletivo. Fóruns e plataformas colaborativas, como esta, são ferramentas valiosas para esse fim.',
    },
    {
      id: 'item-5',
      title: 'Validação e Auditoria de Sistemas de IA',
      content: 'Sistemas de IA devem ser regularmente validados e auditados para garantir sua precisão, imparcialidade e conformidade com os objetivos operacionais. A documentação detalhada dos modelos e dos dados utilizados é fundamental para a rastreabilidade e a prestação de contas.',
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
              {practices.map((practice) => (
                <AccordionItem key={practice.id} value={practice.id}>
                  <AccordionTrigger className="text-lg font-semibold text-foreground hover:no-underline">
                    {practice.title}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {practice.content}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recursos Adicionais</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p className="mb-2">Para aprofundar seus conhecimentos, recomendamos os seguintes recursos:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><a href="#" className="text-accent hover:underline">Guia de Ética para IA em Segurança Pública</a></li>
              <li><a href="#" className="text-accent hover:underline">Relatório sobre IA e Direitos Humanos</a></li>
              <li><a href="#" className="text-accent hover:underline">Cursos Online sobre IA Responsável</a></li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BoasPraticas;

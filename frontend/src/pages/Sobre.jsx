import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Sobre = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-6">Sobre a PCSC-IA</h1>
        <p className="text-muted-foreground mb-8">
          A Plataforma Colaborativa de Inteligência Artificial (PCSC-IA) é uma iniciativa da Polícia Civil de Santa Catarina para fomentar o uso estratégico e ético da IA na atividade policial.
        </p>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Nossa Missão</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed">
            <p className="mb-4">
              Nossa missão é capacitar os profissionais da segurança pública com ferramentas e conhecimentos em Inteligência Artificial, promovendo a inovação, a eficiência e a justiça nas investigações e operações policiais.
            </p>
            <p>
              Acreditamos que a colaboração e o compartilhamento de informações são fundamentais para o desenvolvimento de soluções de IA que atendam às necessidades específicas da Polícia Civil, sempre com foco na ética, transparência e respeito aos direitos fundamentais.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Visão</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed">
            Ser referência nacional no uso de Inteligência Artificial em segurança pública, impulsionando a modernização e aprimoramento contínuo das práticas policiais através da tecnologia e da colaboração.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Valores</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <ul className="list-disc list-inside space-y-1">
              <li>**Inovação:** Busca constante por novas soluções e tecnologias.</li>
              <li>**Ética:** Uso responsável e justo da IA, respeitando a privacidade e os direitos humanos.</li>
              <li>**Colaboração:** Fomento à troca de conhecimento e experiências entre os profissionais.</li>
              <li>**Transparência:** Clareza nos processos e decisões assistidas por IA.</li>
              <li>**Excelência:** Compromisso com a qualidade e aprimoramento contínuo.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Sobre;

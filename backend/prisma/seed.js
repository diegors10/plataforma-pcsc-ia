import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando o processo de seeding...');

  // 1. Limpeza de dados na ordem correta (de filhos para pais)
  console.log('Limpando dados existentes...');
  await prisma.curtidas.deleteMany();
  await prisma.comentarios.deleteMany();
  await prisma.postagens.deleteMany();
  await prisma.discussoes.deleteMany();
  await prisma.prompts.deleteMany();
  await prisma.especialidades.deleteMany();
  await prisma.usuarios.deleteMany();
  console.log('Dados antigos limpos com sucesso.');

  // 2. Criação de Usuários
  console.log('Criando usuários...');
  const admin = await prisma.usuarios.create({
    data: {
      email: 'admin@pc.sc.gov.br',
      nome: 'Admin do Sistema',
      senha: 'senha-hash-aqui', // Lembre-se de usar senhas hasheadas em produção
      e_admin: true,
      cargo: 'Administrador',
      departamento: 'Tecnologia da Informação',
    },
  });

  const moderador = await prisma.usuarios.create({
    data: {
      email: 'moderador@pc.sc.gov.br',
      nome: 'Agente Moderador',
      senha: 'senha-hash-aqui',
      e_moderador: true,
      cargo: 'Agente de Polícia',
      departamento: 'Inteligência',
    },
  });

  const policial1 = await prisma.usuarios.create({
    data: {
      email: 'joao.silva@pc.sc.gov.br',
      nome: 'João Silva',
      senha: 'senha-hash-aqui',
      cargo: 'Escrivão de Polícia',
      departamento: 'Delegacia de Comarca',
    },
  });
  console.log('Usuários criados com sucesso.');

  // 3. Criação de Especialidades
  console.log('Criando especialidades...');
  const inteligencia = await prisma.especialidades.create({
    data: {
      nome: 'Inteligência Policial',
      descricao: 'Prompts focados em análise de dados e investigação.',
      cor: '#0d47a1',
    },
  });

  const tatico = await prisma.especialidades.create({
    data: {
      nome: 'Operações Táticas',
      descricao: 'Prompts para planejamento e execução de operações.',
      cor: '#b71c1c',
    },
  });
  console.log('Especialidades criadas com sucesso.');

  // 4. Criação de Prompts
  console.log('Criando prompts...');
  const prompt1 = await prisma.prompts.create({
    data: {
      titulo: 'Análise de Vínculos em Relatórios de Ocorrência',
      descricao: 'Um prompt para o GPT-4 analisar textos de B.O. e extrair entidades, veículos e endereços, sugerindo possíveis conexões entre eles.',
      conteudo: 'Você é um analista de inteligência policial. Analise o seguinte conjunto de boletins de ocorrência e identifique todas as pessoas, veículos (com placas) e endereços mencionados. Crie uma tabela de relações mostrando quais pessoas estão associadas a quais veículos e endereços. Ao final, aponte qualquer padrão ou conexão suspeita que possa indicar uma associação criminosa. B.O.s: [COLE OS TEXTOS AQUI]',
      categoria: 'Investigação',
      tags: ['análise', 'gpt-4', 'boletim de ocorrência', 'vínculos'],
      foi_aprovado: true,
      e_destaque: true,
      autor_id: moderador.id,
      especialidade_id: inteligencia.id,
    },
  });

  const prompt2 = await prisma.prompts.create({
    data: {
      titulo: 'Checklist para Cumprimento de Mandado de Busca',
      descricao: 'Gera um checklist detalhado para planejar e executar um mandado de busca e apreensão com segurança e eficiência.',
      conteudo: 'Crie um checklist completo para o cumprimento de um mandado de busca e apreensão. O checklist deve cobrir as seguintes fases: 1. Planejamento (análise de risco, recursos necessários, briefing da equipe); 2. Execução (protocolos de entrada, segurança do perímetro, coleta de evidências); 3. Pós-Operação (catalogação de itens, relatório final).',
      categoria: 'Procedimento Operacional',
      tags: ['checklist', 'busca e apreensão', 'segurança'],
      foi_aprovado: true,
      autor_id: policial1.id,
      especialidade_id: tatico.id,
    },
  });
  console.log('Prompts criados com sucesso.');

  // 5. Criação de Discussão e Postagens
  console.log('Criando discussão e postagens...');
  const discussaoGeral = await prisma.discussoes.create({
    data: {
      titulo: 'Melhores Práticas no Uso de IAs Generativas',
      descricao: 'Espaço para compartilhar dicas e tirar dúvidas sobre o uso de IAs no dia a dia policial.',
      categoria: 'Geral',
      e_aberta: true, // Discussão aberta para todos
      autor_id: admin.id,
    },
  });

  await prisma.postagens.create({
    data: {
      conteudo: 'Pessoal, uma dica importante: sempre verifiquem a veracidade das informações geradas pela IA, especialmente dados factuais como artigos de lei ou dados históricos. Elas podem "alucinar".',
      autor_id: admin.id,
      discussao_id: discussaoGeral.id,
    },
  });

  await prisma.postagens.create({
    data: {
      conteudo: 'Concordo. Já usei para resumir depoimentos longos e o resultado foi excelente, economizou muito tempo. Mas sempre com o documento original do lado para conferir.',
      autor_id: policial1.id,
      discussao_id: discussaoGeral.id,
    },
  });
  console.log('Discussão e postagens criadas com sucesso.');

  // 6. Criação de Comentários e Respostas
  console.log('Criando comentários e respostas...');
  const comentarioPai = await prisma.comentarios.create({
    data: {
      conteudo: 'Excelente prompt! Usei uma variação para analisar relatórios de campo e funcionou muito bem.',
      autor_id: policial1.id,
      prompt_id: prompt1.id,
    },
  });

  // Resposta ao comentário acima
  await prisma.comentarios.create({
    data: {
      conteudo: 'Ótima ideia! Vou adaptar para isso também. Obrigado por compartilhar.',
      autor_id: moderador.id,
      prompt_id: prompt1.id,
      comentario_pai_id: comentarioPai.id, // Vinculando como resposta
    },
  });
  console.log('Comentários e respostas criados com sucesso.');

  // 7. Criação de Curtidas
  console.log('Criando curtidas...');
  await prisma.curtidas.createMany({
    data: [
      // Curtidas em prompts
      { usuario_id: admin.id, prompt_id: prompt1.id },
      { usuario_id: policial1.id, prompt_id: prompt1.id },
      { usuario_id: moderador.id, prompt_id: prompt2.id },
      // Curtida em comentário
      { usuario_id: admin.id, comentario_id: comentarioPai.id },
    ],
  });
  console.log('Curtidas criadas com sucesso.');

  console.log('Seeding finalizado com sucesso! 🚀');
}

main()
  .catch((e) => {
    console.error('Ocorreu um erro durante o seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
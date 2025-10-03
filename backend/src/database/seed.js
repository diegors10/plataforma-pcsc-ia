import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  try {
    // Criar especialidades
    const especialidades = await Promise.all([
      prisma.especialidades.upsert({
        where: { nome: 'Investigação Digital' },
        update: {},
        create: {
          nome: 'Investigação Digital',
          descricao: 'Análise forense digital, evidências eletrônicas e crimes cibernéticos',
          icone: 'computer',
          cor: '#3B82F6'
        }
      }),
      prisma.especialidades.upsert({
        where: { nome: 'Análise Criminal' },
        update: {},
        create: {
          nome: 'Análise Criminal',
          descricao: 'Análise de padrões criminais, inteligência policial e investigação',
          icone: 'search',
          cor: '#EF4444'
        }
      }),
      prisma.especialidades.upsert({
        where: { nome: 'Documentação' },
        update: {},
        create: {
          nome: 'Documentação',
          descricao: 'Elaboração de relatórios, documentos oficiais e procedimentos',
          icone: 'file-text',
          cor: '#10B981'
        }
      }),
      prisma.especialidades.upsert({
        where: { nome: 'Procedimentos Operacionais' },
        update: {},
        create: {
          nome: 'Procedimentos Operacionais',
          descricao: 'Protocolos policiais, operações e procedimentos de campo',
          icone: 'shield',
          cor: '#F59E0B'
        }
      })
    ]);

    console.log('✅ Especialidades criadas:', especialidades.length);

    // Criar usuário administrador
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const adminUser = await prisma.usuarios.upsert({
      where: { email: 'admin@pcsc.sc.gov.br' },
      update: {},
      create: {
        email: 'admin@pcsc.sc.gov.br',
        nome: 'Administrador do Sistema',
        senha: hashedPassword,
        departamento: 'Tecnologia da Informação',
        cargo: 'Administrador de Sistema',
        matricula: 'ADM001',
        e_admin: true,
        e_moderador: true,
        esta_ativo: true
      }
    });

    console.log('✅ Usuário administrador criado:', adminUser.email);

    // Criar usuários de exemplo
    const usuarios = await Promise.all([
      prisma.usuarios.upsert({
        where: { email: 'investigador.silva@pcsc.sc.gov.br' },
        update: {},
        create: {
          email: 'investigador.silva@pcsc.sc.gov.br',
          nome: 'João Silva',
          senha: await bcrypt.hash('senha123', 12),
          departamento: 'Investigação Criminal',
          cargo: 'Investigador',
          matricula: 'INV001',
          telefone: '(48) 99999-0001',
          localizacao: 'Florianópolis/SC',
          biografia: 'Especialista em crimes digitais com 10 anos de experiência.'
        }
      }),
      prisma.usuarios.upsert({
        where: { email: 'delegada.santos@pcsc.sc.gov.br' },
        update: {},
        create: {
          email: 'delegada.santos@pcsc.sc.gov.br',
          nome: 'Maria Santos',
          senha: await bcrypt.hash('senha123', 12),
          departamento: 'Delegacia Especializada',
          cargo: 'Delegada',
          matricula: 'DEL001',
          telefone: '(48) 99999-0002',
          localizacao: 'Joinville/SC',
          biografia: 'Delegada especializada em crimes contra o patrimônio.',
          e_moderador: true
        }
      })
    ]);

    console.log('✅ Usuários de exemplo criados:', usuarios.length);

    // Criar prompts de exemplo
    const prompts = await Promise.all([
      prisma.prompts.create({
        data: {
          titulo: 'Análise de Evidências Digitais em Dispositivos Móveis',
          descricao: 'Prompt para análise sistemática de evidências digitais em smartphones e tablets, incluindo recuperação de dados deletados e análise de aplicativos.',
          conteudo: `Você é um especialista em análise forense digital. Analise as evidências digitais encontradas no dispositivo móvel seguindo estas diretrizes:

1. **Identificação do Dispositivo**
   - Modelo, marca e sistema operacional
   - Número IMEI e informações de rede
   - Estado físico do dispositivo

2. **Extração de Dados**
   - Contatos e agenda telefônica
   - Mensagens SMS e aplicativos de mensagem
   - Histórico de chamadas
   - Fotos, vídeos e arquivos de mídia
   - Dados de localização e GPS
   - Histórico de navegação

3. **Análise de Aplicativos**
   - WhatsApp, Telegram, Instagram, Facebook
   - Aplicativos bancários e de pagamento
   - Aplicativos de transporte e entrega
   - Jogos e entretenimento

4. **Recuperação de Dados Deletados**
   - Técnicas de recuperação
   - Validação da integridade dos dados
   - Timeline de atividades

5. **Documentação e Relatório**
   - Cadeia de custódia
   - Metodologia utilizada
   - Achados relevantes para a investigação
   - Conclusões técnicas

Mantenha sempre a integridade das evidências e documente todos os procedimentos realizados.`,
          categoria: 'Investigação Digital',
          tags: ['forense', 'digital', 'móvel', 'evidências'],
          e_publico: true,
          foi_aprovado: true,
          e_destaque: true,
          visualizacoes: 245,
          autor_id: usuarios[0].id,
          especialidade_id: especialidades[0].id
        }
      }),
      prisma.prompts.create({
        data: {
          titulo: 'Redação de Relatório de Investigação Policial',
          descricao: 'Template estruturado para elaboração de relatórios de investigação claros, objetivos e tecnicamente corretos.',
          conteudo: `Para redigir um relatório de investigação policial eficaz, siga esta estrutura:

## 1. IDENTIFICAÇÃO
- Número do inquérito/procedimento
- Delegacia responsável
- Autoridade policial
- Data e horário

## 2. RESUMO EXECUTIVO
- Síntese dos fatos investigados
- Principais conclusões
- Autoria e materialidade

## 3. DOS FATOS
- Narrativa cronológica dos eventos
- Circunstâncias do crime
- Local, data e horário
- Vítimas e testemunhas

## 4. DA INVESTIGAÇÃO
### 4.1 Diligências Realizadas
- Oitivas de testemunhas
- Interrogatórios
- Perícias técnicas
- Buscas e apreensões

### 4.2 Evidências Coletadas
- Provas materiais
- Documentos
- Registros eletrônicos
- Laudos periciais

## 5. ANÁLISE TÉCNICA
- Correlação das evidências
- Análise da autoria
- Comprovação da materialidade
- Circunstâncias agravantes/atenuantes

## 6. CONCLUSÃO
- Tipificação penal
- Indiciamento (se aplicável)
- Recomendações

## 7. ANEXOS
- Documentos probatórios
- Fotografias
- Laudos técnicos
- Depoimentos

Utilize linguagem técnica, objetiva e imparcial. Fundamente todas as conclusões em evidências concretas.`,
          categoria: 'Documentação',
          tags: ['relatório', 'investigação', 'documentação', 'procedimentos'],
          e_publico: true,
          foi_aprovado: true,
          e_destaque: true,
          visualizacoes: 189,
          autor_id: usuarios[1].id,
          especialidade_id: especialidades[2].id
        }
      }),
      prisma.prompts.create({
        data: {
          titulo: 'Análise de Padrões em Crimes Seriados',
          descricao: 'Metodologia para identificação de padrões e conexões em séries de crimes usando técnicas de análise criminal.',
          conteudo: `Para identificar padrões em crimes seriados, utilize esta metodologia de análise:

## COLETA DE DADOS
1. **Informações Básicas**
   - Data, horário e local dos crimes
   - Tipo de crime e modus operandi
   - Características das vítimas
   - Evidências físicas coletadas

2. **Análise Geográfica**
   - Mapeamento dos locais dos crimes
   - Identificação de clusters geográficos
   - Análise de rotas e deslocamentos
   - Pontos de ancoragem do criminoso

## ANÁLISE DE PADRÕES
1. **Temporal**
   - Dias da semana preferenciais
   - Horários de maior incidência
   - Intervalos entre os crimes
   - Sazonalidade

2. **Comportamental**
   - Modus operandi consistente
   - Assinatura criminal
   - Evolução do comportamento
   - Rituais específicos

3. **Vitimológico**
   - Perfil das vítimas
   - Critérios de seleção
   - Vulnerabilidades exploradas
   - Relação autor-vítima

## FERRAMENTAS DE ANÁLISE
- Software de análise criminal
- Sistemas de mapeamento
- Bancos de dados criminais
- Análise estatística

## RELATÓRIO DE ANÁLISE
1. Resumo dos padrões identificados
2. Probabilidade de autoria comum
3. Previsões de comportamento futuro
4. Recomendações investigativas

Esta análise deve ser contínua e atualizada conforme novos crimes são descobertos.`,
          categoria: 'Análise Criminal',
          tags: ['padrões', 'análise', 'crimes seriados', 'investigação'],
          e_publico: true,
          foi_aprovado: true,
          visualizacoes: 156,
          autor_id: adminUser.id,
          especialidade_id: especialidades[1].id
        }
      })
    ]);

    console.log('✅ Prompts de exemplo criados:', prompts.length);

    // Criar algumas curtidas
    await Promise.all([
      prisma.curtidas.create({
        data: {
          usuario_id: usuarios[1].id,
          prompt_id: prompts[0].id
        }
      }),
      prisma.curtidas.create({
        data: {
          usuario_id: adminUser.id,
          prompt_id: prompts[0].id
        }
      }),
      prisma.curtidas.create({
        data: {
          usuario_id: usuarios[0].id,
          prompt_id: prompts[1].id
        }
      })
    ]);

    console.log('✅ Curtidas de exemplo criadas');

    // Criar comentários de exemplo
    const comentarios = await Promise.all([
      prisma.comentarios.create({
        data: {
          conteudo: 'Excelente prompt! Muito útil para padronizar nossas análises forenses.',
          autor_id: usuarios[1].id,
          prompt_id: prompts[0].id,
          foi_aprovado: true
        }
      }),
      prisma.comentarios.create({
        data: {
          conteudo: 'Poderia incluir também análise de dados em nuvem?',
          autor_id: adminUser.id,
          prompt_id: prompts[0].id,
          foi_aprovado: true
        }
      })
    ]);

    // Criar resposta ao comentário
    await prisma.comentarios.create({
      data: {
        conteudo: 'Boa sugestão! Vou incluir uma seção sobre análise de dados em nuvem na próxima versão.',
        autor_id: usuarios[0].id,
        prompt_id: prompts[0].id,
        comentario_pai_id: comentarios[1].id,
        foi_aprovado: true
      }
    });

    console.log('✅ Comentários de exemplo criados');

    console.log('🎉 Seed concluído com sucesso!');
    console.log('\n📊 Dados criados:');
    console.log(`- ${especialidades.length} especialidades`);
    console.log(`- ${usuarios.length + 1} usuários (incluindo admin)`);
    console.log(`- ${prompts.length} prompts`);
    console.log('- 3 curtidas');
    console.log('- 3 comentários');
    
    console.log('\n👤 Credenciais do administrador:');
    console.log('Email: admin@pcsc.sc.gov.br');
    console.log('Senha: admin123');

  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

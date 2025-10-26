import prisma from '../config/database.js';

// Helper to convert BigInt values to regular numbers
const toNum = (v) => (typeof v === 'bigint' ? Number(v) : v);

// Deeply converts any BigInt values in an object to Numbers so JSON serialization works
function serializeBigInt(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);

  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    const out = {};
    for (const key of Object.keys(obj)) out[key] = serializeBigInt(obj[key]);
    return out;
  }
  return obj;
}

/**
 * Deriva atividades a partir de prompts:
 * - PROMPT_CREATED: sempre
 * - PROMPT_UPDATED: quando atualizado_em > criado_em
 * Mantém compat: usa { type: 'prompt', createdAt, user, ... } e acrescenta action: 'created' | 'updated'
 */
function buildPromptActivities(rows) {
  const acts = [];

  for (const p of rows) {
    const id = toNum(p.id);
    const created = p.criado_em;
    const updated = p.atualizado_em;

    // Sempre: evento de criação
    if (created) {
      acts.push({
        type: 'prompt',
        action: 'created',
        id,
        title: p.titulo,
        createdAt: created,
        user: p.autor ? serializeBigInt(p.autor) : null,
        // campos auxiliares (opcionais p/ front)
        promptId: id,
      });
    }

    // Atualização real: atualizado_em > criado_em
    if (updated && created && new Date(updated) > new Date(created)) {
      acts.push({
        type: 'prompt',
        action: 'updated',
        id,
        title: p.titulo,
        createdAt: updated, // importante p/ aparecer no topo como atividade recente
        user: p.autor ? serializeBigInt(p.autor) : null,
        promptId: id,
      });
    }
  }

  return acts;
}

/**
 * Deriva atividades a partir de DISCUSSÕES (modelo: discussoes).
 * - DISCUSSION_CREATED
 * - DISCUSSION_UPDATED (quando atualizado_em > criado_em)
 * Mantém compat: { type: 'discussion', createdAt, user, title, action }
 */
async function buildDiscussionActivitiesSafe(limit = 30) {
  try {
    if (!prisma.discussoes) return []; // caso o projeto não tenha o modelo
    const rows = await prisma.discussoes.findMany({
      orderBy: { atualizado_em: 'desc' }, // mais recentes por update
      take: limit,
      select: {
        id: true,
        titulo: true,
        criado_em: true,
        atualizado_em: true,
        autor: { select: { id: true, nome: true, avatar: true } },
      },
    });

    const acts = [];
    for (const d of rows) {
      const id = toNum(d.id);
      const created = d.criado_em;
      const updated = d.atualizado_em;

      if (created) {
        acts.push({
          type: 'discussion',
          action: 'created',
          id,
          title: d.titulo,
          createdAt: created,
          user: d.autor ? serializeBigInt(d.autor) : null,
          discussionId: id,
        });
      }

      if (updated && created && new Date(updated) > new Date(created)) {
        acts.push({
          type: 'discussion',
          action: 'updated',
          id,
          title: d.titulo,
          createdAt: updated, // ordena como atividade recente
          user: d.autor ? serializeBigInt(d.autor) : null,
          discussionId: id,
        });
      }
    }
    return acts;
  } catch {
    // Se der erro (ex.: modelo ausente), não quebra o dashboard
    return [];
  }
}

/**
 * GET /api/stats/dashboard
 * Agora inclui eventos "updated" derivados de updated_at, sem precisar de tabela de atividades.
 */
export const getDashboardStats = async (req, res) => {
  try {
    // Totais
    const [totalPrompts, totalActiveUsers] = await Promise.all([
      prisma.prompts.count(),
      prisma.usuarios.count({ where: { esta_ativo: true } }),
    ]);

    // Top 3 prompts por views (públicos e aprovados)
    const topPromptsRaw = await prisma.prompts.findMany({
      where: { e_publico: true, foi_aprovado: true },
      orderBy: { visualizacoes: 'desc' },
      take: 3,
      select: {
        id: true,
        titulo: true,
        descricao: true,
        categoria: true,
        visualizacoes: true,
        autor: {
          select: { id: true, nome: true, avatar: true, cargo: true },
        },
        _count: { select: { curtidas: true, comentarios: true } },
      },
    });
    const topPrompts = topPromptsRaw.map((p) => ({
      ...serializeBigInt(p),
      likes: p._count.curtidas,
      comments: p._count.comentarios,
    }));

    // Categorias com contagem
    const categoriesRaw = await prisma.especialidades.findMany({
      select: {
        id: true,
        nome: true,
        icone: true,
        cor: true,
        _count: { select: { prompts: true } },
      },
      orderBy: { nome: 'asc' },
    });
    const categories = categoriesRaw.map((c) => ({
      ...serializeBigInt(c),
      totalPrompts: c._count.prompts,
    }));

    // Prompts ordenados por atualizado_em (para reconhecer updates)
    const latestPromptsRaw = await prisma.prompts.findMany({
      orderBy: { atualizado_em: 'desc' },
      take: 40,
      select: {
        id: true,
        titulo: true,
        criado_em: true,
        atualizado_em: true,
        autor: { select: { id: true, nome: true, avatar: true } },
      },
    });

    // Comentários mais recentes
    const latestCommentsRaw = await prisma.comentarios.findMany({
      orderBy: { criado_em: 'desc' },
      take: 20,
      select: {
        id: true,
        conteudo: true,
        criado_em: true,
        autor: { select: { id: true, nome: true, avatar: true } },
        prompt_id: true,
        postagem_id: true,
      },
    });

    // Novos usuários
    const latestUsersRaw = await prisma.usuarios.findMany({
      where: { esta_ativo: true },
      orderBy: { data_entrada: 'desc' },
      take: 20,
      select: {
        id: true,
        nome: true,
        data_entrada: true,
      },
    });

    // Discussões criado/atualizado
    const discussionActs = await buildDiscussionActivitiesSafe(30);

    // Atividades de prompts
    const promptActs = buildPromptActivities(latestPromptsRaw);

    // Comentários (mantém compat; sem action)
    const commentActs = latestCommentsRaw
      .filter((c) => c.autor)
      .map((c) => ({
        type: 'comment',
        id: toNum(c.id),
        content: c.conteudo,
        createdAt: c.criado_em,
        user: serializeBigInt(c.autor),
        promptId: c.prompt_id ? toNum(c.prompt_id) : null,
        postId: c.postagem_id ? toNum(c.postagem_id) : null,
      }));

    // Novos usuários (mantém compat; sem action)
    const userActs = latestUsersRaw.map((u) => ({
      type: 'user',
      id: toNum(u.id),
      createdAt: u.data_entrada,
      user: { id: toNum(u.id), nome: u.nome },
    }));

    // Unifica, ordena por data desc (createdAt já é "effectiveAt" para updated) e limita
    const activities = [...promptActs, ...commentActs, ...userActs, ...discussionActs]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20);

    return res.json({
      totals: { prompts: totalPrompts, activeUsers: totalActiveUsers },
      totalPrompts,
      totalActiveUsers,
      topPrompts,
      featuredPrompts: topPrompts,
      categories,
      featuredCategories: categories,
      recentActivities: serializeBigInt(activities), // inclui action em prompts/discussions
    });
  } catch (err) {
    console.error('Erro em getDashboardStats:', err);
    return res
      .status(500)
      .json({ error: 'Erro ao carregar estatísticas do dashboard' });
  }
};

/**
 * GET /api/stats/prompts
 * Provides simple aggregated stats: total, public, approved and featured prompts.
 */
export const getPromptsStats = async (req, res) => {
  try {
    const [total, publicCount, approvedCount, featuredCount] = await Promise.all([
      prisma.prompts.count(),
      prisma.prompts.count({ where: { e_publico: true } }),
      prisma.prompts.count({ where: { foi_aprovado: true } }),
      prisma.prompts.count({ where: { e_destaque: true } }),
    ]);
    return res.json({
      total: total,
      public: publicCount,
      approved: approvedCount,
      featured: featuredCount,
    });
  } catch (err) {
    console.error('Erro em getPromptsStats:', err);
    return res
      .status(500)
      .json({ error: 'Erro ao carregar estatísticas de prompts' });
  }
};

/**
 * GET /api/stats/categories
 * Returns the list of categories (especialidades) with the number of prompts in each.
 */
export const getCategoriesStats = async (req, res) => {
  try {
    const rows = await prisma.especialidades.findMany({
      select: {
        id: true,
        nome: true,
        icone: true,
        cor: true,
        _count: { select: { prompts: true } },
      },
      orderBy: { nome: 'asc' },
    });
    const data = rows.map((c) => ({
      id: typeof c.id === 'bigint' ? Number(c.id) : c.id,
      nome: c.nome,
      icone: c.icone,
      cor: c.cor,
      totalPrompts: c._count.prompts,
    }));
    return res.json(data);
  } catch (err) {
    console.error('Erro em getCategoriesStats:', err);
    return res.status(500).json({ error: 'Erro ao carregar categorias' });
  }
};

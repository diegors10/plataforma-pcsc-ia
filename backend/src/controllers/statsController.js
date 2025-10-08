import prisma from '../config/database.js';

// Helper to convert BigInt values to regular numbers
const toNum = (v) => (typeof v === 'bigint' ? Number(v) : v);

// Deeply converts any BigInt values in an object to Numbers so JSON serialization works
function serializeBigInt(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    const out = {};
    for (const key of Object.keys(obj)) out[key] = serializeBigInt(obj[key]);
    return out;
  }
  return obj;
}

/**
 * GET /api/stats/dashboard
 * Returns aggregated statistics for the dashboard, including totals,
 * top prompts, categories and recent activities. Converts all BigInt
 * values to numbers to avoid JSON serialization errors.
 */
export const getDashboardStats = async (req, res) => {
  try {
    // Compute total prompts and active users
    const [totalPrompts, totalActiveUsers] = await Promise.all([
      prisma.prompts.count(),
      prisma.usuarios.count({ where: { esta_ativo: true } }),
    ]);

    // Top 3 prompts by view count (only public and approved)
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

    // Categories with prompt counts
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

    // Recent prompts and comments for the activity feed (limit 20 each)
    const [latestPromptsRaw, latestCommentsRaw] = await Promise.all([
      prisma.prompts.findMany({
        orderBy: { criado_em: 'desc' },
        take: 20,
        select: {
          id: true,
          titulo: true,
          criado_em: true,
          autor: { select: { id: true, nome: true, avatar: true } },
        },
      }),
      prisma.comentarios.findMany({
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
      }),
    ]);
    // Build activity objects with unified structure
    const activities = [
      ...latestPromptsRaw
        .filter((p) => p.autor)
        .map((p) => ({
          type: 'prompt',
          id: toNum(p.id),
          title: p.titulo,
          createdAt: p.criado_em,
          user: serializeBigInt(p.autor),
        })),
      ...latestCommentsRaw
        .filter((c) => c.autor)
        .map((c) => ({
          type: 'comment',
          id: toNum(c.id),
          content: c.conteudo,
          createdAt: c.criado_em,
          user: serializeBigInt(c.autor),
          promptId: c.prompt_id ? toNum(c.prompt_id) : null,
          postId: c.postagem_id ? toNum(c.postagem_id) : null,
        })),
    ]
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
      recentActivities: serializeBigInt(activities),
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
import prisma from '../config/database.js';

// ==============================
// Helpers para BigInt / tipos
// ==============================
const toBig = (v) => (v === null || v === undefined ? v : BigInt(v));
const toNum = (v, def = 0) => (typeof v === 'bigint' ? Number(v) : (v ?? def));

function serializeBigInt(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj)) out[k] = serializeBigInt(obj[k]);
    return out;
  }
  return obj;
}

// ==============================
// GET /api/prompts
// Lista prompts com autor corretamente selecionado
// Suporta: page, limit, search, category, author, sort(popular|views|recent), featured
// ==============================
export const getAllPrompts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      sort = 'recent',
      author,
      featured,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * take;

    // Filtros
    const where = {
      e_publico: true,
      foi_aprovado: true,
    };

    if (search) {
      // busca simples: título/descrição e tags (String[])
      where.OR = [
        { titulo: { contains: search, mode: 'insensitive' } },
        { descricao: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    if (category) where.categoria = category;
    if (author) where.autor_id = toBig(author);
    if (featured === 'true') where.e_destaque = true;

    // Ordenação
    let orderBy;
    switch (sort) {
      case 'popular':
        orderBy = { curtidas: { _count: 'desc' } };
        break;
      case 'views':
        orderBy = { visualizacoes: 'desc' };
        break;
      case 'recent':
      default:
        orderBy = { criado_em: 'desc' };
        break;
    }

    // Consulta
    const [rows, total] = await Promise.all([
      prisma.prompts.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          titulo: true,
          descricao: true,
          // não retornamos o conteúdo integral nesta listagem
          conteudo: false,
          categoria: true,
          tags: true,
          visualizacoes: true,
          criado_em: true,
          atualizado_em: true,
          // >>> CORREÇÃO: garantir relação do autor
          autor: {
            select: { id: true, nome: true, avatar: true, cargo: true },
          },
          especialidade: {
            select: { id: true, nome: true, cor: true, icone: true },
          },
          _count: {
            select: { curtidas: true, comentarios: true },
          },
        },
      }),
      prisma.prompts.count({ where }),
    ]);

    // Descobrir likes do usuário autenticado (se houver)
    let promptsWithLikes;
    if (req.user) {
      const ids = rows.map((p) => p.id);
      const likes = await prisma.curtidas.findMany({
        where: { usuario_id: toBig(req.user.id), prompt_id: { in: ids } },
        select: { prompt_id: true },
      });
      const likedIds = new Set(likes.map((l) => l.prompt_id));
      promptsWithLikes = rows.map((p) => ({
        ...p,
        isLiked: likedIds.has(p.id),
        likes: p._count.curtidas,
        comments: p._count.comentarios,
        // fallback de autor para evitar "Usuário" se a relação vier nula
        autor: p.autor ?? { id: null, nome: 'Usuário', avatar: null, cargo: '' },
      }));
    } else {
      promptsWithLikes = rows.map((p) => ({
        ...p,
        isLiked: false,
        likes: p._count.curtidas,
        comments: p._count.comentarios,
        autor: p.autor ?? { id: null, nome: 'Usuário', avatar: null, cargo: '' },
      }));
    }

    return res.json({
      prompts: serializeBigInt(promptsWithLikes),
      pagination: {
        page: pageNum,
        limit: take,
        total,
        pages: Math.max(1, Math.ceil(total / take)),
      },
    });
  } catch (error) {
    console.error('[promptsController.getAllPrompts] Erro:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ==============================
// GET /api/prompts/:id
// Detalhe do prompt com autor corretamente selecionado
// ==============================
export const getPromptById = async (req, res) => {
  try {
    const { id } = req.params;

    // findFirst para aplicar filtros adicionais
    const prompt = await prisma.prompts.findFirst({
      where: {
        id: toBig(id),
        e_publico: true,
        foi_aprovado: true,
      },
      select: {
        id: true,
        titulo: true,
        descricao: true,
        conteudo: true,
        categoria: true,
        tags: true,
        visualizacoes: true,
        criado_em: true,
        atualizado_em: true,
        // >>> CORREÇÃO: garantir relação do autor completa
        autor: {
          select: {
            id: true,
            nome: true,
            avatar: true,
            cargo: true,
            departamento: true,
          },
        },
        especialidade: {
          select: { id: true, nome: true, cor: true, icone: true },
        },
        _count: { select: { curtidas: true, comentarios: true } },
      },
    });

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt não encontrado' });
    }

    // incrementa visualizações (sem retornar o resultado do update)
    await prisma.prompts.update({
      where: { id: toBig(id) },
      data: { visualizacoes: { increment: 1 } },
      select: { id: true },
    });

    // Like do usuário (se autenticado)
    let isLiked = false;
    if (req.user) {
      const like = await prisma.curtidas.findUnique({
        where: {
          usuario_id_prompt_id: {
            usuario_id: toBig(req.user.id),
            prompt_id: toBig(id),
          },
        },
        select: { id: true },
      });
      isLiked = !!like;
    }

    // Normaliza a resposta para o front (mantendo compatibilidade com telas existentes)
    return res.json(
      serializeBigInt({
        id: prompt.id,
        titulo: prompt.titulo,
        descricao: prompt.descricao,
        conteudo: prompt.conteudo,
        categoria: prompt.categoria,
        tags: prompt.tags,
        // somamos +1 em views após o update
        visualizacoes: toNum(prompt.visualizacoes, 0) + 1,
        criadoEm: prompt.criado_em,
        atualizadoEm: prompt.atualizado_em,
        autor: prompt.autor ?? { id: null, nome: 'Usuário', avatar: null, cargo: '' },
        especialidade: prompt.especialidade ?? null,
        likesCount: prompt._count?.curtidas ?? 0,
        commentsCount: prompt._count?.comentarios ?? 0,
        isLiked,
      })
    );
  } catch (error) {
    console.error('[promptsController.getPromptById] Erro:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ==============================
// POST /api/prompts
// Cria prompt conectando autor corretamente e retornando autor no payload
// ==============================
export const createPrompt = async (req, res) => {
  try {
    const {
      titulo,
      descricao,
      conteudo,
      categoria,
      tags,
      especialidade_id,
      e_publico = true,
    } = req.body;

    const created = await prisma.prompts.create({
      data: {
        titulo,
        descricao,
        conteudo,
        categoria,
        tags: Array.isArray(tags) ? tags : [],
        especialidade_id: especialidade_id ? toBig(especialidade_id) : null,
        e_publico,
        foi_aprovado: true, // deixa visível imediatamente
        autor_id: toBig(req.user.id),
      },
      select: {
        id: true,
        titulo: true,
        descricao: true,
        categoria: true,
        tags: true,
        visualizacoes: true,
        criado_em: true,
        atualizado_em: true,
        autor: { select: { id: true, nome: true, avatar: true, cargo: true } },
        especialidade: { select: { id: true, nome: true, cor: true, icone: true } },
        _count: { select: { curtidas: true, comentarios: true } },
      },
    });

    return res.status(201).json(
      serializeBigInt({
        message: 'Prompt criado com sucesso',
        prompt: {
          ...created,
          likes: created._count?.curtidas ?? 0,
          comments: created._count?.comentarios ?? 0,
          isLiked: false,
        },
      })
    );
  } catch (error) {
    console.error('[promptsController.createPrompt] Erro:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ==============================
// PUT /api/prompts/:id
// (mantém lógica, garantindo retorno do autor)
// ==============================
export const updatePrompt = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titulo,
      descricao,
      conteudo,
      categoria,
      tags,
      especialidade_id,
      e_publico,
    } = req.body;

    const existing = await prisma.prompts.findUnique({
      where: { id: toBig(id) },
      select: { id: true, autor_id: true, foi_aprovado: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Prompt não encontrado' });
    }

    if (existing.autor_id !== toBig(req.user.id) && !req.user.e_admin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const updated = await prisma.prompts.update({
      where: { id: toBig(id) },
      data: {
        titulo,
        descricao,
        conteudo,
        categoria,
        tags: Array.isArray(tags) ? tags : [],
        especialidade_id: especialidade_id ? toBig(especialidade_id) : null,
        e_publico,
        // se não for admin, ao editar você pode querer revalidar (ajuste se necessário)
        foi_aprovado: req.user.e_admin ? existing.foi_aprovado : false,
      },
      select: {
        id: true,
        titulo: true,
        descricao: true,
        categoria: true,
        tags: true,
        visualizacoes: true,
        criado_em: true,
        atualizado_em: true,
        autor: { select: { id: true, nome: true, avatar: true, cargo: true } },
        especialidade: { select: { id: true, nome: true, cor: true, icone: true } },
        _count: { select: { curtidas: true, comentarios: true } },
      },
    });

    return res.json(
      serializeBigInt({
        message: 'Prompt atualizado com sucesso',
        prompt: {
          ...updated,
          likes: updated._count?.curtidas ?? 0,
          comments: updated._count?.comentarios ?? 0,
        },
      })
    );
  } catch (error) {
    console.error('[promptsController.updatePrompt] Erro:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ==============================
// DELETE /api/prompts/:id
// ==============================
export const deletePrompt = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.prompts.findUnique({
      where: { id: toBig(id) },
      select: { id: true, autor_id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Prompt não encontrado' });
    }

    if (existing.autor_id !== toBig(req.user.id) && !req.user.e_admin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    await prisma.prompts.delete({ where: { id: toBig(id) } });

    return res.json({ message: 'Prompt excluído com sucesso' });
  } catch (error) {
    console.error('[promptsController.deletePrompt] Erro:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ==============================
// PATCH /api/prompts/:id/like  (toggle)
// - Anônimo: retorna sucesso efêmero (não toca no banco)
// - Autenticado: cria/remove em curtidas (composta usuario_id/prompt_id)
// ==============================
export const likePrompt = async (req, res) => {
  try {
    const { id } = req.params;

    // Confere existência do prompt
    const prompt = await prisma.prompts.findUnique({
      where: { id: toBig(id) },
      select: { id: true },
    });
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt não encontrado' });
    }

    // Caminho anônimo
    if (!req.user) {
      const action = (req.body?.action || 'like').toLowerCase();
      const isLiked = action !== 'unlike';
      return res.json({
        message: isLiked ? 'Curtida registrada (anônima)' : 'Curtida removida (anônima)',
        isLiked,
        anonymous: true,
      });
    }

    // Caminho autenticado (toggle)
    const existingLike = await prisma.curtidas.findUnique({
      where: {
        usuario_id_prompt_id: {
          usuario_id: toBig(req.user.id),
          prompt_id: toBig(id),
        },
      },
      select: { id: true },
    });

    if (existingLike) {
      await prisma.curtidas.delete({ where: { id: existingLike.id } });
      return res.json({ message: 'Curtida removida', isLiked: false, anonymous: false });
    } else {
      await prisma.curtidas.create({
        data: {
          usuario_id: toBig(req.user.id),
          prompt_id: toBig(id),
        },
        select: { id: true },
      });
      return res.json({ message: 'Prompt curtido', isLiked: true, anonymous: false });
    }
  } catch (error) {
    console.error('[promptsController.likePrompt] Erro:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ==============================
// GET /api/prompts/featured
// ==============================
export const getFeaturedPrompts = async (req, res) => {
  try {
    const rows = await prisma.prompts.findMany({
      where: { e_destaque: true, e_publico: true, foi_aprovado: true },
      take: 6,
      orderBy: { criado_em: 'desc' },
      select: {
        id: true,
        titulo: true,
        descricao: true,
        categoria: true,
        tags: true,
        visualizacoes: true,
        criado_em: true,
        atualizado_em: true,
        autor: { select: { id: true, nome: true, avatar: true, cargo: true } },
        especialidade: { select: { id: true, nome: true, cor: true, icone: true } },
        _count: { select: { curtidas: true, comentarios: true } },
      },
    });

    const data = rows.map((p) => ({
      ...p,
      likes: p._count.curtidas,
      comments: p._count.comentarios,
      isLiked: false,
      autor: p.autor ?? { id: null, nome: 'Usuário', avatar: null, cargo: '' },
    }));

    return res.json({ prompts: serializeBigInt(data) });
  } catch (error) {
    console.error('[promptsController.getFeaturedPrompts] Erro:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ==============================
// GET /api/prompts/:id/related
// Relacionados pela mesma categoria (mais curtidos -> mais vistos -> mais recentes)
// ==============================
export const getRelatedPrompts = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(10, Math.max(1, parseInt(req.query.limit ?? '3', 10)));

    const current = await prisma.prompts.findUnique({
      where: { id: toBig(id) },
      select: { categoria: true },
    });

    if (!current) {
      return res.status(404).json({ error: 'Prompt não encontrado' });
    }

    const rows = await prisma.prompts.findMany({
      where: {
        categoria: current.categoria,
        id: { not: toBig(id) },
        e_publico: true,
        foi_aprovado: true,
      },
      take: limit,
      orderBy: [
        { curtidas: { _count: 'desc' } },
        { visualizacoes: 'desc' },
        { criado_em: 'desc' },
      ],
      select: {
        id: true,
        titulo: true,
        descricao: true,
        categoria: true,
        tags: true,
        visualizacoes: true,
        criado_em: true,
        atualizado_em: true,
        autor: { select: { id: true, nome: true, avatar: true, cargo: true } },
        _count: { select: { curtidas: true, comentarios: true } },
      },
    });

    const data = rows.map((p) => ({
      ...p,
      likes: p._count.curtidas,
      comments: p._count.comentarios,
      autor: p.autor ?? { id: null, nome: 'Usuário', avatar: null, cargo: '' },
    }));

    return res.json({ prompts: serializeBigInt(data) });
  } catch (error) {
    console.error('[promptsController.getRelatedPrompts] Erro:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

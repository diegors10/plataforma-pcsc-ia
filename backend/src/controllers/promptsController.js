import prisma from '../config/database.js';

// Helpers para lidar com BigInt
const toBig = (v) => (v === null || v === undefined ? v : BigInt(v));
const toNum = (v) => (typeof v === 'bigint' ? Number(v) : v);
function serializeBigInt(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  // AJUSTE GPT: mantém objetos Date sem alterar
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj)) out[k] = serializeBigInt(obj[k]);
    return out;
  }
  return obj;
}

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
      where.OR = [
        { titulo: { contains: search, mode: 'insensitive' } },
        { descricao: { contains: search, mode: 'insensitive' } },
        // tags é String[] no schema; para busca simples por termo único:
        { tags: { has: search } },
      ];
    }

    if (category) where.categoria = category;
    if (author) where.autor_id = toBig(author);
    if (featured === 'true') where.e_destaque = true;

    // Ordenação
    let orderBy = {};
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
          conteudo: false,
          categoria: true,
          tags: true,
          visualizacoes: true,
          criado_em: true,
          atualizado_em: true,
          autor: {
            select: { id: true, nome: true, avatar: true },
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

    // Verificar likes do usuário autenticado
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
      }));
    } else {
      promptsWithLikes = rows.map((p) => ({
        ...p,
        isLiked: false,
        likes: p._count.curtidas,
        comments: p._count.comentarios,
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
    console.error('Erro ao buscar prompts:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getPromptById = async (req, res) => {
  try {
    const { id } = req.params;

    // findUnique não aceita filtros não-únicos; use findFirst com todos os filtros
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

    // Incrementar visualizações
    await prisma.prompts.update({
      where: { id: toBig(id) },
      data: { visualizacoes: { increment: 1 } },
      select: { id: true }, // evita retornar BigInt no update
    });

    // Verificar like do usuário
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

    return res.json(
      serializeBigInt({
        ...prompt,
        isLiked,
        likes: prompt._count.curtidas,
        comments: prompt._count.comentarios,
        views: toNum(prompt.visualizacoes) + 1,
      })
    );
  } catch (error) {
    console.error('Erro ao buscar prompt:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

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

    // Inclui foi_aprovado: true para permitir que novos prompts fiquem visíveis
    // imediatamente sem depender de moderação manual.
    const prompt = await prisma.prompts.create({
      data: {
        titulo,
        descricao,
        conteudo,
        categoria,
        tags: Array.isArray(tags) ? tags : [],
        especialidade_id: especialidade_id ? toBig(especialidade_id) : null,
        e_publico,
        // AJUSTE GPT: define aprovação automática para novos prompts
        foi_aprovado: true,
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
        autor: { select: { id: true, nome: true, avatar: true } },
        especialidade: { select: { id: true, nome: true, cor: true, icone: true } },
      },
    });

    return res.status(201).json(
      serializeBigInt({
        message: 'Prompt criado com sucesso',
        prompt: {
          ...prompt,
          likes: 0,
          comments: 0,
          isLiked: false,
        },
      })
    );
  } catch (error) {
    console.error('Erro ao criar prompt:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

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
        autor: { select: { id: true, nome: true, avatar: true } },
        especialidade: { select: { id: true, nome: true, cor: true, icone: true } },
        _count: { select: { curtidas: true, comentarios: true } },
      },
    });

    return res.json(
      serializeBigInt({
        message: 'Prompt atualizado com sucesso',
        prompt: {
          ...updated,
          likes: updated._count.curtidas,
          comments: updated._count.comentarios,
        },
      })
    );
  } catch (error) {
    console.error('Erro ao atualizar prompt:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

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
    console.error('Erro ao excluir prompt:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const likePrompt = async (req, res) => {
  try {
    const { id } = req.params;

    // Confere existência do prompt (para responder 404 se for inválido)
    const prompt = await prisma.prompts.findUnique({
      where: { id: BigInt(id) },
      select: { id: true },
    });

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt não encontrado' });
    }

    // Se NÃO estiver autenticado, responde sucesso "efêmero" (sem tocar no banco)
    if (!req.user) {
      // opcional: o frontend pode enviar body { action: 'like' | 'unlike' }
      const action = (req.body?.action || 'like').toLowerCase();
      const isLiked = action !== 'unlike';

      return res.json({
        message: isLiked ? 'Curtida registrada (anônima)' : 'Curtida removida (anônima)',
        isLiked,
        anonymous: true,     // dica pro front tratar como “local only”
      });
    }

    // ------- caminho autenticado: toggle no banco -------
    const existingLike = await prisma.curtidas.findUnique({
      where: {
        usuario_id_prompt_id: {
          usuario_id: BigInt(req.user.id),
          prompt_id: BigInt(id),
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
          usuario_id: BigInt(req.user.id),
          prompt_id: BigInt(id),
        },
        select: { id: true },
      });
      return res.json({ message: 'Prompt curtido', isLiked: true, anonymous: false });
    }
  } catch (error) {
    console.error('Erro ao curtir prompt:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};


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
        autor: { select: { id: true, nome: true, avatar: true } },
        especialidade: { select: { id: true, nome: true, cor: true, icone: true } },
        _count: { select: { curtidas: true, comentarios: true } },
      },
    });

    const data = rows.map((p) => ({
      ...p,
      likes: p._count.curtidas,
      comments: p._count.comentarios,
      isLiked: false,
    }));

    return res.json({ prompts: serializeBigInt(data) });
  } catch (error) {
    console.error('Erro ao buscar prompts em destaque:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Prompts relacionados pela mesma categoria, ordenados pelos mais curtidos.
 */
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
        autor: { select: { id: true, nome: true, avatar: true } },
        _count: { select: { curtidas: true, comentarios: true } },
      },
    });

    const data = rows.map((p) => ({
      ...p,
      likes: p._count.curtidas,
      comments: p._count.comentarios,
    }));

    return res.json({ prompts: serializeBigInt(data) });
  } catch (error) {
    console.error('Erro ao buscar prompts relacionados:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

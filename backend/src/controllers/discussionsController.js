import prisma from '../config/database.js';

// Helpers
const toBig = (v) => (v === null || v === undefined ? v : BigInt(v));
const toBool = (v) => (v === true || v === 'true'); // trata boolean/string
const toNum = (v, def = 0) => (typeof v === 'bigint' ? Number(v) : (v ?? def));

// Serialização segura para JSON
function serializeBigInt(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj)) out[k] = serializeBigInt(obj[k]);
    return out;
  }
  return obj;
}

// ============================================================
//  GET /api/discussions/:id/posts
//  Lista posts de uma discussão com paginação e estado de like
//  Query: page (1), limit (20), sort: recent | popular | comments
// ============================================================
export const getPostsByDiscussion = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20', sort = 'recent' } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * take;

    // Confere existência da discussão
    const discussion = await prisma.discussoes.findUnique({
      where: { id: toBig(id) },
      select: { id: true }
    });
    if (!discussion) {
      return res.status(404).json({ error: 'Discussão não encontrada' });
    }

    // Ordenação
    let orderBy;
    switch (sort) {
      case 'popular':
        orderBy = { curtidas: { _count: 'desc' } };
        break;
      case 'comments':
        orderBy = { comentarios: { _count: 'desc' } };
        break;
      case 'recent':
      default:
        orderBy = { criado_em: 'desc' };
        break;
    }

    const where = { discussao_id: toBig(id) };

    const [rows, total] = await Promise.all([
      prisma.postagens.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          conteudo: true,
          criado_em: true,
          atualizado_em: true,
          foi_aprovado: true,
          visualizacoes: true,
          autor: { // relação correta segundo seu schema
            select: { id: true, nome: true, avatar: true, cargo: true }
          },
          _count: { select: { curtidas: true, comentarios: true } }
        }
      }),
      prisma.postagens.count({ where })
    ]);

    // Descobrir likes do usuário autenticado (se houver)
    let likedSet = new Set();
    if (req.user && rows.length) {
      const likes = await prisma.curtidas.findMany({
        where: {
          usuario_id: toBig(req.user.id),
          postagem_id: { in: rows.map((p) => p.id) }
        },
        select: { postagem_id: true }
      });
      likedSet = new Set(likes.map((l) => String(l.postagem_id)));
    }

    const posts = rows.map((p) => ({
      ...p,
      likes: p._count.curtidas,
      comments: p._count.comentarios,
      isLiked: req.user ? likedSet.has(String(p.id)) : false
    }));

    return res.json(serializeBigInt({
      posts,
      pagination: {
        page: pageNum,
        limit: take,
        total,
        pages: Math.max(1, Math.ceil(total / take))
      }
    }));
  } catch (error) {
    console.error('Erro em getPostsByDiscussion:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};


export const getAllDiscussions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      sort = 'recent',
      pinned
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * take;

    // Filtros
    const where = {};

    if (search) {
      where.OR = [
        { titulo: { contains: search, mode: 'insensitive' } },
        { descricao: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category) {
      where.categoria = category;
    }

    if (pinned === 'true') {
      where.esta_fixado = true;
    }

    // Ordenação
    let orderBy;
    switch (sort) {
      case 'views':
        orderBy = { visualizacoes: 'desc' };
        break;
      case 'posts':
        orderBy = { postagens: { _count: 'desc' } };
        break;
      case 'recent':
      default:
        orderBy = [
          { esta_fixado: 'desc' }, // Fixados primeiro
          { atualizado_em: 'desc' }
        ];
        break;
    }

    // Consulta
    const [rows, total] = await Promise.all([
      prisma.discussoes.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          titulo: true,
          descricao: true,
          categoria: true,
          e_aberta: true,
          esta_fixado: true,
          esta_bloqueado: true,
          visualizacoes: true,
          criado_em: true,
          atualizado_em: true,
          autor: { // relação correta
            select: { id: true, nome: true, avatar: true, cargo: true }
          },
          _count: { select: { postagens: true } },
          postagens: {
            take: 1,
            orderBy: { criado_em: 'desc' },
            select: {
              id: true,
              conteudo: true,
              criado_em: true,
              autor: { // relação correta
                select: { id: true, nome: true, avatar: true }
              }
            }
          }
        }
      }),
      prisma.discussoes.count({ where })
    ]);

    const discussionsWithLastPost = rows.map((d) => ({
      ...d,
      posts: d._count.postagens,
      lastPost: d.postagens[0] || null,
      e_aberta: d.e_aberta
    }));

    return res.json(serializeBigInt({
      discussions: discussionsWithLastPost,
      pagination: {
        page: pageNum,
        limit: take,
        total,
        pages: Math.max(1, Math.ceil(total / take))
      }
    }));
  } catch (error) {
    console.error('Erro ao buscar discussões:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getDiscussionById = async (req, res) => {
  try {
    const { id } = req.params;

    const discussion = await prisma.discussoes.findUnique({
      where: { id: toBig(id) },
      select: {
        id: true,
        titulo: true,
        descricao: true,
        categoria: true,
        e_aberta: true,
        esta_fixado: true,
        esta_bloqueado: true,
        visualizacoes: true,
        criado_em: true,
        atualizado_em: true,
        autor: {
          select: {
            id: true,
            nome: true,
            avatar: true,
            cargo: true,
            departamento: true
          }
        },
        _count: { select: { postagens: true } }
      }
    });

    if (!discussion) {
      return res.status(404).json({ error: 'Discussão não encontrada' });
    }

    // Incrementar visualizações
    await prisma.discussoes.update({
      where: { id: toBig(id) },
      data: { visualizacoes: { increment: 1 } },
      select: { id: true } // evita carregar tudo e BigInt desnecessário
    });

    return res.json(serializeBigInt({
      ...discussion,
      posts: discussion._count?.postagens ?? 0,
      // Garante Number antes de somar 1 (evita BigInt + Number)
      views: toNum(discussion.visualizacoes, 0) + 1,
      e_aberta: discussion.e_aberta
    }));
  } catch (error) {
    console.error('Erro ao buscar discussão:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const createDiscussion = async (req, res) => {
  try {
    const {
      titulo,
      descricao,
      categoria,
      e_aberta
    } = req.body;

    // Valor padrão: discussões são abertas se não especificado
    const isOpen = e_aberta !== undefined ? toBool(e_aberta) : true;

    const discussion = await prisma.discussoes.create({
      data: {
        titulo,
        descricao,
        categoria,
        autor_id: toBig(req.user.id),
        e_aberta: isOpen
      },
      select: {
        id: true,
        titulo: true,
        descricao: true,
        categoria: true,
        e_aberta: true,
        esta_fixado: true,
        esta_bloqueado: true,
        visualizacoes: true,
        criado_em: true,
        atualizado_em: true,
        autor: {
          select: { id: true, nome: true, avatar: true, cargo: true }
        }
      }
    });

    return res.status(201).json(serializeBigInt({
      message: 'Discussão criada com sucesso',
      discussion: {
        ...discussion,
        posts: 0,
        lastPost: null,
        e_aberta: discussion.e_aberta
      }
    }));
  } catch (error) {
    console.error('Erro ao criar discussão:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const updateDiscussion = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titulo,
      descricao,
      categoria,
      esta_fixado,
      esta_bloqueado,
      e_aberta
    } = req.body;

    // Verificar se existe
    const existingDiscussion = await prisma.discussoes.findUnique({
      where: { id: toBig(id) },
      select: { id: true, autor_id: true }
    });

    if (!existingDiscussion) {
      return res.status(404).json({ error: 'Discussão não encontrada' });
    }

    // Permissões
    const isAuthor = existingDiscussion.autor_id === toBig(req.user.id);
    const canEdit = isAuthor || req.user.e_moderador;
    const canModerate = req.user.e_moderador || req.user.e_admin;

    if (!canEdit) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const updateData = {
      ...(titulo !== undefined ? { titulo } : {}),
      ...(descricao !== undefined ? { descricao } : {}),
      ...(categoria !== undefined ? { categoria } : {}),
    };

    if (canModerate) {
      if (esta_fixado !== undefined) updateData.esta_fixado = toBool(esta_fixado);
      if (esta_bloqueado !== undefined) updateData.esta_bloqueado = toBool(esta_bloqueado);
    }

    // Autor ou moderador pode alterar aberta/fechada
    if (e_aberta !== undefined) {
      updateData.e_aberta = toBool(e_aberta);
    }

    const discussion = await prisma.discussoes.update({
      where: { id: toBig(id) },
      data: updateData,
      select: {
        id: true,
        titulo: true,
        descricao: true,
        categoria: true,
        e_aberta: true,
        esta_fixado: true,
        esta_bloqueado: true,
        visualizacoes: true,
        criado_em: true,
        atualizado_em: true,
        autor: {
          select: { id: true, nome: true, avatar: true, cargo: true }
        },
        _count: { select: { postagens: true } }
      }
    });

    return res.json(serializeBigInt({
      message: 'Discussão atualizada com sucesso',
      discussion: {
        ...discussion,
        posts: discussion._count.postagens
      }
    }));
  } catch (error) {
    console.error('Erro ao atualizar discussão:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const deleteDiscussion = async (req, res) => {
  try {
    const { id } = req.params;

    const existingDiscussion = await prisma.discussoes.findUnique({
      where: { id: toBig(id) },
      select: { id: true, autor_id: true }
    });

    if (!existingDiscussion) {
      return res.status(404).json({ error: 'Discussão não encontrada' });
    }

    if (existingDiscussion.autor_id !== toBig(req.user.id) && !req.user.e_moderador) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    await prisma.discussoes.delete({ where: { id: toBig(id) } });

    return res.json({ message: 'Discussão excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir discussão:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

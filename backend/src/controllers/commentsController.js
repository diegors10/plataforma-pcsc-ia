import prisma from '../config/database.js';

// Helpers para BigInt
const toBig = (v) => (v === null || v === undefined ? v : BigInt(v));
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
//  GET /prompts/:promptId/comments
// ============================================================
export const getCommentsByPrompt = async (req, res) => {
  try {
    const { promptId } = req.params;
    const promptIdNum = toBig(promptId);

    // Verifica se o prompt existe
    const promptExists = await prisma.prompts.findUnique({
      where: { id: promptIdNum },
      select: { id: true },
    });

    if (!promptExists) {
      return res.status(404).json({ error: 'Prompt não encontrado' });
    }

    // Comentários raiz (apenas aprovados, a menos que moderador)
    const whereRoot = req.user?.e_moderador
      ? { prompt_id: promptIdNum, comentario_pai_id: null }
      : { prompt_id: promptIdNum, comentario_pai_id: null, foi_aprovado: true };

    const comments = await prisma.comentarios.findMany({
      where: whereRoot,
      include: {
        // Relação correta conforme schema: 'autor'
        autor: {
          select: { id: true, nome: true, avatar: true, cargo: true },
        },
        // Respostas aninhadas com filtro por aprovação se não moderador
        respostas: {
          where: req.user?.e_moderador
            ? {}
            : { foi_aprovado: true },
          include: {
            autor: { select: { id: true, nome: true, avatar: true, cargo: true } },
            _count: { select: { curtidas: true } },
          },
          orderBy: { criado_em: 'asc' },
        },
        _count: { select: { curtidas: true } },
      },
      orderBy: { criado_em: 'desc' },
    });

    // IDs de comentários e respostas para checar curtidas do usuário
    const allIds = [];
    for (const c of comments) {
      allIds.push(c.id);
      if (c.respostas?.length) {
        for (const r of c.respostas) allIds.push(r.id);
      }
    }

    // Curtidas do usuário autenticado
    let likedSet = new Set();
    if (req.user && allIds.length > 0) {
      const likes = await prisma.curtidas.findMany({
        where: {
          usuario_id: toBig(req.user.id),
          comentario_id: { in: allIds },
        },
        select: { comentario_id: true },
      });
      likedSet = new Set(likes.map((l) => String(l.comentario_id)));
    }

    // Monta payload com likes/isLiked
    const adapted = comments.map((c) => {
      const isLiked = likedSet.has(String(c.id));
      const replies = (c.respostas || []).map((r) => ({
        ...r,
        likes: r._count?.curtidas ?? 0,
        isLiked: req.user ? likedSet.has(String(r.id)) : false,
      }));
      return {
        ...c,
        likes: c._count?.curtidas ?? 0,
        isLiked,
        respostas: replies,
      };
    });

    return res.json({ comments: serializeBigInt(adapted) });
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================
//  POST /prompts/:promptId/comments
// ============================================================
export const createComment = async (req, res) => {
  try {
    const { promptId } = req.params;
    const { conteudo, comentario_pai_id } = req.body;

    const promptIdNum = toBig(promptId);
    const parentId = comentario_pai_id ? toBig(comentario_pai_id) : null;

    // Verifica existência do prompt
    const promptExists = await prisma.prompts.findUnique({
      where: { id: promptIdNum },
      select: { id: true },
    });

    if (!promptExists) {
      return res.status(404).json({ error: 'Prompt não encontrado' });
    }

    const created = await prisma.comentarios.create({
      data: {
        conteudo,
        autor_id: toBig(req.user.id),
        prompt_id: promptIdNum,
        comentario_pai_id: parentId,
        foi_aprovado: !!req.user.e_moderador,
      },
      include: {
        autor: { select: { id: true, nome: true, avatar: true, cargo: true } },
        _count: { select: { curtidas: true } },
      },
    });

    return res.status(201).json(
      serializeBigInt({
        message: 'Comentário criado com sucesso',
        comment: {
          ...created,
          likes: created._count?.curtidas ?? 0,
          isLiked: false,
        },
      })
    );
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================
//  PUT /comments/:id
// ============================================================
export const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { conteudo } = req.body;
    const commentId = toBig(id);

    const existing = await prisma.comentarios.findUnique({
      where: { id: commentId },
      select: { id: true, autor_id: true, foi_aprovado: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }

    if (existing.autor_id !== toBig(req.user.id) && !req.user.e_moderador) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const updated = await prisma.comentarios.update({
      where: { id: commentId },
      data: {
        conteudo,
        foi_aprovado: req.user.e_moderador ? existing.foi_aprovado : false,
      },
      include: {
        autor: { select: { id: true, nome: true, avatar: true, cargo: true } },
        _count: { select: { curtidas: true } },
      },
    });

    return res.json(
      serializeBigInt({
        message: 'Comentário atualizado com sucesso',
        comment: {
          ...updated,
          likes: updated._count?.curtidas ?? 0,
          isLiked: false, // não recalculamos aqui
        },
      })
    );
  } catch (error) {
    console.error('Erro ao atualizar comentário:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================
//  DELETE /comments/:id
// ============================================================
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const commentId = toBig(id);

    const existing = await prisma.comentarios.findUnique({
      where: { id: commentId },
      select: { id: true, autor_id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }

    if (existing.autor_id !== toBig(req.user.id) && !req.user.e_moderador) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    await prisma.comentarios.delete({ where: { id: commentId } });

    return res.json({ message: 'Comentário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir comentário:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================
//  POST /comments/:id/like  (aceita anônimo)
// ============================================================
export const likeComment = async (req, res) => {
  try {
    const { id } = req.params;
    const commentId = toBig(id);

    const comment = await prisma.comentarios.findUnique({
      where: { id: commentId },
      select: { id: true },
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }

    // Anônimo: não altera banco, apenas responde para o front atualizar localmente
    if (!req.user) {
      const action = (req.body?.action || 'like').toLowerCase();
      const isLiked = action !== 'unlike';
      return res.json({
        message: isLiked ? 'Curtida registrada (anônima)' : 'Curtida removida (anônima)',
        isLiked,
        anonymous: true,
      });
    }

    // Autenticado: toggle no banco
    const existingLike = await prisma.curtidas.findUnique({
      where: {
        usuario_id_comentario_id: {
          usuario_id: toBig(req.user.id),
          comentario_id: commentId,
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
          comentario_id: commentId,
        },
        select: { id: true },
      });
      return res.json({ message: 'Comentário curtido', isLiked: true, anonymous: false });
    }
  } catch (error) {
    console.error('Erro ao curtir comentário:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

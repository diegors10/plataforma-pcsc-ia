import prisma from '../config/database.js';

// Helpers BigInt -> Number para JSON
const toBig = (v) => (v === null || v === undefined ? v : BigInt(v));
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

// ============================================================
//  GET /prompts/:promptId/comments
//  -> NÃO filtra mais por "foi_aprovado"; todos os comentários são visíveis.
// ============================================================
export const getCommentsByPrompt = async (req, res) => {
  try {
    const { promptId } = req.params;
    const promptIdNum = toBig(promptId);

    const promptExists = await prisma.prompts.findUnique({
      where: { id: promptIdNum },
      select: { id: true },
    });
    if (!promptExists) {
      return res.status(404).json({ error: 'Prompt não encontrado' });
    }

    const comments = await prisma.comentarios.findMany({
      where: { prompt_id: promptIdNum, comentario_pai_id: null },
      include: {
        usuarios: {
          select: { id: true, nome: true, avatar: true, cargo: true },
        },
        respostas: {
          include: {
            usuarios: {
              select: { id: true, nome: true, avatar: true, cargo: true },
            },
            _count: { select: { curtidas: true } },
          },
          orderBy: { criado_em: 'asc' },
        },
        _count: { select: { curtidas: true } },
      },
      orderBy: { criado_em: 'desc' },
    });

    // prepara lista de ids pra like do usuário (se houver)
    const allIds = [];
    for (const c of comments) {
      allIds.push(c.id);
      for (const r of c.respostas) allIds.push(r.id);
    }

    let likedSet = new Set();
    if (req.user && allIds.length > 0) {
      const userLikes = await prisma.curtidas.findMany({
        where: {
          usuario_id: toBig(req.user.id),
          comentario_id: { in: allIds },
        },
        select: { comentario_id: true },
      });
      likedSet = new Set(userLikes.map((x) => String(x.comentario_id)));
    }

    const adapted = comments.map((c) => ({
      ...c,
      likes: c._count?.curtidas ?? 0,
      isLiked: likedSet.has(String(c.id)),
      respostas: (c.respostas || []).map((r) => ({
        ...r,
        likes: r._count?.curtidas ?? 0,
        isLiked: likedSet.has(String(r.id)),
      })),
    }));

    return res.json(serializeBigInt({ comments: adapted }));
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================
//  POST /prompts/:promptId/comments
//  -> Sempre salva com "foi_aprovado: true" (sem aprovação prévia).
// ============================================================
export const createComment = async (req, res) => {
  try {
    const { promptId } = req.params;
    const { conteudo, comentario_pai_id } = req.body;

    const promptIdNum = toBig(promptId);
    const parentId = comentario_pai_id ? toBig(comentario_pai_id) : null;

    const promptExists = await prisma.prompts.findUnique({
      where: { id: promptIdNum },
      select: { id: true },
    });
    if (!promptExists) {
      return res.status(404).json({ error: 'Prompt não encontrado' });
    }

    const comment = await prisma.comentarios.create({
      data: {
        conteudo,
        autor_id: toBig(req.user.id),
        prompt_id: promptIdNum,
        comentario_pai_id: parentId,
        foi_aprovado: true, // <-- sem fila de aprovação
      },
      include: {
        usuarios: {
          select: { id: true, nome: true, avatar: true, cargo: true },
        },
        _count: { select: { curtidas: true } },
      },
    });

    return res.status(201).json(
      serializeBigInt({
        message: 'Comentário criado com sucesso',
        comment: {
          ...comment,
          likes: comment._count?.curtidas ?? 0,
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
    if (!existing) return res.status(404).json({ error: 'Comentário não encontrado' });

    if (existing.autor_id !== toBig(req.user.id) && !req.user.e_moderador) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const updated = await prisma.comentarios.update({
      where: { id: commentId },
      data: {
        conteudo,
        // não mexe mais em aprovação; comentários já são aprovados por padrão
      },
      include: {
        usuarios: {
          select: { id: true, nome: true, avatar: true, cargo: true },
        },
        _count: { select: { curtidas: true } },
      },
    });

    return res.json(
      serializeBigInt({
        message: 'Comentário atualizado com sucesso',
        comment: {
          ...updated,
          likes: updated._count?.curtidas ?? 0,
          isLiked: false,
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
    if (!existing) return res.status(404).json({ error: 'Comentário não encontrado' });

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
//  POST /comments/:id/like
//  (mantém a necessidade de usuário logado; se quiser like anônimo,
//   podemos adaptar depois como fizemos nos prompts)
// ============================================================
export const likeComment = async (req, res) => {
  try {
    const { id } = req.params;
    const commentId = toBig(id);

    const comment = await prisma.comentarios.findUnique({
      where: { id: commentId },
      select: { id: true },
    });
    if (!comment) return res.status(404).json({ error: 'Comentário não encontrado' });

    const existingLike = await prisma.curtidas.findUnique({
      where: {
        usuario_id_comentario_id: {
          usuario_id: toBig(req.user.id),
          comentario_id: commentId,
        },
      },
    });

    if (existingLike) {
      await prisma.curtidas.delete({ where: { id: existingLike.id } });
      return res.json({ message: 'Curtida removida', isLiked: false });
    }

    await prisma.curtidas.create({
      data: {
        usuario_id: toBig(req.user.id),
        comentario_id: commentId,
      },
    });
    return res.json({ message: 'Comentário curtido', isLiked: true });
  } catch (error) {
    console.error('Erro ao curtir comentário:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

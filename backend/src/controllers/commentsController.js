import prisma from '../config/database.js';

/**
 * Helpers seguros p/ tipos e serialização
 */
const toBig = (v) => {
  if (v === null || v === undefined) return v;
  if (typeof v === 'bigint') return v;
  if (typeof v === 'number') return BigInt(v);
  if (typeof v === 'string' && /^-?\d+$/.test(v.trim())) return BigInt(v.trim());
  return null;
};

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

/**
 * GET /prompts/:promptId/comments
 * Corrige o erro do Prisma usando a relação correta `autor` no modelo `comentarios`
 * e adapta a resposta para expor `usuarios` (mantendo compatibilidade com o frontend).
 */
export const getCommentsByPrompt = async (req, res) => {
  try {
    const { promptId } = req.params;
    const promptIdBig = toBig(promptId);
    if (promptIdBig === null) {
      return res.status(400).json({ error: 'Parâmetro promptId inválido' });
    }

    // valida existência do prompt
    const exists = await prisma.prompts.findUnique({
      where: { id: promptIdBig },
      select: { id: true },
    });
    if (!exists) {
      return res.status(404).json({ error: 'Prompt não encontrado' });
    }

    // Comentários raiz
    const roots = await prisma.comentarios.findMany({
      where: { prompt_id: promptIdBig, comentario_pai_id: null },
      orderBy: { criado_em: 'desc' },
      select: {
        id: true,
        conteudo: true,
        criado_em: true,
        atualizado_em: true,
        autor_id: true,
        comentario_pai_id: true,
        // RELAÇÃO CORRETA NO SCHEMA
        autor: { select: { id: true, nome: true, avatar: true, cargo: true } },
        _count: { select: { curtidas: true } },
      },
    });

    const parentIds = roots.map((c) => c.id);

    // Respostas (filhos) — consulta separada para evitar dependência de nome de relação opcional
    let childs = [];
    if (parentIds.length > 0) {
      childs = await prisma.comentarios.findMany({
        where: { comentario_pai_id: { in: parentIds } },
        orderBy: { criado_em: 'asc' },
        select: {
          id: true,
          conteudo: true,
          criado_em: true,
          atualizado_em: true,
          autor_id: true,
          comentario_pai_id: true,
          autor: { select: { id: true, nome: true, avatar: true, cargo: true } },
          _count: { select: { curtidas: true } },
        },
      });
    }

    // Likes do usuário autenticado (se houver)
    const allIds = [...parentIds, ...childs.map((r) => r.id)];
    let likedSet = new Set();
    if (req.user && allIds.length > 0) {
      const likes = await prisma.curtidas.findMany({
        where: { usuario_id: toBig(req.user.id), comentario_id: { in: allIds } },
        select: { comentario_id: true },
      });
      likedSet = new Set(likes.map((x) => String(x.comentario_id)));
    }

    // Agrupa filhos pelo pai
    const childrenByParent = new Map();
    for (const r of childs) {
      const arr = childrenByParent.get(String(r.comentario_pai_id)) || [];
      arr.push({
        id: r.id,
        conteudo: r.conteudo,
        criado_em: r.criado_em,
        atualizado_em: r.atualizado_em,
        // Adapta `autor` -> `usuarios` p/ compatibilidade no frontend
        usuarios: r.autor ? { ...r.autor } : null,
        likes: r._count?.curtidas ?? 0,
        isLiked: likedSet.has(String(r.id)),
      });
      childrenByParent.set(String(r.comentario_pai_id), arr);
    }

    // Adapta raízes + respostas (expondo `usuarios`)
    const adapted = roots.map((c) => ({
      id: c.id,
      conteudo: c.conteudo,
      criado_em: c.criado_em,
      atualizado_em: c.atualizado_em,
      usuarios: c.autor ? { ...c.autor } : null,
      likes: c._count?.curtidas ?? 0,
      isLiked: likedSet.has(String(c.id)),
      respostas: childrenByParent.get(String(c.id)) || [],
    }));

    return res.json(serializeBigInt({ comments: adapted }));
  } catch (error) {
    console.error('Erro em getCommentsByPrompt:', error);
    return res.status(500).json({ error: 'Erro interno do servidor ao carregar comentários' });
  }
};

/**
 * POST /prompts/:promptId/comments
 * Cria comentário (ou resposta) já aprovado e retorna estrutura compatível.
 */
export const createComment = async (req, res) => {
  try {
    const { promptId } = req.params;
    const { conteudo, comentario_pai_id } = req.body;

    const promptIdBig = toBig(promptId);
    if (promptIdBig === null) return res.status(400).json({ error: 'Parâmetro promptId inválido' });

    const parentIdBig = comentario_pai_id != null ? toBig(comentario_pai_id) : null;
    if (comentario_pai_id != null && parentIdBig === null) {
      return res.status(400).json({ error: 'comentario_pai_id inválido' });
    }

    const exists = await prisma.prompts.findUnique({
      where: { id: promptIdBig },
      select: { id: true },
    });
    if (!exists) return res.status(404).json({ error: 'Prompt não encontrado' });

    const comment = await prisma.comentarios.create({
      data: {
        conteudo: String(conteudo ?? '').trim(),
        autor_id: toBig(req.user.id),
        prompt_id: promptIdBig,
        comentario_pai_id: parentIdBig,
        foi_aprovado: true,
      },
      select: {
        id: true,
        conteudo: true,
        criado_em: true,
        atualizado_em: true,
        autor: { select: { id: true, nome: true, avatar: true, cargo: true } },
        _count: { select: { curtidas: true } },
      },
    });

    return res.status(201).json(
      serializeBigInt({
        message: 'Comentário criado com sucesso',
        comment: {
          id: comment.id,
          conteudo: comment.conteudo,
          criado_em: comment.criado_em,
          atualizado_em: comment.atualizado_em,
          usuarios: comment.autor ? { ...comment.autor } : null,
          likes: comment._count?.curtidas ?? 0,
          isLiked: false,
          respostas: [],
        },
      })
    );
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    return res.status(500).json({ error: 'Erro interno do servidor ao criar comentário' });
  }
};

/**
 * PUT /comments/:id
 */
export const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { conteudo } = req.body;

    const commentId = toBig(id);
    if (commentId === null) return res.status(400).json({ error: 'Parâmetro id inválido' });

    const existing = await prisma.comentarios.findUnique({
      where: { id: commentId },
      select: { id: true, autor_id: true },
    });
    if (!existing) return res.status(404).json({ error: 'Comentário não encontrado' });

    const isOwner = String(existing.autor_id) === String(toBig(req.user.id));
    if (!isOwner && !req.user?.e_moderador) return res.status(403).json({ error: 'Acesso negado' });

    const updated = await prisma.comentarios.update({
      where: { id: commentId },
      data: { conteudo: String(conteudo ?? '').trim() },
      select: {
        id: true,
        conteudo: true,
        criado_em: true,
        atualizado_em: true,
        autor: { select: { id: true, nome: true, avatar: true, cargo: true } },
        _count: { select: { curtidas: true } },
      },
    });

    return res.json(
      serializeBigInt({
        message: 'Comentário atualizado com sucesso',
        comment: {
          id: updated.id,
          conteudo: updated.conteudo,
          criado_em: updated.criado_em,
          atualizado_em: updated.atualizado_em,
          usuarios: updated.autor ? { ...updated.autor } : null,
          likes: updated._count?.curtidas ?? 0,
          isLiked: false,
        },
      })
    );
  } catch (error) {
    console.error('Erro ao atualizar comentário:', error);
    return res.status(500).json({ error: 'Erro interno do servidor ao atualizar comentário' });
  }
};

/**
 * DELETE /comments/:id
 */
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const commentId = toBig(id);
    if (commentId === null) return res.status(400).json({ error: 'Parâmetro id inválido' });

    const existing = await prisma.comentarios.findUnique({
      where: { id: commentId },
      select: { id: true, autor_id: true },
    });
    if (!existing) return res.status(404).json({ error: 'Comentário não encontrado' });

    const isOwner = String(existing.autor_id) === String(toBig(req.user.id));
    if (!isOwner && !req.user?.e_moderador) return res.status(403).json({ error: 'Acesso negado' });

    await prisma.comentarios.delete({ where: { id: commentId } });
    return res.json({ message: 'Comentário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir comentário:', error);
    return res.status(500).json({ error: 'Erro interno do servidor ao excluir comentário' });
  }
};

/**
 * POST /comments/:id/like
 */
export const likeComment = async (req, res) => {
  try {
    const { id } = req.params;
    const commentId = toBig(id);
    if (commentId === null) return res.status(400).json({ error: 'Parâmetro id inválido' });

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
      data: { usuario_id: toBig(req.user.id), comentario_id: commentId },
    });
    return res.json({ message: 'Comentário curtido', isLiked: true });
  } catch (error) {
    console.error('Erro ao curtir comentário:', error);
    return res.status(500).json({ error: 'Erro interno do servidor ao curtir comentário' });
  }
};

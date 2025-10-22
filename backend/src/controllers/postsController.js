import prisma from '../config/database.js';

// ===== Helpers =====
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
 * Constrói DTO de Post compatível com o frontend (usa `usuarios` como autor)
 */
const buildPostDTO = (row, author, counts = { curtidas: 0, comentarios: 0 }, isLiked = false) => ({
  id: row.id,
  conteudo: row.conteudo,
  criado_em: row.criado_em,
  atualizado_em: row.atualizado_em,
  usuarios: author
    ? {
        id: author.id,
        nome: author.nome,
        avatar: author.avatar,
        cargo: author.cargo,
        departamento: author.departamento ?? null,
      }
    : null,
  likes: counts.curtidas ?? 0,
  comments: counts.comentarios ?? 0,
  isLiked,
});

// ===================================================================
// POST /api/discussions/:id/posts
// Cria uma nova postagem dentro de uma discussão.
// -> Usa RELAÇÕES obrigatórias `autor` e `discussao` com connect:{ id }.
// ===================================================================
export const createPost = async (req, res) => {
  try {
    const { id } = req.params; // discussao_id (na URL)
    const { conteudo } = req.body;

    const discussaoId = toBig(id);
    const autorId = toBig(req.user?.id);

    if (discussaoId === null) {
      return res.status(400).json({ error: 'Parâmetro id (discussão) inválido' });
    }
    if (!conteudo || String(conteudo).trim() === '') {
      return res.status(400).json({ error: 'Conteúdo obrigatório' });
    }
    if (autorId === null) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Garante que a discussão existe
    const discussion = await prisma.discussoes.findUnique({
      where: { id: discussaoId },
      select: { id: true }
    });
    if (!discussion) {
      return res.status(404).json({ error: 'Discussão não encontrada' });
    }

    // IMPORTANTE: quando o schema usa relação implícita/obrigatória,
    // é necessário conectar via `discussao: { connect: { id } }` (não usar discussao_id),
    // e também via `autor: { connect: { id } }`.
    const created = await prisma.postagens.create({
      data: {
        conteudo: String(conteudo).trim(),
        foi_aprovado: true,
        autor: { connect: { id: autorId } },
        discussao: { connect: { id: discussaoId } },
      },
      select: {
        id: true,
        conteudo: true,
        criado_em: true,
        atualizado_em: true,
        autor_id: true,
        _count: { select: { curtidas: true, comentarios: true } },
      }
    });

    // Resolve autor via tabela usuarios
    const author = await prisma.usuarios.findUnique({
      where: { id: created.autor_id },
      select: { id: true, nome: true, avatar: true, cargo: true, departamento: true }
    });

    const postDTO = buildPostDTO(created, author, created._count, false);
    return res.status(201).json(serializeBigInt({ message: 'Post criado com sucesso', post: postDTO }));
  } catch (error) {
    console.error('[postsController.createPost]', error);
    return res.status(500).json({ error: 'Erro interno do servidor ao criar post' });
  }
};

// ===================================================================
// PUT /api/posts/:postId
// Edita o conteúdo de uma postagem (autor ou moderador/admin).
// ===================================================================
export const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { conteudo } = req.body;

    const pid = toBig(postId);
    if (pid === null) return res.status(400).json({ error: 'Parâmetro postId inválido' });
    if (!conteudo || String(conteudo).trim() === '') {
      return res.status(400).json({ error: 'Conteúdo obrigatório' });
    }

    const existing = await prisma.postagens.findUnique({
      where: { id: pid },
      select: { id: true, autor_id: true }
    });
    if (!existing) return res.status(404).json({ error: 'Post não encontrado' });

    const currentUserId = toBig(req.user?.id);
    const isOwner = currentUserId && String(existing.autor_id) === String(currentUserId);
    const canEdit = isOwner || req.user?.e_moderador || req.user?.e_admin;
    if (!canEdit) return res.status(403).json({ error: 'Acesso negado' });

    const updated = await prisma.postagens.update({
      where: { id: pid },
      data: { conteudo: String(conteudo).trim() },
      select: {
        id: true,
        conteudo: true,
        criado_em: true,
        atualizado_em: true,
        autor_id: true,
        _count: { select: { curtidas: true, comentarios: true } },
      }
    });

    const author = await prisma.usuarios.findUnique({
      where: { id: updated.autor_id },
      select: { id: true, nome: true, avatar: true, cargo: true, departamento: true }
    });

    const postDTO = buildPostDTO(updated, author, updated._count, false);
    return res.json(serializeBigInt({ message: 'Post atualizado com sucesso', post: postDTO }));
  } catch (error) {
    console.error('[postsController.updatePost]', error);
    return res.status(500).json({ error: 'Erro interno do servidor ao atualizar post' });
  }
};

// ===================================================================
// DELETE /api/posts/:postId
// Exclui uma postagem (autor ou moderador/admin).
// ===================================================================
export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const pid = toBig(postId);
    if (pid === null) return res.status(400).json({ error: 'Parâmetro postId inválido' });

    const existing = await prisma.postagens.findUnique({
      where: { id: pid },
      select: { id: true, autor_id: true }
    });
    if (!existing) return res.status(404).json({ error: 'Post não encontrado' });

    const currentUserId = toBig(req.user?.id);
    const isOwner = currentUserId && String(existing.autor_id) === String(currentUserId);
    const canDelete = isOwner || req.user?.e_moderador || req.user?.e_admin;
    if (!canDelete) return res.status(403).json({ error: 'Acesso negado' });

    await prisma.postagens.delete({ where: { id: pid } });
    return res.json({ message: 'Post excluído com sucesso' });
  } catch (error) {
    console.error('[postsController.deletePost]', error);
    return res.status(500).json({ error: 'Erro interno do servidor ao excluir post' });
  }
};

// ===================================================================
// POST /api/posts/:postId/like
// Alterna curtida do post para o usuário autenticado.
// ===================================================================
export const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const pid = toBig(postId);
    const uid = toBig(req.user?.id);

    if (pid === null) return res.status(400).json({ error: 'Parâmetro postId inválido' });
    if (uid === null) return res.status(401).json({ error: 'Usuário não autenticado' });

    const post = await prisma.postagens.findUnique({
      where: { id: pid },
      select: { id: true }
    });
    if (!post) return res.status(404).json({ error: 'Post não encontrado' });

    const existing = await prisma.curtidas.findFirst({
      where: { postagem_id: pid, usuario_id: uid },
      select: { id: true }
    });

    if (existing) {
      await prisma.curtidas.delete({ where: { id: existing.id } });
      return res.json({ message: 'Curtida removida', isLiked: false });
    }

    await prisma.curtidas.create({
      data: { postagem_id: pid, usuario_id: uid }
    });
    return res.json({ message: 'Post curtido', isLiked: true });
  } catch (error) {
    console.error('[postsController.likePost]', error);
    return res.status(500).json({ error: 'Erro interno do servidor ao curtir post' });
  }
};

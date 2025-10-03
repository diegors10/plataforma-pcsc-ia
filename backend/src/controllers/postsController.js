// backend/src/controllers/postsController.js
import prisma from '../config/database.js';

// util: converte querystring para int seguro
const toInt = (v, def) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : def;
};

// GET /api/posts/discussion/:discussionId
export const getPostsByDiscussion = async (req, res) => {
  try {
    const { discussionId } = req.params;
    const page = toInt(req.query.page, 1);
    const limit = toInt(req.query.limit, 20);
    const skip = (page - 1) * limit;

    const discussao = await prisma.discussoes.findUnique({
      where: { id: Number(discussionId) },
      select: { id: true },
    });
    if (!discussao) return res.status(404).json({ message: 'Discussão não encontrada' });

    const [total, posts] = await Promise.all([
      prisma.postagens.count({ where: { discussao_id: Number(discussionId) } }),
      prisma.postagens.findMany({
        where: { discussao_id: Number(discussionId) },
        orderBy: { criado_em: 'asc' },
        skip,
        take: limit,
        select: {
          id: true,
          conteudo: true,
          likes: true,
          criado_em: true,
          atualizado_em: true,
          usuarios: { select: { id: true, nome: true, avatar: true, cargo: true, departamento: true } },
        },
      }),
    ]);

    return res.json({
      posts,
      pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) {
    console.error('[postsController.getPostsByDiscussion]', err);
    return res.status(500).json({ message: 'Erro ao listar posts da discussão' });
  }
};

// POST /api/posts/discussion/:discussionId
export const createPost = async (req, res) => {
  try {
    const { discussionId } = req.params;
    const { conteudo } = req.body;

    if (!conteudo || !conteudo.trim()) return res.status(400).json({ message: 'Conteúdo é obrigatório' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Não autenticado' });

    const discussao = await prisma.discussoes.findUnique({
      where: { id: Number(discussionId) },
      select: { id: true },
    });
    if (!discussao) return res.status(404).json({ message: 'Discussão não encontrada' });

    const created = await prisma.postagens.create({
      data: {
        conteudo: conteudo.trim(),
        discussao_id: Number(discussionId),
        usuario_id: Number(userId),
        likes: 0,
      },
      select: {
        id: true,
        conteudo: true,
        likes: true,
        criado_em: true,
        atualizado_em: true,
        usuarios: { select: { id: true, nome: true, avatar: true, cargo: true, departamento: true } },
      },
    });

    return res.status(201).json({ post: created });
  } catch (err) {
    console.error('[postsController.createPost]', err);
    return res.status(500).json({ message: 'Erro ao criar post' });
  }
};

// PUT /api/posts/:id
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { conteudo } = req.body;

    if (!conteudo || !conteudo.trim()) return res.status(400).json({ message: 'Conteúdo é obrigatório' });

    const post = await prisma.postagens.findUnique({ where: { id: Number(id) }, select: { id: true, usuario_id: true } });
    if (!post) return res.status(404).json({ message: 'Post não encontrado' });

    const userId = req.user?.id;
    const isAdmin = req.user?.papel === 'ADMIN';
    if (!isAdmin && Number(post.usuario_id) !== Number(userId)) {
      return res.status(403).json({ message: 'Sem permissão para editar este post' });
    }

    const updated = await prisma.postagens.update({
      where: { id: Number(id) },
      data: { conteudo: conteudo.trim() },
      select: {
        id: true,
        conteudo: true,
        likes: true,
        criado_em: true,
        atualizado_em: true,
        usuarios: { select: { id: true, nome: true, avatar: true, cargo: true, departamento: true } },
      },
    });

    return res.json({ post: updated });
  } catch (err) {
    console.error('[postsController.updatePost]', err);
    return res.status(500).json({ message: 'Erro ao atualizar post' });
  }
};

// DELETE /api/posts/:id
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await prisma.postagens.findUnique({ where: { id: Number(id) }, select: { id: true, usuario_id: true } });
    if (!post) return res.status(404).json({ message: 'Post não encontrado' });

    const userId = req.user?.id;
    const isAdmin = req.user?.papel === 'ADMIN';
    if (!isAdmin && Number(post.usuario_id) !== Number(userId)) {
      return res.status(403).json({ message: 'Sem permissão para excluir este post' });
    }

    await prisma.postagens.delete({ where: { id: Number(id) } });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[postsController.deletePost]', err);
    return res.status(500).json({ message: 'Erro ao excluir post' });
  }
};

// POST /api/posts/:id/like  (toggle simples via ?dir=inc|dec)
export const likePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await prisma.postagens.findUnique({ where: { id: Number(id) }, select: { id: true, likes: true } });
    if (!post) return res.status(404).json({ message: 'Post não encontrado' });

    const dir = (req.query?.dir || 'inc').toLowerCase();
    const delta = dir === 'dec' ? -1 : 1;
    const nextLikes = Math.max(0, (post.likes || 0) + delta);

    const updated = await prisma.postagens.update({
      where: { id: Number(id) },
      data: { likes: nextLikes },
      select: { id: true, likes: true },
    });

    return res.json({ id: updated.id, likes: updated.likes });
  } catch (err) {
    console.error('[postsController.likePost]', err);
    return res.status(500).json({ message: 'Erro ao curtir post' });
  }
};

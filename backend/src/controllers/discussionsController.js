import prisma from '../config/database.js';

// Helpers
const toBig = (v) => {
  if (v === null || v === undefined) return v;
  if (typeof v === 'bigint') return v;
  if (typeof v === 'number') return BigInt(v);
  if (typeof v === 'string' && /^-?\d+$/.test(v.trim())) return BigInt(v.trim());
  return null; // evita lançar exceção em strings inválidas
};
const toBool = (v) => (v === true || v === 'true'); // trata boolean/string
const toNum = (v, def = 0) => (typeof v === 'bigint' ? Number(v) : (v ?? def));

// Serialização segura para JSON
function serializeBigInt(obj) {
  if (obj === null || obj === 'undefined') return obj;
  if (typeof obj === 'bigint') return Number(obj);

  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object' && obj !== null) {
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
//  (Não depende de nomes de relações no Prisma para autor; resolve via usuarios)
// ============================================================
export const getPostsByDiscussion = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20', sort = 'recent' } = req.query;

    const discId = toBig(id);
    if (discId === null) return res.status(400).json({ error: 'Parâmetro id inválido' });

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * take;

    // Confere existência da discussão
    const discussion = await prisma.discussoes.findUnique({
      where: { id: discId },
      select: { id: true }
    });
    if (!discussion) {
      return res.status(404).json({ error: 'Discussão não encontrada' });
    }

    // Ordenação
    let orderBy;
    switch (String(sort)) {
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

    const where = { discussao_id: discId };

    // Busca posts sem depender da relação "autor"
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
          // NÃO selecionar `visualizacoes` (alguns schemas não possuem)
          autor_id: true,
          _count: { select: { curtidas: true, comentarios: true } }
        }
      }),
      prisma.postagens.count({ where })
    ]);

    // Resolve autores em lote via tabela usuarios
    const authorIds = Array.from(new Set(rows.map((p) => String(p.autor_id)).filter(Boolean)))
      .map((s) => toBig(s))
      .filter((v) => v !== null);

    let authorsById = new Map();
    if (authorIds.length) {
      const authors = await prisma.usuarios.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, nome: true, avatar: true, cargo: true, departamento: true }
      });
      authorsById = new Map(authors.map((u) => [String(u.id), u]));
    }

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

    const posts = rows.map((p) => {
      const a = authorsById.get(String(p.autor_id)) || null;
      return {
        id: p.id,
        conteudo: p.conteudo,
        criado_em: p.criado_em,
        atualizado_em: p.atualizado_em,
        foi_aprovado: p.foi_aprovado,
        visualizacoes: 0, // padrão seguro (campo pode não existir no schema)
        // Mantém compatível com frontend (usa `usuarios` como autor)
        usuarios: a
          ? { id: a.id, nome: a.nome, avatar: a.avatar, cargo: a.cargo, departamento: a.departamento }
          : null,
        likes: p._count?.curtidas ?? 0,
        comments: p._count?.comentarios ?? 0,
        isLiked: req.user ? likedSet.has(String(p.id)) : false
      };
    });

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

// ============================================================
//  GET /api/discussions
//  Lista discussões (resolve autor via usuarios e pega último post por discussão)
// ============================================================
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
        { titulo: { contains: String(search), mode: 'insensitive' } },
        { descricao: { contains: String(search), mode: 'insensitive' } }
      ];
    }
    if (category) where.categoria = String(category);
    if (String(pinned) === 'true') where.esta_fixado = true;

    // Ordenação
    let orderBy;
    switch (String(sort)) {
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

    // Consulta base sem depender da relação "autor"
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
          autor_id: true,
          _count: { select: { postagens: true } }
        }
      }),
      prisma.discussoes.count({ where })
    ]);

    // Resolve autores
    const discAuthorIds = Array.from(
      new Set(rows.map((d) => String(d.autor_id)).filter(Boolean))
    ).map((s) => toBig(s)).filter((v) => v !== null);

    let authorsById = new Map();
    if (discAuthorIds.length) {
      const authors = await prisma.usuarios.findMany({
        where: { id: { in: discAuthorIds } },
        select: { id: true, nome: true, avatar: true, cargo: true }
      });
      authorsById = new Map(authors.map((u) => [String(u.id), u]));
    }

    // Pega último post por discussão (sem depender de relação "postagens")
    const discIds = rows.map((d) => d.id);
    let lastPostByDiscussion = new Map();
    if (discIds.length) {
      // Busca apenas o post mais recente de cada discussão utilizando distinct.
      const lastPosts = await prisma.postagens.findMany({
        where: { discussao_id: { in: discIds } },
        // ordena por discussao_id e data de criação para que distinct funcione corretamente
        orderBy: [
          { discussao_id: 'asc' },
          { criado_em: 'desc' },
        ],
        // garante que retornará um único registro por discussão
        distinct: ['discussao_id'],
        select: {
          id: true,
          conteudo: true,
          criado_em: true,
          discussao_id: true,
          autor_id: true
        }
      });

      // Monta o map discId -> último post
      lastPostByDiscussion = new Map();
      for (const p of lastPosts) {
        lastPostByDiscussion.set(String(p.discussao_id), p);
      }

      // resolve autores dos últimos posts
      const lpAuthorIds = Array.from(
        new Set(lastPosts.map((p) => String(p.autor_id)).filter(Boolean))
      ).map((s) => toBig(s)).filter((v) => v !== null);

      let lpAuthors = new Map();
      if (lpAuthorIds.length) {
        const authors = await prisma.usuarios.findMany({
          where: { id: { in: lpAuthorIds } },
          select: { id: true, nome: true, avatar: true }
        });
        lpAuthors = new Map(authors.map((u) => [String(u.id), u]));
      }

      // anexa info de autor aos últimos posts
      for (const [k, p] of lastPostByDiscussion.entries()) {
        const a = lpAuthors.get(String(p.autor_id)) || null;
        lastPostByDiscussion.set(k, {
          id: p.id,
          conteudo: p.conteudo,
          criado_em: p.criado_em,
          autor: a ? { id: a.id, nome: a.nome, avatar: a.avatar } : null
        });
      }
    }

    const discussionsWithLastPost = rows.map((d) => ({
      id: d.id,
      titulo: d.titulo,
      descricao: d.descricao,
      categoria: d.categoria,
      e_aberta: d.e_aberta,
      esta_fixado: d.esta_fixado,
      esta_bloqueado: d.esta_bloqueado,
      visualizacoes: toNum(d.visualizacoes, 0),
      criado_em: d.criado_em,
      atualizado_em: d.atualizado_em,
      usuarios: (() => {
        const a = authorsById.get(String(d.autor_id));
        return a ? { id: a.id, nome: a.nome, avatar: a.avatar, cargo: a.cargo } : null;
      })(),
      _count: { postagens: d._count.postagens },
      posts: d._count.postagens,
      lastPost: lastPostByDiscussion.get(String(d.id)) || null
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

// ============================================================
//  GET /api/discussions/:id
//  (resolve autor via usuarios; incrementa visualizações com segurança)
// ============================================================
export const getDiscussionById = async (req, res) => {
  try {
    const { id } = req.params;
    const discId = toBig(id);
    if (discId === null) return res.status(400).json({ error: 'Parâmetro id inválido' });

    const row = await prisma.discussoes.findUnique({
      where: { id: discId },
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
        autor_id: true,
        _count: { select: { postagens: true } }
      }
    });

    if (!row) {
      return res.status(404).json({ error: 'Discussão não encontrada' });
    }

    let author = null;
    if (row.autor_id != null) {
      author = await prisma.usuarios.findUnique({
        where: { id: row.autor_id },
        select: { id: true, nome: true, avatar: true, cargo: true, departamento: true }
      });
    }

    // Incrementar visualizações (sem carregar tudo)
    await prisma.discussoes.update({
      where: { id: discId },
      data: { visualizacoes: { increment: 1 } },
      select: { id: true }
    });

    return res.json(serializeBigInt({
      id: row.id,
      titulo: row.titulo,
      descricao: row.descricao,
      categoria: row.categoria,
      e_aberta: row.e_aberta,
      esta_fixado: row.esta_fixado,
      esta_bloqueado: row.esta_bloqueado,
      visualizacoes: toNum(row.visualizacoes, 0) + 1, // já incrementado para exibição
      criado_em: row.criado_em,
      atualizado_em: row.atualizado_em,
      usuarios: author ? { id: author.id, nome: author.nome, avatar: author.avatar, cargo: author.cargo, departamento: author.departamento } : null,
      _count: { postagens: row._count.postagens },
      posts: row._count.postagens
    }));
  } catch (error) {
    console.error('Erro ao buscar discussão:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================
//  POST /api/discussions
// ============================================================
export const createDiscussion = async (req, res) => {
  try {
    const { titulo, descricao, categoria, e_aberta } = req.body;

    // Valor padrão: discussões são abertas se não especificado
    const isOpen = e_aberta !== undefined ? toBool(e_aberta) : true;

    const created = await prisma.discussoes.create({
      data: {
        titulo: String(titulo ?? '').trim(),
        descricao: String(descricao ?? '').trim(),
        categoria: String(categoria ?? '').trim() || null,
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
        autor_id: true
      }
    });

    // resolve autor
    const author = await prisma.usuarios.findUnique({
      where: { id: created.autor_id },
      select: { id: true, nome: true, avatar: true, cargo: true }
    });

    return res.status(201).json(serializeBigInt({
      message: 'Discussão criada com sucesso',
      discussion: {
        ...created,
        usuarios: author ? { id: author.id, nome: author.nome, avatar: author.avatar, cargo: author.cargo } : null,
        posts: 0,
        lastPost: null
      }
    }));
  } catch (error) {
    console.error('Erro ao criar discussão:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================
//  PUT /api/discussions/:id
// ============================================================
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

    const discId = toBig(id);
    if (discId === null) return res.status(400).json({ error: 'Parâmetro id inválido' });

    // Verificar se existe
    const existing = await prisma.discussoes.findUnique({
      where: { id: discId },
      select: { id: true, autor_id: true }
    });
    if (!existing) return res.status(404).json({ error: 'Discussão não encontrada' });

    // Permissões
    const isAuthor = String(existing.autor_id) === String(toBig(req.user.id));
    const canEdit = isAuthor || req.user?.e_moderador || req.user?.e_admin;
    const canModerate = req.user?.e_moderador || req.user?.e_admin;

    if (!canEdit) return res.status(403).json({ error: 'Acesso negado' });

    const updateData = {
      ...(titulo !== undefined ? { titulo: String(titulo).trim() } : {}),
      ...(descricao !== undefined ? { descricao: String(descricao).trim() } : {}),
      ...(categoria !== undefined ? { categoria: String(categoria).trim() } : {}),
    };

    if (canModerate) {
      if (esta_fixado !== undefined) updateData.esta_fixado = toBool(esta_fixado);
      if (esta_bloqueado !== undefined) updateData.esta_bloqueado = toBool(esta_bloqueado);
    }
    if (e_aberta !== undefined) updateData.e_aberta = toBool(e_aberta);

    const discussion = await prisma.discussoes.update({
      where: { id: discId },
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
        autor_id: true,
        _count: { select: { postagens: true } }
      }
    });

    const author = await prisma.usuarios.findUnique({
      where: { id: discussion.autor_id },
      select: { id: true, nome: true, avatar: true, cargo: true }
    });

    return res.json(serializeBigInt({
      message: 'Discussão atualizada com sucesso',
      discussion: {
        ...discussion,
        usuarios: author ? { id: author.id, nome: author.nome, avatar: author.avatar, cargo: author.cargo } : null,
        posts: discussion._count.postagens
      }
    }));
  } catch (error) {
    console.error('Erro ao atualizar discussão:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ============================================================
//  DELETE /api/discussions/:id
// ============================================================
export const deleteDiscussion = async (req, res) => {
  try {
    const { id } = req.params;
    const discId = toBig(id);
    if (discId === null) return res.status(400).json({ error: 'Parâmetro id inválido' });

    const existing = await prisma.discussoes.findUnique({
      where: { id: discId },
      select: { id: true, autor_id: true }
    });
    if (!existing) return res.status(404).json({ error: 'Discussão não encontrada' });

    if (String(existing.autor_id) !== String(toBig(req.user.id)) && !req.user?.e_moderador && !req.user?.e_admin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    await prisma.discussoes.delete({ where: { id: discId } });

    return res.json({ message: 'Discussão excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir discussão:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ==== ALIAS DE EXPORT PARA COMPATIBILIDADE COM ROTAS ANTIGAS ====
export { getDiscussionById as getById };

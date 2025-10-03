import prisma from '../config/database.js';

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

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Construir filtros
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

    // Definir ordenação
    let orderBy = {};
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

    // Buscar discussões
    const [discussions, total] = await Promise.all([
      prisma.discussoes.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          usuarios: {
            select: {
              id: true,
              nome: true,
              avatar: true,
              cargo: true
            }
          },
          _count: {
            select: {
              postagens: true
            }
          },
          postagens: {
            take: 1,
            orderBy: { criado_em: 'desc' },
            include: {
              usuarios: {
                select: {
                  id: true,
                  nome: true,
                  avatar: true
                }
              }
            }
          }
        }
      }),
      prisma.discussoes.count({ where })
    ]);

    const discussionsWithLastPost = discussions.map(discussion => ({
      ...discussion,
      posts: discussion._count.postagens,
      lastPost: discussion.postagens[0] || null
    }));

    res.json({
      discussions: discussionsWithLastPost,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao buscar discussões:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

export const getDiscussionById = async (req, res) => {
  try {
    const { id } = req.params;

    const discussion = await prisma.discussoes.findUnique({
      where: { id: parseInt(id) },
      include: {
        usuarios: {
          select: {
            id: true,
            nome: true,
            avatar: true,
            cargo: true,
            departamento: true
          }
        },
        _count: {
          select: {
            postagens: true
          }
        }
      }
    });

    if (!discussion) {
      return res.status(404).json({
        error: 'Discussão não encontrada'
      });
    }

    // Incrementar visualizações
    await prisma.discussoes.update({
      where: { id: parseInt(id) },
      data: { visualizacoes: { increment: 1 } }
    });

    res.json({
      ...discussion,
      posts: discussion._count.postagens,
      views: discussion.visualizacoes + 1
    });
  } catch (error) {
    console.error('Erro ao buscar discussão:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

export const createDiscussion = async (req, res) => {
  try {
    const {
      titulo,
      descricao,
      categoria
    } = req.body;

    const discussion = await prisma.discussoes.create({
      data: {
        titulo,
        descricao,
        categoria,
        autor_id: req.user.id
      },
      include: {
        usuarios: {
          select: {
            id: true,
            nome: true,
            avatar: true,
            cargo: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Discussão criada com sucesso',
      discussion: {
        ...discussion,
        posts: 0,
        lastPost: null
      }
    });
  } catch (error) {
    console.error('Erro ao criar discussão:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
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
      esta_bloqueado
    } = req.body;

    // Verificar se a discussão existe
    const existingDiscussion = await prisma.discussoes.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingDiscussion) {
      return res.status(404).json({
        error: 'Discussão não encontrada'
      });
    }

    // Verificar permissões
    const canEdit = existingDiscussion.autor_id === req.user.id || req.user.e_moderador;
    const canModerate = req.user.e_moderador || req.user.e_admin;

    if (!canEdit) {
      return res.status(403).json({
        error: 'Acesso negado'
      });
    }

    const updateData = {
      titulo,
      descricao,
      categoria
    };

    // Apenas moderadores podem fixar/bloquear
    if (canModerate) {
      if (esta_fixado !== undefined) updateData.esta_fixado = esta_fixado;
      if (esta_bloqueado !== undefined) updateData.esta_bloqueado = esta_bloqueado;
    }

    const discussion = await prisma.discussoes.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        usuarios: {
          select: {
            id: true,
            nome: true,
            avatar: true,
            cargo: true
          }
        },
        _count: {
          select: {
            postagens: true
          }
        }
      }
    });

    res.json({
      message: 'Discussão atualizada com sucesso',
      discussion: {
        ...discussion,
        posts: discussion._count.postagens
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar discussão:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

export const deleteDiscussion = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a discussão existe
    const existingDiscussion = await prisma.discussoes.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingDiscussion) {
      return res.status(404).json({
        error: 'Discussão não encontrada'
      });
    }

    // Verificar permissões
    if (existingDiscussion.autor_id !== req.user.id && !req.user.e_moderador) {
      return res.status(403).json({
        error: 'Acesso negado'
      });
    }

    await prisma.discussoes.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      message: 'Discussão excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir discussão:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

import prisma from '../config/database.js';

export const getCommentsByPrompt = async (req, res) => {
  try {
    const { promptId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [comments, total] = await Promise.all([
      prisma.comentarios.findMany({
        where: {
          prompt_id: parseInt(promptId),
          foi_aprovado: true
        },
        skip,
        take,
        orderBy: { criado_em: 'desc' },
        include: {
          usuarios: {
            select: {
              id: true,
              nome: true,
              avatar: true,
              cargo: true
            }
          },
          other_comentarios: {
            where: { foi_aprovado: true },
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
                select: { curtidas: true }
              }
            },
            orderBy: { criado_em: 'asc' }
          },
          _count: {
            select: { curtidas: true }
          }
        }
      }),
      prisma.comentarios.count({
        where: {
          prompt_id: parseInt(promptId),
          foi_aprovado: true,
          comentario_pai_id: null
        }
      })
    ]);

    // Verificar curtidas do usuário (se autenticado)
    let commentsWithLikes = comments;
    if (req.user) {
      const allCommentIds = [];
      comments.forEach(comment => {
        allCommentIds.push(comment.id);
        comment.other_comentarios.forEach(reply => {
          allCommentIds.push(reply.id);
        });
      });

      const userLikes = await prisma.curtidas.findMany({
        where: {
          usuario_id: req.user.id,
          comentario_id: { in: allCommentIds }
        },
        select: { comentario_id: true }
      });

      const likedCommentIds = new Set(userLikes.map(like => like.comentario_id));

      commentsWithLikes = comments.map(comment => ({
        ...comment,
        isLiked: likedCommentIds.has(comment.id),
        likes: comment._count.curtidas,
        replies: comment.other_comentarios.map(reply => ({
          ...reply,
          isLiked: likedCommentIds.has(reply.id),
          likes: reply._count.curtidas
        }))
      }));
    } else {
      commentsWithLikes = comments.map(comment => ({
        ...comment,
        isLiked: false,
        likes: comment._count.curtidas,
        replies: comment.other_comentarios.map(reply => ({
          ...reply,
          isLiked: false,
          likes: reply._count.curtidas
        }))
      }));
    }

    res.json({
      comments: commentsWithLikes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

export const createComment = async (req, res) => {
  try {
    const { promptId } = req.params;
    const { conteudo, comentario_pai_id } = req.body;

    // Verificar se o prompt existe
    const prompt = await prisma.prompts.findUnique({
      where: { id: parseInt(promptId) }
    });

    if (!prompt) {
      return res.status(404).json({
        error: 'Prompt não encontrado'
      });
    }

    // Se for uma resposta, verificar se o comentário pai existe
    if (comentario_pai_id) {
      const parentComment = await prisma.comentarios.findUnique({
        where: { id: parseInt(comentario_pai_id) }
      });

      if (!parentComment) {
        return res.status(404).json({
          error: 'Comentário pai não encontrado'
        });
      }
    }

    const comment = await prisma.comentarios.create({
      data: {
        conteudo,
        autor_id: req.user.id,
        prompt_id: parseInt(promptId),
        comentario_pai_id: comentario_pai_id ? parseInt(comentario_pai_id) : null
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
      message: 'Comentário criado com sucesso',
      comment: {
        ...comment,
        likes: 0,
        isLiked: false,
        replies: []
      }
    });
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

export const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { conteudo } = req.body;

    // Verificar se o comentário existe e pertence ao usuário
    const existingComment = await prisma.comentarios.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingComment) {
      return res.status(404).json({
        error: 'Comentário não encontrado'
      });
    }

    if (existingComment.autor_id !== req.user.id && !req.user.e_moderador) {
      return res.status(403).json({
        error: 'Acesso negado'
      });
    }

    const comment = await prisma.comentarios.update({
      where: { id: parseInt(id) },
      data: {
        conteudo,
        foi_aprovado: req.user.e_moderador ? existingComment.foi_aprovado : false
      },
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
          select: { curtidas: true }
        }
      }
    });

    res.json({
      message: 'Comentário atualizado com sucesso',
      comment: {
        ...comment,
        likes: comment._count.curtidas
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar comentário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o comentário existe e pertence ao usuário
    const existingComment = await prisma.comentarios.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingComment) {
      return res.status(404).json({
        error: 'Comentário não encontrado'
      });
    }

    if (existingComment.autor_id !== req.user.id && !req.user.e_moderador) {
      return res.status(403).json({
        error: 'Acesso negado'
      });
    }

    await prisma.comentarios.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      message: 'Comentário excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir comentário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

export const likeComment = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o comentário existe
    const comment = await prisma.comentarios.findUnique({
      where: { id: parseInt(id) }
    });

    if (!comment) {
      return res.status(404).json({
        error: 'Comentário não encontrado'
      });
    }

    // Verificar se já curtiu
    const existingLike = await prisma.curtidas.findUnique({
      where: {
        usuario_id_comentario_id: {
          usuario_id: req.user.id,
          comentario_id: parseInt(id)
        }
      }
    });

    if (existingLike) {
      // Remover curtida
      await prisma.curtidas.delete({
        where: { id: existingLike.id }
      });

      res.json({
        message: 'Curtida removida',
        isLiked: false
      });
    } else {
      // Adicionar curtida
      await prisma.curtidas.create({
        data: {
          usuario_id: req.user.id,
          comentario_id: parseInt(id)
        }
      });

      res.json({
        message: 'Comentário curtido',
        isLiked: true
      });
    }
  } catch (error) {
    console.error('Erro ao curtir comentário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

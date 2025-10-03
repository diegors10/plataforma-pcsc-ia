import prisma from '../config/database.js';

export const getAllPrompts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      sort = 'recent',
      author,
      featured
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Construir filtros
    const where = {
      e_publico: true,
      foi_aprovado: true
    };

    if (search) {
      where.OR = [
        { titulo: { contains: search, mode: 'insensitive' } },
        { descricao: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } }
      ];
    }

    if (category) {
      where.categoria = category;
    }

    if (author) {
      where.autor_id = parseInt(author);
    }

    if (featured === 'true') {
      where.e_destaque = true;
    }

    // Definir ordenação
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

    // Buscar prompts
    const [prompts, total] = await Promise.all([
      prisma.prompts.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          usuarios: {
            select: {
              id: true,
              nome: true,
              avatar: true
            }
          },
          especialidades: {
            select: {
              id: true,
              nome: true,
              cor: true,
              icone: true
            }
          },
          _count: {
            select: {
              curtidas: true,
              comentarios: true
            }
          }
        }
      }),
      prisma.prompts.count({ where })
    ]);

    // Verificar se o usuário curtiu cada prompt (se autenticado)
    let promptsWithLikes = prompts;
    if (req.user) {
      const userLikes = await prisma.curtidas.findMany({
        where: {
          usuario_id: req.user.id,
          prompt_id: { in: prompts.map(p => p.id) }
        },
        select: { prompt_id: true }
      });

      const likedPromptIds = new Set(userLikes.map(like => like.prompt_id));

      promptsWithLikes = prompts.map(prompt => ({
        ...prompt,
        isLiked: likedPromptIds.has(prompt.id),
        likes: prompt._count.curtidas,
        comments: prompt._count.comentarios
      }));
    } else {
      promptsWithLikes = prompts.map(prompt => ({
        ...prompt,
        isLiked: false,
        likes: prompt._count.curtidas,
        comments: prompt._count.comentarios
      }));
    }

    res.json({
      prompts: promptsWithLikes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao buscar prompts:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

export const getPromptById = async (req, res) => {
  try {
    const { id } = req.params;

    const prompt = await prisma.prompts.findUnique({
      where: { 
        id: parseInt(id),
        e_publico: true,
        foi_aprovado: true
      },
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
        especialidades: {
          select: {
            id: true,
            nome: true,
            cor: true,
            icone: true
          }
        },
        _count: {
          select: {
            curtidas: true,
            comentarios: true
          }
        }
      }
    });

    if (!prompt) {
      return res.status(404).json({
        error: 'Prompt não encontrado'
      });
    }

    // Incrementar visualizações
    await prisma.prompts.update({
      where: { id: parseInt(id) },
      data: { visualizacoes: { increment: 1 } }
    });

    // Verificar se o usuário curtiu o prompt (se autenticado)
    let isLiked = false;
    if (req.user) {
      const like = await prisma.curtidas.findUnique({
        where: {
          usuario_id_prompt_id: {
            usuario_id: req.user.id,
            prompt_id: parseInt(id)
          }
        }
      });
      isLiked = !!like;
    }

    res.json({
      ...prompt,
      isLiked,
      likes: prompt._count.curtidas,
      comments: prompt._count.comentarios,
      views: prompt.visualizacoes + 1
    });
  } catch (error) {
    console.error('Erro ao buscar prompt:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
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
      e_publico = true
    } = req.body;

    const prompt = await prisma.prompts.create({
      data: {
        titulo,
        descricao,
        conteudo,
        categoria,
        tags: tags || [],
        especialidade_id: especialidade_id ? parseInt(especialidade_id) : null,
        e_publico,
        autor_id: req.user.id
      },
      include: {
        usuarios: {
          select: {
            id: true,
            nome: true,
            avatar: true
          }
        },
        especialidades: {
          select: {
            id: true,
            nome: true,
            cor: true,
            icone: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Prompt criado com sucesso',
      prompt: {
        ...prompt,
        likes: 0,
        comments: 0,
        isLiked: false
      }
    });
  } catch (error) {
    console.error('Erro ao criar prompt:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
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
      e_publico
    } = req.body;

    // Verificar se o prompt existe e pertence ao usuário
    const existingPrompt = await prisma.prompts.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingPrompt) {
      return res.status(404).json({
        error: 'Prompt não encontrado'
      });
    }

    if (existingPrompt.autor_id !== req.user.id && !req.user.e_admin) {
      return res.status(403).json({
        error: 'Acesso negado'
      });
    }

    const prompt = await prisma.prompts.update({
      where: { id: parseInt(id) },
      data: {
        titulo,
        descricao,
        conteudo,
        categoria,
        tags: tags || [],
        especialidade_id: especialidade_id ? parseInt(especialidade_id) : null,
        e_publico,
        foi_aprovado: req.user.e_admin ? existingPrompt.foi_aprovado : false // Reset approval if not admin
      },
      include: {
        usuarios: {
          select: {
            id: true,
            nome: true,
            avatar: true
          }
        },
        especialidades: {
          select: {
            id: true,
            nome: true,
            cor: true,
            icone: true
          }
        },
        _count: {
          select: {
            curtidas: true,
            comentarios: true
          }
        }
      }
    });

    res.json({
      message: 'Prompt atualizado com sucesso',
      prompt: {
        ...prompt,
        likes: prompt._count.curtidas,
        comments: prompt._count.comentarios
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar prompt:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

export const deletePrompt = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o prompt existe e pertence ao usuário
    const existingPrompt = await prisma.prompts.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingPrompt) {
      return res.status(404).json({
        error: 'Prompt não encontrado'
      });
    }

    if (existingPrompt.autor_id !== req.user.id && !req.user.e_admin) {
      return res.status(403).json({
        error: 'Acesso negado'
      });
    }

    await prisma.prompts.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      message: 'Prompt excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir prompt:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

export const likePrompt = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o prompt existe
    const prompt = await prisma.prompts.findUnique({
      where: { id: parseInt(id) }
    });

    if (!prompt) {
      return res.status(404).json({
        error: 'Prompt não encontrado'
      });
    }

    // Verificar se já curtiu
    const existingLike = await prisma.curtidas.findUnique({
      where: {
        usuario_id_prompt_id: {
          usuario_id: req.user.id,
          prompt_id: parseInt(id)
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
          prompt_id: parseInt(id)
        }
      });

      res.json({
        message: 'Prompt curtido',
        isLiked: true
      });
    }
  } catch (error) {
    console.error('Erro ao curtir prompt:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

export const getFeaturedPrompts = async (req, res) => {
  try {
    const prompts = await prisma.prompts.findMany({
      where: {
        e_destaque: true,
        e_publico: true,
        foi_aprovado: true
      },
      take: 6,
      orderBy: { criado_em: 'desc' },
      include: {
        usuarios: {
          select: {
            id: true,
            nome: true,
            avatar: true
          }
        },
        especialidades: {
          select: {
            id: true,
            nome: true,
            cor: true,
            icone: true
          }
        },
        _count: {
          select: {
            curtidas: true,
            comentarios: true
          }
        }
      }
    });

    const promptsWithCounts = prompts.map(prompt => ({
      ...prompt,
      likes: prompt._count.curtidas,
      comments: prompt._count.comentarios,
      isLiked: false // Será definido no frontend se necessário
    }));

    res.json({ prompts: promptsWithCounts });
  } catch (error) {
    console.error('Erro ao buscar prompts em destaque:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

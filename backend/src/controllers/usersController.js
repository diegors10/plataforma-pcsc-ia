import prisma from '../config/database.js';

/*
 * Controller de usuários.
 * Responsável por retornar e atualizar informações de usuários.
 */

// Obtém o perfil do usuário autenticado
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.usuarios.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nome: true,
        departamento: true,
        cargo: true,
        matricula: true,
        telefone: true,
        localizacao: true,
        biografia: true,
        avatar: true,
        esta_ativo: true,
        e_admin: true,
        e_moderador: true,
        data_entrada: true,
        ultimo_login: true,
        usuario_especialidades: {
          include: {
            especialidades: true
          }
        },
        _count: {
          select: {
            comentarios: true,
            curtidas: true,
            discussoes: true,
            postagens: true,
            prompts: true
          }
        }
      }
    });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    // Mapear especialidades
    const specialties = user.usuario_especialidades.map(ue => ue.especialidades);
    const { usuario_especialidades, _count, senha, ...userData } = user;
    return res.json({
      user: {
        ...userData,
        specialties,
        counts: _count
      }
    });
  } catch (error) {
    console.error('Erro ao obter perfil:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualiza o perfil do usuário autenticado
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      nome,
      departamento,
      cargo,
      telefone,
      localizacao,
      biografia,
      specialties
    } = req.body;
    // Preparar dados para atualização
    const updateData = {
      nome: nome ?? undefined,
      departamento: departamento ?? undefined,
      cargo: cargo ?? undefined,
      telefone: telefone ?? undefined,
      localizacao: localizacao ?? undefined,
      biografia: biografia ?? undefined
    };
    // Remover campos undefined para não sobrescrever com null
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    // Se houver upload de avatar, atualizar caminho
    if (req.file) {
      updateData.avatar = req.file.path.replace(/\\/g, '/');
    }
    // Atualizar usuário
    const updatedUser = await prisma.usuarios.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        nome: true,
        departamento: true,
        cargo: true,
        matricula: true,
        telefone: true,
        localizacao: true,
        biografia: true,
        avatar: true,
        esta_ativo: true,
        e_admin: true,
        e_moderador: true,
        data_entrada: true,
        ultimo_login: true
      }
    });
    // Atualizar especialidades do usuário
    if (specialties && Array.isArray(specialties)) {
      const specialityIds = specialties.map(id => parseInt(id));
      // Remover associações antigas e criar novas
      await prisma.usuario_especialidades.deleteMany({ where: { usuario_id: userId } });
      const data = specialityIds.map(especialidade_id => ({ usuario_id: userId, especialidade_id }));
      if (data.length > 0) {
        await prisma.usuario_especialidades.createMany({ data });
      }
    }
    return res.json({ message: 'Perfil atualizado com sucesso', user: updatedUser });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Obtém um usuário por ID (público) – não retorna campos sensíveis
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const user = await prisma.usuarios.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nome: true,
        email: true,
        departamento: true,
        cargo: true,
        telefone: true,
        localizacao: true,
        biografia: true,
        avatar: true,
        data_entrada: true,
        usuario_especialidades: {
          include: {
            especialidades: true
          }
        },
        _count: {
          select: {
            comentarios: true,
            curtidas: true,
            discussoes: true,
            postagens: true,
            prompts: true
          }
        }
      }
    });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const specialties = user.usuario_especialidades.map(ue => ue.especialidades);
    const { usuario_especialidades, _count, ...userData } = user;
    return res.json({
      user: {
        ...userData,
        specialties,
        counts: _count
      }
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Lista todos os usuários com paginação (apenas para administradores)
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const where = {};
    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { departamento: { contains: search, mode: 'insensitive' } }
      ];
    }
    const [users, total] = await Promise.all([
      prisma.usuarios.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          nome: true,
          email: true,
          departamento: true,
          cargo: true,
          esta_ativo: true,
          e_admin: true,
          e_moderador: true,
          data_entrada: true
        }
      }),
      prisma.usuarios.count({ where })
    ]);
    return res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
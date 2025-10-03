import prisma from '../config/database.js';

/*
 * Controller responsável por operações relacionadas às especialidades.
 * As especialidades são usadas para categorizar prompts e também podem
 * estar associadas aos usuários através da tabela de junção `usuario_especialidades`.
 */

// Lista todas as especialidades com contadores de prompts e usuários
export const getAllSpecialties = async (req, res) => {
  try {
    const specialties = await prisma.especialidades.findMany({
      include: {
        _count: {
          select: {
            prompts: true,
            usuario_especialidades: true
          }
        }
      }
    });

    const result = specialties.map(s => ({
      id: s.id,
      nome: s.nome,
      descricao: s.descricao,
      icone: s.icone,
      cor: s.cor,
      prompts: s._count.prompts,
      users: s._count.usuario_especialidades
    }));

    return res.json({ specialties: result });
  } catch (error) {
    console.error('Erro ao listar especialidades:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Retorna uma especialidade específica por ID
export const getSpecialtyById = async (req, res) => {
  try {
    const { id } = req.params;
    const specialty = await prisma.especialidades.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            prompts: true,
            usuario_especialidades: true
          }
        }
      }
    });
    if (!specialty) {
      return res.status(404).json({ error: 'Especialidade não encontrada' });
    }
    const result = {
      id: specialty.id,
      nome: specialty.nome,
      descricao: specialty.descricao,
      icone: specialty.icone,
      cor: specialty.cor,
      prompts: specialty._count.prompts,
      users: specialty._count.usuario_especialidades
    };
    return res.json({ specialty: result });
  } catch (error) {
    console.error('Erro ao buscar especialidade:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Cria uma nova especialidade
export const createSpecialty = async (req, res) => {
  try {
    const { nome, descricao, cor } = req.body;
    // Verificar se a especialidade já existe pelo nome
    const existing = await prisma.especialidades.findUnique({ where: { nome } });
    if (existing) {
      return res.status(400).json({ error: 'Já existe uma especialidade com este nome' });
    }
    // Se houver upload de ícone, salvar o caminho
    let icone = null;
    if (req.file) {
      // Normalize path for different OS
      icone = req.file.path.replace(/\\/g, '/');
    }
    const specialty = await prisma.especialidades.create({
      data: {
        nome,
        descricao: descricao || null,
        cor: cor || null,
        icone
      }
    });
    return res.status(201).json({ message: 'Especialidade criada com sucesso', specialty });
  } catch (error) {
    console.error('Erro ao criar especialidade:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualiza uma especialidade existente
export const updateSpecialty = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, cor } = req.body;
    const specialtyId = parseInt(id);
    const existing = await prisma.especialidades.findUnique({ where: { id: specialtyId } });
    if (!existing) {
      return res.status(404).json({ error: 'Especialidade não encontrada' });
    }
    // Atualizar o campo do ícone se houver upload
    let icone = existing.icone;
    if (req.file) {
      icone = req.file.path.replace(/\\/g, '/');
    }
    const specialty = await prisma.especialidades.update({
      where: { id: specialtyId },
      data: {
        nome: nome ?? existing.nome,
        descricao: descricao ?? existing.descricao,
        cor: cor ?? existing.cor,
        icone
      }
    });
    return res.json({ message: 'Especialidade atualizada com sucesso', specialty });
  } catch (error) {
    console.error('Erro ao atualizar especialidade:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Remove uma especialidade
export const deleteSpecialty = async (req, res) => {
  try {
    const { id } = req.params;
    const specialtyId = parseInt(id);
    const existing = await prisma.especialidades.findUnique({ where: { id: specialtyId } });
    if (!existing) {
      return res.status(404).json({ error: 'Especialidade não encontrada' });
    }
    await prisma.especialidades.delete({ where: { id: specialtyId } });
    return res.json({ message: 'Especialidade excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir especialidade:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
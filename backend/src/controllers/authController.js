import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

export const register = async (req, res) => {
  try {
    const { email, nome, senha, password, departamento, cargo, matricula, telefone, localizacao, biografia } = req.body;
    const plain = senha ?? password;

    if (!email || !plain) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const existingUser = await prisma.usuarios.findFirst({
      where: {
        OR: [
          { email },
          ...(matricula ? [{ matricula }] : [])
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Usuário já existe com este email ou matrícula' });
    }

    const hashedPassword = await bcrypt.hash(plain, 12);

    const user = await prisma.usuarios.create({
      data: {
        email,
        nome,
        senha: hashedPassword,
        departamento,
        cargo,
        matricula,
        telefone,
        localizacao,
        biografia
      },
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
        esta_ativo: true,
        e_admin: true,
        e_moderador: true,
        data_entrada: true
      }
    });

 const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'JWT_SECRET não configurado no servidor' });
  }

  const token = jwt.sign(
    { userId: String(user.id) }, 
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

    return res.status(201).json({ message: 'Usuário criado com sucesso', user, token });
  } catch (error) {
    console.error('Erro no registro:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      ...(process.env.NODE_ENV !== 'production' && { details: error.message })
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, senha, password } = req.body;
    const plain = senha ?? password;

    if (!email || !plain) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user = await prisma.usuarios.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        nome: true,
        senha: true,
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

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    if (!user.esta_ativo) {
      return res.status(401).json({ error: 'Conta desativada. Entre em contato com o administrador.' });
    }

    const ok = await bcrypt.compare(plain, user.senha);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    await prisma.usuarios.update({
      where: { id: user.id },
      data: { ultimo_login: new Date() }
    });

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'JWT_SECRET não configurado no servidor' });
    }

    const token = jwt.sign(
      { userId: String(user.id) }, 
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const { senha: _ignored, ...userWithoutPassword } = user;

    return res.json({
      message: 'Login realizado com sucesso',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      ...(process.env.NODE_ENV !== 'production' && { details: error.message })
    });
  }
};

export const getMe = async (req, res) => {
  try {
    // payload veio como string; converta para BigInt p/ Prisma se o campo é BigInt
    const raw = req.user?.userId ?? req.user?.id; // dependendo de como seu middleware popula
    if (!raw) return res.status(401).json({ error: 'Não autenticado' });

    const id = typeof raw === 'bigint' ? raw : BigInt(raw);

    const user = await prisma.usuarios.findUnique({
      where: { id },
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

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    return res.json({ user });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};


export const logout = async (_req, res) => {
  return res.json({ message: 'Logout realizado com sucesso' });
};

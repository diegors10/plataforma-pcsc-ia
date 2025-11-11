import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { normalizeName, normalizeOrg, normalizeEmail, normalizeCargo } from '../utils/textUtils.js';

export const register = async (req, res) => {
  try {
    const {
      email,
      nome,
      senha,
      password,
      departamento,
      cargo,
      matricula,
      telefone,
      localizacao,
      biografia
    } = req.body;

    const plain = senha ?? password;
    if (!email || !plain) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const emailNorm = normalizeEmail(email);

    // domínio institucional
    if (!emailNorm.endsWith('@pc.sc.gov.br')) {
      return res.status(400).json({
        error: 'Cadastro permitido apenas para e-mails institucionais (@pc.sc.gov.br).'
      });
    }

    const existingUser = await prisma.usuarios.findFirst({
      where: {
        OR: [
          { email: { equals: emailNorm, mode: 'insensitive' } },
          ...(matricula ? [{ matricula }] : [])
        ]
      }
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Usuário já existe com este email ou matrícula' });
    }

    const hashedPassword = await bcrypt.hash(plain, 12);
    const normalizedName = nome ? normalizeName(nome) : nome;

    const user = await prisma.usuarios.create({
      data: {
        email: emailNorm,
        nome: normalizedName,
        senha: hashedPassword,
        departamento,
        cargo: cargo ? normalizeCargo(cargo) : cargo, // cargo apenas antes do " - " + normalização
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
    if (!secret) return res.status(500).json({ error: 'JWT_SECRET não configurado no servidor' });

    const token = jwt.sign({ userId: String(user.id) }, secret, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

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

    const emailNorm = normalizeEmail(email);

    // Usa busca case-insensitive para compatibilidade com registros antigos
    const user = await prisma.usuarios.findFirst({
      where: { email: { equals: emailNorm, mode: 'insensitive' } },
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

    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
    if (!user.esta_ativo)
      return res
        .status(401)
        .json({ error: 'Conta desativada. Entre em contato com o administrador.' });

    const ok = await bcrypt.compare(plain, user.senha);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

    await prisma.usuarios.update({
      where: { id: user.id },
      data: { ultimo_login: new Date(), email: emailNorm } // garante email normalizado salvo
    });

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'JWT_SECRET não configurado no servidor' });

    const token = jwt.sign({ userId: String(user.id) }, secret, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    const { senha: _ignored, ...userWithoutPassword } = user;
    // reflete o email normalizado na resposta
    return res.json({
      message: 'Login realizado com sucesso',
      user: { ...userWithoutPassword, email: emailNorm },
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

/**
 * Autenticação via Google.
 *
 * Este endpoint recebe um idToken do Google, valida a assinatura e domínio
 * institucional (@pc.sc.gov.br), procura o usuário correspondente no banco
 * de dados e, se inexistente, tenta buscar dados adicionais em um arquivo
 * JSON de utilidades (src/utils/user.json) para completar o cadastro.
 * Em seguida, cria ou retorna o usuário no banco e gera um token JWT da
 * aplicação.
 *
 * Espera-se que a variável de ambiente GOOGLE_CLIENT_ID esteja definida
 * no backend para validar a audiência do token.
 */
export const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken ausente' });

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId)
      return res.status(500).json({ error: 'GOOGLE_CLIENT_ID não configurado no servidor' });

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();

    // normaliza e-mail do Google
    const email = normalizeEmail(payload?.email || '');
    const emailVerified = payload?.email_verified === true;
    const hd = payload?.hd || '';
    const nomeGoogle = payload?.name || '';
    const picture = payload?.picture || null;

    const allowedDomain = 'pc.sc.gov.br';
    const domainOk = hd === allowedDomain || email.endsWith(`@${allowedDomain}`);
    if (!emailVerified || !domainOk) {
      console.warn(
        `Login Google recusado para ${email} - emailVerificado:${emailVerified} dominioOk:${domainOk}`
      );
      return res.status(403).json({ error: 'Domínio não autorizado' });
    }

    // Busca usuário existente (case-insensitive)
    let user = await prisma.usuarios.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
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

    if (!user) {
      // carrega dados auxiliares
      let additional = null;
      try {
        const filePath = path.join(process.cwd(), 'src', 'utils', 'user.json');
        const rawData = fs.readFileSync(filePath, 'utf8');
        const arr = JSON.parse(rawData);
        additional = arr.find(u => normalizeEmail(u.email || '') === email);
      } catch (err) {
        console.warn('Falha ao ler user.json:', err.message);
      }

      // Nome normalizado
      const rawName = additional?.nome || nomeGoogle || email.split('@')[0];
      const nome = normalizeName(rawName);

      // (1) Departamento: local_trabalho -> trabalhandoem -> unidadelotacao (antes do " - ")
      const deptSrc =
        additional?.local_trabalho ??
        additional?.trabalhandoem ??
        additional?.unidadelotacao ??
        null;
      const departamento = deptSrc ? normalizeOrg(deptSrc) : null;

      // (2) Cargo normalizado (antes do " - ")
      const cargo = additional?.cargo ? normalizeCargo(additional.cargo) : null;

      // (3) Telefone = DDD + celular
      const ddd = additional?.num_ddd_celular || additional?.ddd || '';
      const cel = additional?.num_celular || additional?.fone || '';
      const telefone =
        ddd || cel ? `${String(ddd).trim()}${String(cel).trim()}` : null;

      // (4) Localização = municipiolotacao normalizado
      const localizacao = additional?.municipiolotacao
        ? normalizeName(additional.municipiolotacao)
        : null;

      const matricula = additional?.matricula || null;
      const biografia = null;

      const randomPass = crypto.randomUUID();
      const hashedPassword = await bcrypt.hash(randomPass, 12);

      user = await prisma.usuarios.create({
        data: {
          email, // já normalizado (lowercase)
          nome,
          senha: hashedPassword,
          departamento,
          cargo, // ex.: "Delegado de Policia"
          matricula,
          telefone,
          localizacao,
          biografia,
          avatar: picture,
          esta_ativo: true,
          e_admin: false,
          e_moderador: false
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
          avatar: true,
          esta_ativo: true,
          e_admin: true,
          e_moderador: true,
          data_entrada: true,
          ultimo_login: true
        }
      });
    }

    // Atualiza ultimo_login e garante e-mail normalizado salvo
    try {
      await prisma.usuarios.update({
        where: { id: user.id },
        data: { ultimo_login: new Date(), email }
      });
    } catch (err) {
      console.warn('Falha ao atualizar ultimo_login para usuário Google:', err.message);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'JWT_SECRET não configurado no servidor' });

    const token = jwt.sign({ userId: String(user.id) }, secret, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    return res.json({
      message: 'Login via Google realizado com sucesso',
      user,
      token
    });
  } catch (error) {
    console.error('Erro no login Google:', error);
    return res.status(500).json({
      error: 'Erro interno ao processar login Google',
      ...(process.env.NODE_ENV !== 'production' && { details: error.message })
    });
  }
};

export const logout = async (_req, res) => {
  return res.json({ message: 'Logout realizado com sucesso' });
};

import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

/**
 * Rota: POST /api/login
 * Validação simples de email e senha
 */
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }

  try {
    const query = 'SELECT id, nome, email FROM usuarios WHERE email = $1 AND senha = $2';
    const { rows } = await pool.query(query, [email, senha]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Email ou senha inválidos.' });
    }

    const usuario = rows[0];
    res.json(usuario);
  } catch (error) {
    console.error('Erro ao realizar login:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao realizar login' });
  }
});

export default router;

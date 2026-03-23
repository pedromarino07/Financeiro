import express from 'express';
import { getTransactions, createTransaction } from '../controllers/transactionController.js';

const router = express.Router();

// Endpoint para buscar todas as transações
router.get('/transacoes', getTransactions);

// Endpoint para criar uma nova transação
router.post('/transacoes', createTransaction);

export default router;

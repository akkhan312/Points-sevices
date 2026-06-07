import { Request, Response } from 'express';
import { PointsWalletService } from '../wallet.service';
import { WalletModel } from '../models/Wallet';
import { TransactionModel } from '../models/Transaction';

const walletService = new PointsWalletService();

export const awardPoints = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, points } = req.body;
    const requestId = req.headers['x-request-id'] as string;

    if (!requestId) {
      res.status(400).json({ error: 'x-request-id header is required' });
      return;
    }

    const state = await walletService.award(userId, points, requestId);
    res.status(200).json(state);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const redeemPoints = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, points } = req.body;
    const requestId = req.headers['x-request-id'] as string;

    if (!requestId) {
      res.status(400).json({ error: 'x-request-id header is required' });
      return;
    }

    const state = await walletService.redeem(userId, points, requestId);
    res.status(200).json(state);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const convertPoints = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, points, rate } = req.body;
    const requestId = req.headers['x-request-id'] as string;

    if (!requestId) {
      res.status(400).json({ error: 'x-request-id header is required' });
      return;
    }

    const conversionRate = rate || 0.5; // Default rate if not provided
    const state = await walletService.convertPointsToCash(userId, points, conversionRate, requestId);
    res.status(200).json(state);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getWallet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const wallet = await WalletModel.findOne({ userId });
    
    if (!wallet) {
      res.status(404).json({ error: 'Wallet not found' });
      return;
    }
    
    res.status(200).json({
      userId: wallet.userId,
      points: wallet.points,
      cashHalalas: wallet.cashHalalas
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getLedger = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const transactions = await TransactionModel.find({ userId }).sort({ timestamp: -1 });
    
    res.status(200).json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

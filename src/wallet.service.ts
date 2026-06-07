import { WalletState } from './types';
import { WalletLockManager } from './lock';
import { WalletModel, TransactionModel, IdempotentRequestModel } from './db';

export class PointsWalletService {
  private lockManager = new WalletLockManager();

  private async getOrCreateWallet(userId: string) {
    let wallet = await WalletModel.findOne({ userId });
    if (!wallet) {
      wallet = new WalletModel({ userId, points: 0, cashHalalas: 0 });
      await wallet.save();
    }
    return wallet;
  }

  private async executeWithLock(
    userId: string,
    requestId: string,
    operation: () => Promise<WalletState>
  ): Promise<WalletState> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid userId: must be a non-empty string');
    }
    if (!requestId || typeof requestId !== 'string' || requestId.trim() === '') {
      throw new Error('Invalid requestId: must be a non-empty string');
    }

    let requestDoc = await IdempotentRequestModel.findOne({ requestId });
    if (requestDoc) {
      if (!requestDoc.inProgress) {
        if (requestDoc.success) {
          return requestDoc.result as WalletState;
        } else {
          throw new Error(requestDoc.errorMessage!);
        }
      } else {
        throw new Error(`Request with ID ${requestId} is already in progress`);
      }
    }

    requestDoc = new IdempotentRequestModel({
      requestId,
      inProgress: true
    });
    try {
      await requestDoc.save();
    } catch (err: any) {
      if (err.code === 11000) { // Duplicate key
        throw new Error(`Request with ID ${requestId} is already in progress`);
      }
      throw err;
    }

    try {
      const release = await this.lockManager.acquire(userId);
      try {
        const result = await operation();
        requestDoc.inProgress = false;
        requestDoc.success = true;
        requestDoc.result = result;
        await requestDoc.save();
        return result;
      } catch (err: any) {
        const msg = err.message || 'Unknown error occurred';
        requestDoc.inProgress = false;
        requestDoc.success = false;
        requestDoc.errorMessage = msg;
        await requestDoc.save();
        throw err;
      } finally {
        release();
      }
    } catch (err) {
      // In case acquiring lock fails or unexpected error
      throw err;
    }
  }

  async award(userId: string, points: number, requestId: string): Promise<WalletState> {
    if (points <= 0 || !Number.isInteger(points)) {
      throw new Error('Points to award must be a positive integer');
    }

    return this.executeWithLock(userId, requestId, async () => {
      const wallet = await this.getOrCreateWallet(userId);
      wallet.points += points;
      await wallet.save();

      const tx = new TransactionModel({
        requestId,
        userId,
        type: 'award',
        points,
        cashHalalas: 0
      });
      await tx.save();

      return { userId: wallet.userId, points: wallet.points, cashHalalas: wallet.cashHalalas };
    });
  }

  async redeem(userId: string, points: number, requestId: string): Promise<WalletState> {
    if (points <= 0 || !Number.isInteger(points)) {
      throw new Error('Points to redeem must be a positive integer');
    }

    return this.executeWithLock(userId, requestId, async () => {
      const wallet = await this.getOrCreateWallet(userId);
      if (wallet.points < points) {
        throw new Error('Insufficient points balance');
      }

      wallet.points -= points;
      await wallet.save();

      const tx = new TransactionModel({
        requestId,
        userId,
        type: 'redeem',
        points: -points,
        cashHalalas: 0
      });
      await tx.save();

      return { userId: wallet.userId, points: wallet.points, cashHalalas: wallet.cashHalalas };
    });
  }

  async convertPointsToCash(
    userId: string,
    points: number,
    rate: number,
    requestId: string
  ): Promise<WalletState> {
    if (points <= 0 || !Number.isInteger(points)) {
      throw new Error('Points to convert must be a positive integer');
    }
    if (rate <= 0 || typeof rate !== 'number' || isNaN(rate)) {
      throw new Error('Rate must be a positive number');
    }

    return this.executeWithLock(userId, requestId, async () => {
      const wallet = await this.getOrCreateWallet(userId);
      if (wallet.points < points) {
        throw new Error('Insufficient points balance for conversion');
      }

      const cashHalalas = Math.floor(points * rate);

      wallet.points -= points;
      wallet.cashHalalas += cashHalalas;
      await wallet.save();

      const tx = new TransactionModel({
        requestId,
        userId,
        type: 'convert_points_to_cash',
        points: -points,
        cashHalalas,
        metadata: { rate }
      });
      await tx.save();

      return { userId: wallet.userId, points: wallet.points, cashHalalas: wallet.cashHalalas };
    });
  }

  async getWallet(userId: string): Promise<WalletState> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid userId: must be a non-empty string');
    }

    const release = await this.lockManager.acquire(userId);
    try {
      const wallet = await this.getOrCreateWallet(userId);
      return { userId: wallet.userId, points: wallet.points, cashHalalas: wallet.cashHalalas };
    } finally {
      release();
    }
  }

  async getLedger(userId?: string) {
    if (userId) {
      return await TransactionModel.find({ userId }).sort({ timestamp: -1 });
    }
    return await TransactionModel.find().sort({ timestamp: -1 });
  }
}

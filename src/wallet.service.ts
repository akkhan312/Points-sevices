import { Wallet, Transaction, WalletState } from './types';
import { WalletLockManager } from './lock';

export class PointsWalletService {
  private wallets = new Map<string, Wallet>();
  private ledger: Transaction[] = [];
  private processedRequests = new Map<
    string,
    { success: boolean; result?: WalletState; errorMessage?: string }
  >();
  private pendingRequests = new Set<string>();
  private lockManager = new WalletLockManager();

  private getOrCreateWallet(userId: string): Wallet {
    let wallet = this.wallets.get(userId);
    if (!wallet) {
      wallet = { userId, points: 0, cashHalalas: 0 };
      this.wallets.set(userId, wallet);
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

    const cached = this.processedRequests.get(requestId);
    if (cached) {
      if (cached.success) {
        return cached.result!;
      } else {
        throw new Error(cached.errorMessage!);
      }
    }

    if (this.pendingRequests.has(requestId)) {
      throw new Error(`Request with ID ${requestId} is already in progress`);
    }
    this.pendingRequests.add(requestId);

    try {
      const release = await this.lockManager.acquire(userId);
      try {
        const cachedInside = this.processedRequests.get(requestId);
        if (cachedInside) {
          if (cachedInside.success) {
            return cachedInside.result!;
          } else {
            throw new Error(cachedInside.errorMessage!);
          }
        }

        try {
          const result = await operation();
          this.processedRequests.set(requestId, { success: true, result });
          return result;
        } catch (err: any) {
          const msg = err.message || 'Unknown error occurred';
          this.processedRequests.set(requestId, { success: false, errorMessage: msg });
          throw err;
        }
      } finally {
        release();
      }
    } finally {
      this.pendingRequests.delete(requestId);
    }
  }

  async award(userId: string, points: number, requestId: string): Promise<WalletState> {
    if (points <= 0 || !Number.isInteger(points)) {
      throw new Error('Points to award must be a positive integer');
    }

    return this.executeWithLock(userId, requestId, async () => {
      const wallet = this.getOrCreateWallet(userId);
      wallet.points += points;

      const tx: Transaction = {
        requestId,
        userId,
        type: 'award',
        points,
        cashHalalas: 0,
        timestamp: new Date(),
      };
      this.ledger.push(tx);

      return { userId: wallet.userId, points: wallet.points, cashHalalas: wallet.cashHalalas };
    });
  }

  async redeem(userId: string, points: number, requestId: string): Promise<WalletState> {
    if (points <= 0 || !Number.isInteger(points)) {
      throw new Error('Points to redeem must be a positive integer');
    }

    return this.executeWithLock(userId, requestId, async () => {
      const wallet = this.getOrCreateWallet(userId);
      if (wallet.points < points) {
        throw new Error('Insufficient points balance');
      }

      wallet.points -= points;

      const tx: Transaction = {
        requestId,
        userId,
        type: 'redeem',
        points: -points,
        cashHalalas: 0,
        timestamp: new Date(),
      };
      this.ledger.push(tx);

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
      const wallet = this.getOrCreateWallet(userId);
      if (wallet.points < points) {
        throw new Error('Insufficient points balance for conversion');
      }

      const cashHalalas = Math.floor(points * rate);

      wallet.points -= points;
      wallet.cashHalalas += cashHalalas;

      const tx: Transaction = {
        requestId,
        userId,
        type: 'convert_points_to_cash',
        points: -points,
        cashHalalas,
        timestamp: new Date(),
        metadata: { rate },
      };
      this.ledger.push(tx);

      return { userId: wallet.userId, points: wallet.points, cashHalalas: wallet.cashHalalas };
    });
  }

  async getWallet(userId: string): Promise<WalletState> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid userId: must be a non-empty string');
    }

    const release = await this.lockManager.acquire(userId);
    try {
      const wallet = this.getOrCreateWallet(userId);
      return { userId: wallet.userId, points: wallet.points, cashHalalas: wallet.cashHalalas };
    } finally {
      release();
    }
  }

  getLedger(): Transaction[] {
    return [...this.ledger];
  }
}

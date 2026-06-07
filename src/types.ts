export interface Wallet {
  userId: string;
  points: number;
  cashHalalas: number;
}

export type TransactionType = 'award' | 'redeem' | 'convert_points_to_cash';

export interface Transaction {
  requestId: string;
  userId: string;
  type: TransactionType;
  points: number;
  cashHalalas: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface WalletState {
  userId: string;
  points: number;
  cashHalalas: number;
}

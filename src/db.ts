import mongoose, { Schema, Document } from 'mongoose';
import { TransactionType, WalletState } from './types';

export interface IWallet extends Document {
  userId: string;
  points: number;
  cashHalalas: number;
}

const WalletSchema = new Schema<IWallet>({
  userId: { type: String, required: true, unique: true },
  points: { type: Number, required: true, default: 0, min: 0 },
  cashHalalas: { type: Number, required: true, default: 0 }
});

export interface ITransaction extends Document {
  requestId: string;
  userId: string;
  type: TransactionType;
  points: number;
  cashHalalas: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

const TransactionSchema = new Schema<ITransaction>({
  requestId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  type: { type: String, required: true, enum: ['award', 'redeem', 'convert_points_to_cash'] },
  points: { type: Number, required: true },
  cashHalalas: { type: Number, required: true },
  timestamp: { type: Date, required: true, default: Date.now },
  metadata: { type: Schema.Types.Mixed }
});

export interface IIdempotentRequest extends Document {
  requestId: string;
  success?: boolean;
  inProgress: boolean;
  result?: WalletState;
  errorMessage?: string;
}

const IdempotentRequestSchema = new Schema<IIdempotentRequest>({
  requestId: { type: String, required: true, unique: true },
  success: { type: Boolean },
  inProgress: { type: Boolean, required: true, default: true },
  result: { type: Schema.Types.Mixed },
  errorMessage: { type: String }
});

export const WalletModel = mongoose.model<IWallet>('Wallet', WalletSchema);
export const TransactionModel = mongoose.model<ITransaction>('Transaction', TransactionSchema);
export const IdempotentRequestModel = mongoose.model<IIdempotentRequest>('IdempotentRequest', IdempotentRequestSchema);

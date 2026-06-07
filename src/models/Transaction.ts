import mongoose, { Schema, Document } from 'mongoose';
import { TransactionType } from '../types';

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

export const TransactionModel = mongoose.model<ITransaction>('Transaction', TransactionSchema);

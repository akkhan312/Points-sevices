import mongoose, { Schema, Document } from 'mongoose';

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

export const WalletModel = mongoose.model<IWallet>('Wallet', WalletSchema);

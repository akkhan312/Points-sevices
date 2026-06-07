import mongoose, { Schema, Document } from 'mongoose';
import { WalletState } from '../types';

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

export const IdempotentRequestModel = mongoose.model<IIdempotentRequest>('IdempotentRequest', IdempotentRequestSchema);

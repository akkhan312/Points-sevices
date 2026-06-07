import express from 'express';
import { awardPoints, redeemPoints, convertPoints, getWallet, getLedger } from './controllers/wallet.controller';

const app = express();
app.use(express.json());

app.post('/api/wallet/award', awardPoints);
app.post('/api/wallet/redeem', redeemPoints);
app.post('/api/wallet/convert', convertPoints);
app.get('/api/wallet/:userId', getWallet);
app.get('/api/wallet/:userId/ledger', getLedger);

export default app;

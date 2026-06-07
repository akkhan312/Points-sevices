import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('PointsWallet API', () => {
  const userId = 'user_123';

  it('should award points', async () => {
    const res = await request(app)
      .post('/api/wallet/award')
      .set('x-request-id', 'req-1')
      .send({ userId, points: 100 });

    expect(res.status).toBe(200);
    expect(res.body.points).toBe(100);
    expect(res.body.cashHalalas).toBe(0);
  });

  it('should handle idempotent award requests', async () => {
    const res1 = await request(app)
      .post('/api/wallet/award')
      .set('x-request-id', 'req-idemp-1')
      .send({ userId, points: 50 });

    const res2 = await request(app)
      .post('/api/wallet/award')
      .set('x-request-id', 'req-idemp-1')
      .send({ userId, points: 50 });

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body).toEqual(res2.body);

    const getRes = await request(app).get(`/api/wallet/${userId}`);
    expect(getRes.body.points).toBe(50); // Only added once
  });

  it('should redeem points', async () => {
    await request(app)
      .post('/api/wallet/award')
      .set('x-request-id', 'req-2')
      .send({ userId, points: 200 });

    const res = await request(app)
      .post('/api/wallet/redeem')
      .set('x-request-id', 'req-3')
      .send({ userId, points: 50 });

    expect(res.status).toBe(200);
    expect(res.body.points).toBe(150);
  });

  it('should fail to redeem if insufficient points', async () => {
    const res = await request(app)
      .post('/api/wallet/redeem')
      .set('x-request-id', 'req-4')
      .send({ userId, points: 500 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Insufficient points balance');
  });

  it('should convert points to cash correctly', async () => {
    await request(app)
      .post('/api/wallet/award')
      .set('x-request-id', 'req-5')
      .send({ userId, points: 1000 });

    const res = await request(app)
      .post('/api/wallet/convert')
      .set('x-request-id', 'req-6')
      .send({ userId, points: 100, rate: 0.5 }); // 100 points * 0.5 = 50 halalas

    expect(res.status).toBe(200);
    expect(res.body.points).toBe(900);
    expect(res.body.cashHalalas).toBe(50);
  });
  
  it('should retrieve ledger', async () => {
    await request(app)
      .post('/api/wallet/award')
      .set('x-request-id', 'req-7')
      .send({ userId, points: 100 });

    const res = await request(app).get(`/api/wallet/${userId}/ledger`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].type).toBe('award');
    expect(res.body[0].points).toBe(100);
  });
});

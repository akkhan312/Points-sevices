import { PointsWalletService } from '../src/wallet.service';

describe('PointsWalletService', () => {
  let service: PointsWalletService;
  const userId = 'user_123';

  beforeEach(() => {
    service = new PointsWalletService();
  });

  describe('award()', () => {
    it('should successfully award points and log the transaction', async () => {
      const state = await service.award(userId, 100, 'req_1');
      expect(state).toEqual({
        userId,
        points: 100,
        cashHalalas: 0,
      });

      const current = await service.getWallet(userId);
      expect(current).toEqual(state);

      const ledger = service.getLedger();
      expect(ledger).toHaveLength(1);
      expect(ledger[0]).toMatchObject({
        requestId: 'req_1',
        userId,
        type: 'award',
        points: 100,
        cashHalalas: 0,
      });
      expect(ledger[0].timestamp).toBeInstanceOf(Date);
    });

    it('should throw error for invalid points value', async () => {
      await expect(service.award(userId, 0, 'req_2')).rejects.toThrow(
        'Points to award must be a positive integer'
      );
      await expect(service.award(userId, -5, 'req_3')).rejects.toThrow(
        'Points to award must be a positive integer'
      );
      await expect(service.award(userId, 10.5, 'req_4')).rejects.toThrow(
        'Points to award must be a positive integer'
      );
    });

    it('should throw error for invalid userId or requestId', async () => {
      await expect(service.award('', 100, 'req_5')).rejects.toThrow(
        'Invalid userId: must be a non-empty string'
      );
      await expect(service.award(userId, 100, '')).rejects.toThrow(
        'Invalid requestId: must be a non-empty string'
      );
    });
  });

  describe('redeem()', () => {
    beforeEach(async () => {
      await service.award(userId, 100, 'req_award');
    });

    it('should successfully redeem points and log the transaction', async () => {
      const state = await service.redeem(userId, 40, 'req_redeem_1');
      expect(state).toEqual({
        userId,
        points: 60,
        cashHalalas: 0,
      });

      const ledger = service.getLedger();
      expect(ledger).toHaveLength(2);
      expect(ledger[1]).toMatchObject({
        requestId: 'req_redeem_1',
        userId,
        type: 'redeem',
        points: -40,
        cashHalalas: 0,
      });
    });

    it('should reject redemption if balance becomes negative', async () => {
      await expect(service.redeem(userId, 150, 'req_redeem_2')).rejects.toThrow(
        'Insufficient points balance'
      );

      const state = await service.getWallet(userId);
      expect(state.points).toBe(100);
    });

    it('should throw error for invalid points value', async () => {
      await expect(service.redeem(userId, 0, 'req_redeem_3')).rejects.toThrow(
        'Points to redeem must be a positive integer'
      );
      await expect(service.redeem(userId, -10, 'req_redeem_4')).rejects.toThrow(
        'Points to redeem must be a positive integer'
      );
      await expect(service.redeem(userId, 5.5, 'req_redeem_5')).rejects.toThrow(
        'Points to redeem must be a positive integer'
      );
    });
  });

  describe('convertPointsToCash()', () => {
    beforeEach(async () => {
      await service.award(userId, 100, 'req_award');
    });

    it('should convert points to cash (halalas) using integer minor units', async () => {
      const state = await service.convertPointsToCash(userId, 10, 5.5, 'req_conv_1');
      expect(state).toEqual({
        userId,
        points: 90,
        cashHalalas: 55,
      });

      const ledger = service.getLedger();
      expect(ledger[1]).toMatchObject({
        requestId: 'req_conv_1',
        userId,
        type: 'convert_points_to_cash',
        points: -10,
        cashHalalas: 55,
        metadata: { rate: 5.5 },
      });
    });

    it('should round down fractional cash to always store integer minor units (never floats)', async () => {
      const state = await service.convertPointsToCash(userId, 3, 2.75, 'req_conv_2');
      expect(state.cashHalalas).toBe(8);
      expect(Number.isInteger(state.cashHalalas)).toBe(true);
    });

    it('should reject conversion if points exceed balance', async () => {
      await expect(service.convertPointsToCash(userId, 120, 2.0, 'req_conv_3')).rejects.toThrow(
        'Insufficient points balance for conversion'
      );
    });

    it('should throw error for invalid rate values', async () => {
      await expect(service.convertPointsToCash(userId, 10, 0, 'req_conv_4')).rejects.toThrow(
        'Rate must be a positive number'
      );
      await expect(service.convertPointsToCash(userId, 10, -1.5, 'req_conv_5')).rejects.toThrow(
        'Rate must be a positive number'
      );
      await expect(service.convertPointsToCash(userId, 10, NaN, 'req_conv_6')).rejects.toThrow(
        'Rate must be a positive number'
      );
    });

    it('should throw error for invalid points value', async () => {
      await expect(service.convertPointsToCash(userId, 0, 1.0, 'req_conv_err_1')).rejects.toThrow(
        'Points to convert must be a positive integer'
      );
      await expect(service.convertPointsToCash(userId, -5, 1.0, 'req_conv_err_2')).rejects.toThrow(
        'Points to convert must be a positive integer'
      );
      await expect(service.convertPointsToCash(userId, 2.5, 1.0, 'req_conv_err_3')).rejects.toThrow(
        'Points to convert must be a positive integer'
      );
    });
  });

  describe('Idempotency', () => {
    it('should return identical successful result on duplicate award request', async () => {
      const state1 = await service.award(userId, 50, 'req_idemp_1');
      const state2 = await service.award(userId, 50, 'req_idemp_1');

      expect(state1).toEqual(state2);
      expect(state1.points).toBe(50);

      expect(service.getLedger()).toHaveLength(1);
    });

    it('should return identical successful result on duplicate redeem request', async () => {
      await service.award(userId, 100, 'req_award');

      const state1 = await service.redeem(userId, 30, 'req_idemp_2');
      const state2 = await service.redeem(userId, 30, 'req_idemp_2');

      expect(state1).toEqual(state2);
      expect(state1.points).toBe(70);

      expect(service.getLedger()).toHaveLength(2);
    });

    it('should return identical error on duplicate request that failed validation', async () => {
      await expect(service.redeem(userId, 100, 'req_idemp_fail')).rejects.toThrow(
        'Insufficient points balance'
      );

      await expect(service.redeem(userId, 100, 'req_idemp_fail')).rejects.toThrow(
        'Insufficient points balance'
      );

      await service.award(userId, 200, 'req_refill');
      await expect(service.redeem(userId, 100, 'req_idemp_fail')).rejects.toThrow(
        'Insufficient points balance'
      );
    });

    it('should prevent concurrent execution of duplicate request IDs', async () => {
      const p1 = service.award(userId, 50, 'req_concurrent_dup');
      const p2 = service.award(userId, 50, 'req_concurrent_dup');

      const results = await Promise.allSettled([p1, p2]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason.message).toContain(
        'already in progress'
      );
    });
  });

  describe('Concurrency Locks', () => {
    it('should safely serialize concurrent operations for the same user and prevent balance going negative', async () => {
      await service.award(userId, 100, 'req_refill_lock');

      const requests = Array.from({ length: 5 }, (_, i) =>
        service.redeem(userId, 30, `req_lock_${i}`)
      );

      const outcomes = await Promise.allSettled(requests);

      const fulfilledCount = outcomes.filter((o) => o.status === 'fulfilled').length;
      const rejectedCount = outcomes.filter((o) => o.status === 'rejected').length;

      expect(fulfilledCount).toBe(3);
      expect(rejectedCount).toBe(2);

      const finalState = await service.getWallet(userId);
      expect(finalState.points).toBe(10);
    });

    it('should allow concurrent operations for different users to run without blocking each other', async () => {
      const userA = 'user_A';
      const userB = 'user_B';

      await service.award(userA, 100, 'req_userA_award');
      await service.award(userB, 100, 'req_userB_award');

      const p1 = service.redeem(userA, 50, 'req_userA_redeem');
      const p2 = service.redeem(userB, 50, 'req_userB_redeem');

      const results = await Promise.all([p1, p2]);
      expect(results[0].points).toBe(50);
      expect(results[1].points).toBe(50);
    });
  });

  describe('getWallet()', () => {
    it('should throw error for invalid userId', async () => {
      await expect(service.getWallet('')).rejects.toThrow(
        'Invalid userId: must be a non-empty string'
      );
      await expect(service.getWallet('   ')).rejects.toThrow(
        'Invalid userId: must be a non-empty string'
      );
    });
  });
});

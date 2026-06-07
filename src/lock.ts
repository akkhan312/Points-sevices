export class UserLock {
  private queue: Promise<void> = Promise.resolve();

  async acquire(): Promise<() => void> {
    let release: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });

    const current = this.queue;
    this.queue = next;

    await current;
    return release!;
  }
}

export class WalletLockManager {
  private locks = new Map<string, UserLock>();

  async acquire(userId: string): Promise<() => void> {
    let lock = this.locks.get(userId);
    if (!lock) {
      lock = new UserLock();
      this.locks.set(userId, lock);
    }
    return lock.acquire();
  }
}

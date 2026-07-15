import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSecurityStore } from '@/store/securityStore';

const mocks = vi.hoisted(() => ({
  isLockEnabled: vi.fn<() => Promise<boolean>>(),
}));

vi.mock('@/services/securityService', () => ({
  securityService: {
    isLockEnabled: mocks.isLockEnabled,
    setLockEnabled: vi.fn(),
    authenticate: vi.fn(),
  },
}));

describe('securityStore hydrate', () => {
  beforeEach(() => {
    mocks.isLockEnabled.mockReset();
    useSecurityStore.setState({ hydrated: false, enabled: false, locked: false });
  });

  it('按本地安全锁设置完成初始化', async () => {
    mocks.isLockEnabled.mockResolvedValue(true);

    await useSecurityStore.getState().hydrate();

    expect(useSecurityStore.getState()).toMatchObject({ hydrated: true, enabled: true, locked: true });
  });

  it('安全凭据库异常时降级进入本地模式', async () => {
    mocks.isLockEnabled.mockRejectedValue(new Error('keystore unavailable'));

    await expect(useSecurityStore.getState().hydrate()).resolves.toBeUndefined();
    expect(useSecurityStore.getState()).toMatchObject({ hydrated: true, enabled: false, locked: false });
  });
});

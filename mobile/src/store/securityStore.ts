import { create } from 'zustand';
import { securityService } from '@/services/securityService';

interface SecurityStore {
  hydrated: boolean;
  enabled: boolean;
  locked: boolean;
  hydrate: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  lock: () => void;
  unlock: () => Promise<boolean>;
}

export const useSecurityStore = create<SecurityStore>((set, get) => ({
  hydrated: false,
  enabled: false,
  locked: false,

  hydrate: async () => {
    try {
      const enabled = await securityService.isLockEnabled();
      set({ enabled, locked: enabled, hydrated: true });
    } catch {
      // 部分 Android 厂商系统在首次访问安全凭据库时可能返回异常。
      // 安全锁属于可选功能，读取失败不能阻塞用户进入本地日记。
      set({ enabled: false, locked: false, hydrated: true });
    }
  },

  setEnabled: async (enabled) => {
    await securityService.setLockEnabled(enabled);
    set({ enabled, locked: false });
  },

  lock: () => {
    if (get().enabled) set({ locked: true });
  },

  unlock: async () => {
    const success = await securityService.authenticate();
    if (success) set({ locked: false });
    return success;
  },
}));

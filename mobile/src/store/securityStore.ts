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
    const enabled = await securityService.isLockEnabled();
    set({ enabled, locked: enabled, hydrated: true });
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

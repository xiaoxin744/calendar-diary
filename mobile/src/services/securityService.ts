import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const LOCK_KEY = 'calendar-diary:app-lock-enabled';

export const securityService = {
  async isLockEnabled(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    return await SecureStore.getItemAsync(LOCK_KEY) === 'true';
  },

  async canEnableLock(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    return await LocalAuthentication.hasHardwareAsync() && await LocalAuthentication.isEnrolledAsync();
  },

  async setLockEnabled(enabled: boolean): Promise<void> {
    if (Platform.OS === 'web') throw new Error('Web 预览不支持设备生物识别。');
    if (enabled && !await this.canEnableLock()) throw new Error('设备未配置可用的指纹或面容识别。');
    await SecureStore.setItemAsync(LOCK_KEY, String(enabled), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  async authenticate(): Promise<boolean> {
    if (Platform.OS === 'web') return true;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: '解锁日历日记',
      cancelLabel: '取消',
      fallbackLabel: '使用设备密码',
      disableDeviceFallback: false,
    });
    return result.success;
  },
};

import type { DayData } from '../types';

type CalendarData = Record<string, DayData>;
type MonthlyPlans = Record<string, string[]>;

// 存储服务 - 兼容浏览器和 Electron 环境
export class StorageService {
  private static isElectron(): boolean {
    return typeof window !== 'undefined' && 'electronAPI' in window;
  }

  // 获取日历数据
  private static parseStoredObject<T extends object>(value: string | null, storageKey: string): T {
    if (!value) return {} as T;

    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as T;
      }
    } catch (error) {
      console.error(`Unable to parse local storage key "${storageKey}":`, error);
    }
    return {} as T;
  }

  static async getData(): Promise<CalendarData> {
    if (this.isElectron()) {
      return await window.electronAPI.storage.getData();
    } else {
      return this.parseStoredObject<CalendarData>(localStorage.getItem('paperplan_data'), 'paperplan_data');
    }
  }

  // 保存日历数据
  static async setData(data: CalendarData): Promise<void> {
    if (this.isElectron()) {
      const result = await window.electronAPI.storage.setData(data);
      if (!result.success) throw new Error(result.error || 'Failed to save calendar data');
    } else {
      localStorage.setItem('paperplan_data', JSON.stringify(data));
    }
  }

  // 获取月度计划
  static async getPlans(): Promise<MonthlyPlans> {
    if (this.isElectron()) {
      return await window.electronAPI.storage.getPlans();
    } else {
      return this.parseStoredObject<MonthlyPlans>(localStorage.getItem('paperplan_plans'), 'paperplan_plans');
    }
  }

  // 保存月度计划
  static async setPlans(plans: MonthlyPlans): Promise<void> {
    if (this.isElectron()) {
      const result = await window.electronAPI.storage.setPlans(plans);
      if (!result.success) throw new Error(result.error || 'Failed to save monthly plans');
    } else {
      localStorage.setItem('paperplan_plans', JSON.stringify(plans));
    }
  }
}

// WebDAV 同步服务
import { createClient, type WebDAVClient, type FileStat } from 'webdav';
import type { DayData } from '../types';
import { isSyncData } from '../utils/dataValidation';

export interface WebDAVConfig {
  serverUrl: string;
  username: string;
  password: string;
  rootPath: string; // 默认为 /CalendarDiary
}

export interface SyncData {
  version: number;
  updatedAt: string; // ISO 时间戳
  data: Record<string, DayData>;
  monthlyPlans: Record<string, string[]>;
}

export interface BackupFile {
  filename: string;
  path: string;
  lastModified: string;
  size: number;
}

export type SyncLogCallback = (message: string, type?: 'info' | 'error' | 'success') => void;

const STORAGE_KEY = 'calendar-diary-webdav';
const DATA_PATH = '/data/current.json';
const BACKUPS_PATH = '/backups';
const BACKUP_FILENAME_PATTERN = /^backup-\d{8}-\d{6}\.json$/;

export class WebDAVService {
  private client: WebDAVClient | null = null;
  private config: WebDAVConfig | null = null;

  // 获取保存的配置
  static getStoredConfig(): WebDAVConfig | null {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  }

  // 保存配置
  static saveConfig(config: WebDAVConfig): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  // 清除配置
  static clearConfig(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  // 初始化客户端 (别名: connect)
  initialize(config: WebDAVConfig): void {
    const serverUrl = new URL(config.serverUrl);
    if (serverUrl.protocol !== 'https:' && serverUrl.protocol !== 'http:') {
      throw new Error('WebDAV 地址必须使用 HTTP(S) 协议');
    }

    const rootSegments = (config.rootPath || '/CalendarDiary').split('/').filter(Boolean);
    if (rootSegments.some(segment => segment === '.' || segment === '..')) {
      throw new Error('WebDAV 根目录不能包含相对路径段');
    }

    const normalizedConfig = {
      ...config,
      serverUrl: serverUrl.toString(),
      rootPath: `/${rootSegments.join('/')}`,
    };
    this.config = normalizedConfig;
    this.client = createClient(normalizedConfig.serverUrl, {
      username: config.username,
      password: config.password,
    });
  }

  // connect 是 initialize 的别名，兼容不同调用方式
  connect(config: WebDAVConfig): void {
    this.initialize(config);
  }

  // 检查连接
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.client || !this.config) {
      return { success: false, error: '未初始化 WebDAV 客户端' };
    }

    try {
      // 尝试访问根目录
      await this.client.getDirectoryContents(this.config.rootPath || '/');
      return { success: true };
    } catch (error: any) {
      // 如果目录不存在，尝试创建
      if (error.status === 404) {
        try {
          await this.ensureDirectoryStructure();
          return { success: true };
        } catch (createError: any) {
          return { success: false, error: `无法创建目录结构: ${createError.message}` };
        }
      }
      return { success: false, error: error.message || '连接失败' };
    }
  }

  // 确保目录结构存在
  private async ensureDirectoryStructure(): Promise<void> {
    if (!this.client || !this.config) throw new Error('未初始化');

    const rootPath = this.config.rootPath || '/CalendarDiary';
    const paths = [
      rootPath,
      this.getFullPath('/data'),
      this.getFullPath('/backups'),
    ];

    for (const path of paths) {
      try {
        await this.client.stat(path);
      } catch (error: any) {
        if (error.status === 404) {
          await this.client.createDirectory(path);
        } else {
          throw error;
        }
      }
    }
  }

  // 获取完整路径
  private getFullPath(relativePath: string): string {
    const rootPath = this.config?.rootPath || '/CalendarDiary';
    return rootPath === '/' ? relativePath : `${rootPath}${relativePath}`;
  }

  // 读取云端数据
  async readRemoteData(): Promise<SyncData | null> {
    if (!this.client) throw new Error('未初始化');

    const fullPath = this.getFullPath(DATA_PATH);
    
    try {
      const content = await this.client.getFileContents(fullPath, { format: 'text' }) as string;
      const parsed: unknown = JSON.parse(content);
      if (!isSyncData(parsed)) throw new Error('云端数据格式无效');
      return parsed;
    } catch (error: any) {
      if (error.status === 404) {
        return null; // 文件不存在
      }
      throw error;
    }
  }

  // 写入云端数据
  async writeRemoteData(data: SyncData): Promise<void> {
    if (!this.client) throw new Error('未初始化');

    await this.ensureDirectoryStructure();
    
    const fullPath = this.getFullPath(DATA_PATH);
    const content = JSON.stringify(data, null, 2);
    
    await this.client.putFileContents(fullPath, content, {
      contentLength: false,
      overwrite: true,
    });
  }

  // 创建备份
  async createBackup(data: SyncData): Promise<string> {
    if (!this.client) throw new Error('未初始化');

    await this.ensureDirectoryStructure();

    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '-')
      .replace(/\.\d+Z$/, '');
    const filename = `backup-${timestamp}.json`;
    const fullPath = this.getFullPath(`${BACKUPS_PATH}/${filename}`);
    
    const content = JSON.stringify(data, null, 2);
    await this.client.putFileContents(fullPath, content, {
      contentLength: false,
      overwrite: false,
    });

    return filename;
  }

  // 获取备份列表
  async listBackups(): Promise<BackupFile[]> {
    if (!this.client) throw new Error('未初始化');

    const fullPath = this.getFullPath(BACKUPS_PATH);
    
    try {
      const items = await this.client.getDirectoryContents(fullPath) as FileStat[];
      
      return items
        .filter(item => item.type === 'file' && BACKUP_FILENAME_PATTERN.test(item.basename))
        .map(item => ({
          filename: item.basename,
          path: item.filename,
          lastModified: item.lastmod,
          size: item.size,
        }))
        .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    } catch (error: any) {
      if (error.status === 404) {
        return [];
      }
      throw error;
    }
  }

  // 读取备份文件
  async readBackup(filename: string): Promise<SyncData> {
    if (!this.client) throw new Error('未初始化');
    if (!BACKUP_FILENAME_PATTERN.test(filename)) throw new Error('备份文件名无效');

    const fullPath = this.getFullPath(`${BACKUPS_PATH}/${filename}`);
    const content = await this.client.getFileContents(fullPath, { format: 'text' }) as string;
    const parsed: unknown = JSON.parse(content);
    if (!isSyncData(parsed)) throw new Error('备份数据格式无效');
    return parsed;
  }

  // 删除备份文件
  async deleteBackup(filename: string): Promise<void> {
    if (!this.client) throw new Error('未初始化');
    if (!BACKUP_FILENAME_PATTERN.test(filename)) throw new Error('备份文件名无效');

    const fullPath = this.getFullPath(`${BACKUPS_PATH}/${filename}`);
    await this.client.deleteFile(fullPath);
  }

  // 格式化文件大小
  static formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // 格式化日期时间
  static formatDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}

// 单例导出
export const webdavService = new WebDAVService();

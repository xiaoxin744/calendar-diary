import { Base64 } from 'js-base64';
import { syncDataSchema } from '@/domain/schema';
import type { SyncData, WebDavConfig } from '@/domain/syncTypes';

const REQUEST_TIMEOUT_MS = 30_000;
const CURRENT_DATA_PATH = 'data/current.json';
const BACKUPS_PATH = 'backups';
const BACKUP_FILENAME_PATTERN = /^backup-\d{8}-\d{6}\.json$/;

export class WebDavError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'WebDavError';
  }
}

export interface RemoteSyncData {
  data: SyncData;
  etag: string | null;
}

const normalizeConfig = (config: WebDavConfig): WebDavConfig => {
  const serverUrl = new URL(config.serverUrl.trim());
  if (serverUrl.protocol !== 'https:' && serverUrl.protocol !== 'http:') {
    throw new Error('WebDAV 地址必须使用 HTTP 或 HTTPS。');
  }
  serverUrl.hash = '';
  serverUrl.search = '';
  if (!serverUrl.pathname.endsWith('/')) serverUrl.pathname += '/';

  const rootSegments = (config.rootPath.trim() || '/CalendarDiary').split('/').filter(Boolean);
  if (rootSegments.some((segment) => segment === '.' || segment === '..')) {
    throw new Error('WebDAV 目录不能包含相对路径。');
  }
  return {
    serverUrl: serverUrl.toString(),
    rootPath: `/${rootSegments.join('/')}`,
    username: config.username.trim(),
    password: config.password,
  };
};

const backupTimestamp = (date: Date): string => date.toISOString()
  .replace(/[-:]/g, '')
  .replace('T', '-')
  .replace(/\.\d+Z$/, '');

export class WebDavClient {
  readonly config: WebDavConfig;

  constructor(config: WebDavConfig) {
    this.config = normalizeConfig(config);
  }

  private buildUrl(relativePath = ''): string {
    const url = new URL(this.config.serverUrl);
    const serverPath = url.pathname.replace(/\/+$/, '');
    const rootPath = this.config.rootPath === '/' ? '' : this.config.rootPath;
    const childPath = relativePath.replace(/^\/+/, '');
    url.pathname = [serverPath, rootPath, childPath].filter(Boolean).join('/').replace(/\/{2,}/g, '/');
    return url.toString();
  }

  private async request(relativePath: string, init: RequestInit, acceptedStatuses: number[] = []): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const headers = new Headers(init.headers);
    if (this.config.username || this.config.password) {
      headers.set('Authorization', `Basic ${Base64.encode(`${this.config.username}:${this.config.password}`)}`);
    }

    try {
      const response = await fetch(this.buildUrl(relativePath), { ...init, headers, signal: controller.signal });
      if (!response.ok && !acceptedStatuses.includes(response.status)) {
        const details = (await response.text()).trim().slice(0, 300);
        throw new WebDavError(`WebDAV 请求失败（HTTP ${response.status}）${details ? `：${details}` : ''}`, response.status);
      }
      return response;
    } catch (error: unknown) {
      if (error instanceof WebDavError) throw error;
      if (error instanceof Error && error.name === 'AbortError') throw new Error('WebDAV 请求超时，请检查网络和服务器地址。');
      throw new Error(error instanceof Error ? error.message : 'WebDAV 网络请求失败。');
    } finally {
      clearTimeout(timeout);
    }
  }

  private async directoryExists(path: string): Promise<boolean> {
    const response = await this.request(path, {
      method: 'PROPFIND',
      headers: { Depth: '0', 'Content-Type': 'application/xml; charset=utf-8' },
      body: '<?xml version="1.0"?><propfind xmlns="DAV:"><prop><resourcetype/></prop></propfind>',
    }, [404, 207]);
    return response.status !== 404;
  }

  async ensureDirectories(): Promise<void> {
    for (const path of ['', 'data', BACKUPS_PATH]) {
      if (await this.directoryExists(path)) continue;
      await this.request(path, { method: 'MKCOL' }, [201, 405]);
    }
  }

  async testConnection(): Promise<void> {
    await this.ensureDirectories();
    await this.request('', {
      method: 'PROPFIND',
      headers: { Depth: '0', 'Content-Type': 'application/xml; charset=utf-8' },
      body: '<?xml version="1.0"?><propfind xmlns="DAV:"><prop><displayname/></prop></propfind>',
    }, [207]);
  }

  async readRemoteData(): Promise<RemoteSyncData | null> {
    const response = await this.request(CURRENT_DATA_PATH, { method: 'GET' }, [404]);
    if (response.status === 404) return null;
    const parsed: unknown = JSON.parse(await response.text());
    const data = syncDataSchema.parse(parsed);
    return { data, etag: response.headers.get('ETag') };
  }

  async writeRemoteData(data: SyncData, etag: string | null, creating: boolean): Promise<void> {
    await this.ensureDirectories();
    const headers: Record<string, string> = { 'Content-Type': 'application/json; charset=utf-8' };
    if (etag) headers['If-Match'] = etag;
    else if (creating) headers['If-None-Match'] = '*';
    await this.request(CURRENT_DATA_PATH, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data, null, 2),
    }, [201, 204]);
  }

  async createBackup(data: SyncData): Promise<string> {
    await this.ensureDirectories();
    const filename = `backup-${backupTimestamp(new Date())}.json`;
    await this.request(`${BACKUPS_PATH}/${filename}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(data, null, 2),
    }, [201, 204]);
    await this.pruneBackups(20).catch(() => undefined);
    return filename;
  }

  private async listBackupNames(): Promise<string[]> {
    const response = await this.request(BACKUPS_PATH, {
      method: 'PROPFIND',
      headers: { Depth: '1', 'Content-Type': 'application/xml; charset=utf-8' },
      body: '<?xml version="1.0"?><propfind xmlns="DAV:"><prop><getlastmodified/><resourcetype/></prop></propfind>',
    }, [207]);
    const xml = await response.text();
    const hrefs = [...xml.matchAll(/<(?:[A-Za-z0-9_-]+:)?href[^>]*>([^<]+)<\/(?:[A-Za-z0-9_-]+:)?href>/gi)]
      .map((match) => match[1] ?? '')
      .map((href) => {
        try {
          return decodeURIComponent(href.split('/').filter(Boolean).at(-1) ?? '');
        } catch {
          return '';
        }
      })
      .filter((name) => BACKUP_FILENAME_PATTERN.test(name));
    return [...new Set(hrefs)].sort().reverse();
  }

  private async pruneBackups(retain: number): Promise<void> {
    const names = await this.listBackupNames();
    await Promise.all(names.slice(retain).map((name) => this.request(`${BACKUPS_PATH}/${name}`, { method: 'DELETE' }, [204, 404])));
  }
}

export const validateWebDavConfig = (config: WebDavConfig): WebDavConfig => normalizeConfig(config);

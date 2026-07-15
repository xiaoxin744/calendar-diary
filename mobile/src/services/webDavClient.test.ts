import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebDavClient, validateWebDavConfig } from '@/services/webDavClient';

afterEach(() => vi.unstubAllGlobals());

describe('validateWebDavConfig', () => {
  it('规范化服务器和同步目录', () => {
    expect(validateWebDavConfig({
      serverUrl: 'https://dav.example.com/root',
      rootPath: 'CalendarDiary/',
      username: ' user ',
      password: 'secret',
    })).toEqual({
      serverUrl: 'https://dav.example.com/root/',
      rootPath: '/CalendarDiary',
      username: 'user',
      password: 'secret',
    });
  });

  it('拒绝非 HTTP(S) 地址和相对目录', () => {
    expect(() => validateWebDavConfig({ serverUrl: 'ftp://example.com', rootPath: '/Diary', username: '', password: '' })).toThrow();
    expect(() => validateWebDavConfig({ serverUrl: 'https://example.com', rootPath: '/../Diary', username: '', password: '' })).toThrow();
  });

  it('按桌面端目录协议创建目录并读写同步文件', async () => {
    const directories = new Set<string>();
    const files = new Map<string, string>();
    const requests: { method: string; path: string }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === 'string' ? input : input.toString());
      const method = init?.method ?? 'GET';
      requests.push({ method, path: url.pathname });
      if (method === 'PROPFIND') return new Response('', { status: directories.has(url.pathname) ? 207 : 404 });
      if (method === 'MKCOL') {
        directories.add(url.pathname);
        return new Response('', { status: 201 });
      }
      if (method === 'PUT') {
        files.set(url.pathname, String(init?.body ?? ''));
        return new Response('', { status: 201 });
      }
      if (method === 'GET' && files.has(url.pathname)) {
        return new Response(files.get(url.pathname), { status: 200, headers: { ETag: '"v1"' } });
      }
      return new Response('', { status: 404 });
    }));

    const client = new WebDavClient({
      serverUrl: 'https://dav.example.com/dav/',
      rootPath: '/CalendarDiary',
      username: 'user',
      password: 'secret',
    });
    await client.ensureDirectories();
    await client.writeRemoteData({
      version: 1,
      updatedAt: '2026-07-15T00:00:00.000Z',
      data: {},
      monthlyPlans: {},
    }, null, true);
    const remote = await client.readRemoteData();

    expect(remote?.etag).toBe('"v1"');
    expect(remote?.data.version).toBe(1);
    expect(requests).toContainEqual({ method: 'MKCOL', path: '/dav/CalendarDiary' });
    expect(requests).toContainEqual({ method: 'PUT', path: '/dav/CalendarDiary/data/current.json' });
  });
});

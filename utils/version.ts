import packageJson from '../package.json';

export const getAppVersion = async (): Promise<string> => {
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.app?.getVersion) {
      const version = await window.electronAPI.app.getVersion();
      if (version) return version;
    }
  } catch {}

  return packageJson.version;
};

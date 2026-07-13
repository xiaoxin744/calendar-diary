export const getAppVersion = async (): Promise<string> => {
  try {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.app?.getVersion) {
      const v = await (window as any).electronAPI.app.getVersion();
      if (v) return v as string;
    }
  } catch {}

  try {
    const res = await fetch('/package.json');
    if (res.ok) {
      const json = await res.json();
      return (json?.version as string) || '';
    }
  } catch {}

  return '';
};


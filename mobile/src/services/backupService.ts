import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { diaryBackupSchema } from '@/domain/schema';
import type { DiaryBackup, DiarySnapshot } from '@/domain/types';

const backupFromSnapshot = (snapshot: DiarySnapshot): DiaryBackup => ({
  version: 2,
  exportedAt: new Date().toISOString(),
  data: snapshot.days,
  monthlyPlans: snapshot.monthlyPlans,
});

export const backupService = {
  async export(snapshot: DiarySnapshot): Promise<void> {
    const backup = backupFromSnapshot(snapshot);
    const contents = JSON.stringify(backup, null, 2);
    const filename = `calendar-diary-${new Date().toISOString().slice(0, 10)}.json`;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      return;
    }

    const file = new File(Paths.cache, filename);
    file.create({ overwrite: true });
    file.write(contents);
    if (!await Sharing.isAvailableAsync()) throw new Error('当前设备不支持系统分享。');
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: '导出日记备份' });
  },

  async import(): Promise<DiarySnapshot | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return null;
    const asset = result.assets[0];
    if (!asset) throw new Error('没有读取到备份文件。');

    const contents = Platform.OS === 'web' && asset.file
      ? await asset.file.text()
      : await new File(asset.uri).text();
    const parsed: unknown = JSON.parse(contents);
    const backup = diaryBackupSchema.parse(parsed);
    return {
      schemaVersion: 1,
      days: backup.data,
      monthlyPlans: backup.monthlyPlans,
      updatedAt: new Date().toISOString(),
    };
  },
};

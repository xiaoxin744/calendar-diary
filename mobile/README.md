# CalendarDiary Mobile

CalendarDiary 的 Android、iOS 与 Web 客户端，基于 Expo SDK 57、React Native 和 Expo Router。

## 当前能力

- 固定六周月历与快速回到今天
- 多条日记/待办编辑、表情分类和每日心情
- 三项目标式月度计划
- 全文本地搜索
- AsyncStorage 版本化持久化与 Zod 数据校验
- 与桌面端兼容的 JSON 备份导入/导出
- 与桌面端共用协议的 WebDAV 跨设备同步
- 三方逐项冲突合并，同项冲突保留本机和云端两个版本
- 同步前云端备份、最近三份本地快照和自动同步
- iOS/Android 生物识别与设备密码保护
- Android、iOS、Web 统一代码库

## 本地开发

```bash
npm install
npm run typecheck
npm test
npm run start
```

使用 Expo Go 扫描终端二维码，或运行：

```bash
npm run android
npm run ios
npm run web
```

## 构建

```bash
npx eas-cli build --profile preview --platform android
npx eas-cli build --profile production --platform all
```

iOS 正式发布需要 Apple Developer 账号；Android 正式发布需要 Google Play Console 账号。密钥由 EAS 或组织密钥管理服务托管，不提交到 Git。

## WebDAV 数据边界

应用的全部本地功能和最近三份自动安全快照都不需要服务器。WebDAV 是可选高级功能，适合已经拥有坚果云、Nextcloud、群晖等服务的用户。

在「设置 → 可选：WebDAV 跨设备同步」中填写与电脑端相同的服务器地址、目录和账号。默认目录为 `/CalendarDiary`，当前数据保存在 `data/current.json`，自动备份保存在 `backups/`。原生端密码写入系统安全凭据库；Web 端受浏览器跨域策略限制，需要 WebDAV 服务允许 CORS。

应用不接入广告或行为统计，数据边界和系统权限说明见仓库根目录的 [`PRIVACY.md`](../PRIVACY.md)。

## 目录结构

```text
app/                 Expo Router 页面与导航
src/components/      跨页面 UI 组件
src/data/            本地仓储实现
src/domain/          领域模型与运行时校验
src/services/        备份和设备安全能力
src/store/           Zustand 状态仓库
src/theme/           设计令牌
src/utils/           无副作用工具函数
```

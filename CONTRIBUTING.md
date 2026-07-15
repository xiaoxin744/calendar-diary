# 贡献指南

感谢你考虑为日历日记做出贡献！🎉

## 如何贡献

### 报告 Bug

发现 Bug？请通过以下方式报告：

1. 前往 [Issues](https://github.com/xiaoxin744/calendar-diary/issues)
2. 点击 "New Issue"
3. 选择 "Bug Report" 模板
4. 填写必要信息：
   - 清晰的标题
   - 详细的问题描述
   - 复现步骤
   - 预期行为 vs 实际行为
   - 系统信息（操作系统、版本号）
   - 截图或错误日志（如适用）

### 提出新功能

有好的想法？我们很乐意听取！

1. 前往 [Issues](https://github.com/xiaoxin744/calendar-diary/issues)
2. 选择 "Feature Request" 模板
3. 详细描述你的想法：
   - 功能描述
   - 使用场景
   - 可能的实现方式
   - 其他参考

### 提交代码

#### 开发流程

1. **Fork 仓库**
   ```bash
   # 在 GitHub 上点击 Fork 按钮
   ```

2. **克隆你的 Fork**
   ```bash
   git clone https://github.com/你的用户名/calendar-diary.git
   cd calendar-diary
   ```

3. **创建分支**
   ```bash
   # 功能分支
   git checkout -b feature/amazing-feature
   
   # 修复分支
   git checkout -b fix/bug-description
   ```

4. **安装依赖**
   ```bash
   npm install
   ```

5. **开发和测试**
   ```bash
   npm run dev
   ```

6. **提交更改**
   ```bash
   git add .
   git commit -m "feat: 添加了某某功能"
   ```

   提交信息格式：
   - `feat:` 新功能
   - `fix:` Bug 修复
   - `docs:` 文档更新
   - `style:` 代码格式（不影响功能）
   - `refactor:` 代码重构
   - `perf:` 性能优化
   - `test:` 测试相关
   - `chore:` 构建/工具相关

7. **推送到 Fork**
   ```bash
   git push origin feature/amazing-feature
   ```

8. **创建 Pull Request**
   - 前往原仓库页面
   - 点击 "New Pull Request"
   - 选择你的分支
   - 填写 PR 描述：
     - 改动说明
     - 相关 Issue
     - 测试情况
     - 截图（如适用）

#### 代码规范

- **TypeScript**: 使用严格模式，提供完整的类型定义
- **React**: 使用函数组件和 Hooks
- **命名规范**:
  - 组件：PascalCase (`DayEditor.tsx`)
  - 函数/变量：camelCase (`handleSave`)
  - 常量：UPPER_SNAKE_CASE (`WEEK_DAYS`)
  - 文件：kebab-case 或 PascalCase
- **注释**: 为复杂逻辑添加清晰的注释
- **格式化**: 保持代码风格一致

#### 提交前检查

- [ ] 代码可以正常运行
- [ ] 没有 TypeScript 错误
- [ ] 没有 console.log 等调试代码
- [ ] 相关文档已更新
- [ ] 提交信息清晰明确

## 开发指南

### 项目结构

```
calendar-diary/
├── electron/              # Electron 主进程
│   ├── main.ts           # 窗口管理、IPC、更新
│   └── preload.ts        # 安全桥接
├── components/           # React 组件
│   ├── CalendarHeader.tsx
│   ├── DayCell.tsx
│   ├── DayEditor.tsx
│   ├── SettingsModal.tsx
│   ├── AboutModal.tsx
│   └── UpdateNotification.tsx
├── services/             # 业务逻辑
│   └── storageService.ts # 数据存储
├── utils/                # 工具函数
│   ├── dateUtils.ts      # 日期处理
│   └── i18n.ts           # 国际化
├── App.tsx               # 主应用
├── types.ts              # 类型定义
└── vite.config.ts        # 构建配置
```

### 添加新语言

1. 在 `utils/i18n.ts` 中添加翻译：
   ```typescript
   export const translations = {
     // ... 其他语言
     'es': {
       appTitle: "Diario de Calendario",
       // ... 其他翻译
     }
   };
   ```

2. 添加语言名称：
   ```typescript
   export const languageNames = {
     // ... 其他语言
     'es': 'Español'
   };
   ```

### 添加新功能

1. 在 `types.ts` 中定义类型
2. 在 `components/` 创建组件
3. 在 `App.tsx` 中集成
4. 更新文档

### 本地测试

```bash
# 开发模式
npm run dev

# 构建测试
npm run electron:build

# 测试特定平台
npm run electron:build:mac
npm run electron:build:win
npm run electron:build:linux
```

## 社区准则

### 行为准则

- **友善**: 尊重每一位贡献者
- **包容**: 欢迎不同背景和经验的人
- **建设性**: 提供有建设性的反馈
- **专业**: 保持专业和礼貌的态度

### 不被接受的行为

- 人身攻击或侮辱性言论
- 骚扰或歧视
- 发布他人的隐私信息
- 其他不专业的行为

## 许可证

通过贡献，你同意你的代码将按照项目的 [CC-BY-NC-4.0 许可证](LICENSE) 发布。

## 问题？

如果你有任何问题，可以：
- 在 [Issues](https://github.com/xiaoxin744/calendar-diary/issues) 中提问
- 查看现有的 Issues 和 Pull Requests
- 查阅 [README.md](README.md) 文档

---

再次感谢你的贡献！ 🙏

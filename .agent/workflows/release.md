---
description: 執行版本發佈流程，包含測試、版本更迭與異動紀錄更新。
---

這個 workflow 確保在部署到 GitHub Actions 前，完成必要的品質檢查與版號更新。

### 步驟 1：開發完成確認
當一個階段的開發或 Bug 修復完成後，AI 會詢問：「是否準備好進行版本發佈？」

### 步驟 2：執行自動化測試
// turbo
1. 在終端機執行所有 E2E 測試：
   ```bash
   npm test
   ```
2. 確認所有測試項目皆通過。若有失敗，需先修復再繼續。

### 步驟 3：本機手動驗證
1. 啟動開發伺服器：
   ```bash
   npm run dev
   ```
2. 邀請使用者在本機（http://localhost:5173）進行最後的功能確認。

### 步驟 4：版號更新與異動紀錄
1. 詢問使用者本次更新的語義化版本（SemVer: patch, minor, 或 major）以及異動摘要。
2. 同步更新 `package.json` 中的版本：
   ```bash
   npm version <type> --no-git-tag-version
   ```
3. 在 `VERSION.md` (或 `CHANGELOG.md`) 中新增一筆紀錄，註明版號、日期與異動摘要。

### 步驟 5：提交並推送 (Git Push)
1. 將異動提交到 Git：
   ```bash
   git add .
   git commit -m "chore(release): <version> - <summary>"
   ```
2. 推送到 GitHub 以觸發 GitHub Actions 部署：
   ```bash
   git push origin main
   ```

### 步驟 6：完成通知
確認部署流水線已成功啟動，並告知使用者新版本正在發佈中。

---
description: 啟動本機開發伺服器 (Localhost)，解決 Node.js/NPM 路徑 Persistence 問題。
---

這個 workflow 確保在每次啟動對話時，AI 都能直接找到正確的 Node.js 路徑並啟動伺服器，不需重新排查。

### 步驟 1：檢查開發環境路徑
Node.js 20.x 預計安裝於 `~/.nvm/versions/node/v20.20.1/bin`。

### 步驟 2：核心啟動
執行根目錄下的 `run-dev.sh` 腳本：
// turbo
```bash
./run-dev.sh
```

### 步驟 3：驗證啟動
確認出現 Vite 的輸出訊息，並告知使用者伺服器正在 `http://localhost:3000` 運行。

---
**提示**：以後只需對我說「啟動 localhost」，我就會根據此 Workflow 直接執行 `./run-dev.sh`。

# Cloudflare 獨立部署

需要 Node.js 22.13+、已安裝的專案依賴，以及具有 Workers、D1 權限的
Cloudflare 帳號。以下命令都在專案根目錄執行。

獨立模式使用 `cloudflare/wrangler.jsonc`：Worker 為 `line-card-lab`、D1 為
`line-card-lab-db`。圖片在沒有 R2 綁定時存入 D1；一般 Sites 建置仍使用
`.openai/hosting.json` 宣告的綁定；`CODEX_LOCAL_PREVIEW=1` 仍可啟動本機預覽。

先建立或確認 D1 資料庫，在 `d1_databases[0]` 加入實際 `database_id`，再建置和
部署。新資料庫需依序執行 `drizzle/0000` 到 `0005`；現有資料庫先核對遷移記錄。
`migrations_dir` 相對於設定檔目錄，因此使用 `../drizzle`。

```sh
npm ci
npm run build:cloudflare
npm run deploy:cloudflare
```

`npm run build:cloudflare` 會直接以 Node 呼叫 vinext CLI，設定
`CF_STANDALONE=1`，並關閉本機預覽模式。它不安裝依賴。部署必須使用產生的
`dist/server/wrangler.json`，其中已包含 Worker bundle 和 `dist/client` 資產路徑。
`npm run deploy:cloudflare` 先使用來源設定檔套用遠端 D1 遷移；成功後 Wrangler
會透過建置產生的 `.wrangler/deploy/config.json` 選取部署設定檔。遷移失敗時不會部署。

## GitHub 自動發布

`.github/workflows/deploy-cloudflare.yml` 在推送到 `main` 時執行，也可從 GitHub
Actions 手動執行。流程使用 Node.js 22.16.0，依序安裝鎖定版本的依賴、建置、
套用遠端 D1 遷移和部署。正式發布共用同一個 concurrency group，不取消進行中的發布。

在 GitHub 倉庫的 Settings > Secrets and variables > Actions 新增兩個 repository secrets：

- `CLOUDFLARE_API_TOKEN`：部署用的 Cloudflare user token。
- `CLOUDFLARE_ACCOUNT_ID`：Worker 與 D1 所屬帳號的 ID。

目前部署只需要限定目標帳號的 Workers Scripts Edit、D1 Edit 和 Account Settings Read。
此流程直接使用上述 token，不需要 Cloudflare Workers Builds 的 token 或管理權限。
GitHub workflow 本身只授予 `contents: read`，Cloudflare secrets 只注入部署步驟。
請勿將 token 寫入原始碼、Wrangler 設定或日誌。

資料庫遷移和 Worker 部署並非同一個交易；若遷移成功但部署失敗，已套用的遷移
仍然存在。後續遷移應保留與上一版 Worker 的相容性。

設定方式參考 [Cloudflare GitHub Actions 官方說明](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
及 [GitHub Actions secrets 官方說明](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)。

Wrangler 4.92 支援部署時建立缺失的 D1 資源；遠端資料庫遷移仍需要設定檔中
的實際 `database_id`。非互動部署不保證將資源 ID 寫回來源設定檔。

圖片使用 `0005_image_storage` 的中繼資料與分片表。每片原始資料為 256 KiB，
以 base64 儲存後約 350 KiB；一般上傳維持處理後 JPEG 5 MiB 上限，管理員標誌
維持 2 MiB 上限。D1 儲存量約比原圖片增加三分之一，圖片存取會使用 D1 配額。
若之後加入 `UPLOADS` R2 綁定，上傳改用 R2，既有 D1 圖片仍可讀取。
上線這版前，已有 R2 的部署也需套用 `0005`，以支援混合讀取。

首次建立管理員時需設定 `ADMIN_SETUP_TOKEN` Worker secret。此站目前直接提供
圖片，沒有啟用 Cloudflare Images 綁定；如需 `/_vinext/image` 最佳化端點，再依
帳號的 Images 方案新增 `images: { "binding": "IMAGES" }`。

# Cloudflare 獨立部署

需要 Node.js 22.13+、已安裝的專案依賴，以及具有 Workers、D1 權限的
Cloudflare 帳號。以下命令都在專案根目錄執行。

獨立模式使用 `cloudflare/wrangler.jsonc`：Worker 為 `line-card-lab`、D1 為
`line-card-lab-db`。圖片在沒有 R2 綁定時存入 D1；一般 Sites 建置仍使用
`.openai/hosting.json` 宣告的綁定；`CODEX_LOCAL_PREVIEW=1` 仍可啟動本機預覽。

先建立或確認 D1 資料庫，在 `d1_databases[0]` 加入實際 `database_id`，再套用
遷移。新資料庫需依序執行 `drizzle/0000` 到 `0005`；現有資料庫先核對遷移記錄。
`migrations_dir` 相對於設定檔目錄，因此使用 `../drizzle`。

```sh
node node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --remote --config cloudflare/wrangler.jsonc
node scripts/build-cloudflare.mjs
node node_modules/wrangler/bin/wrangler.js deploy --config dist/server/wrangler.json
```

也可用 `npm run build:cloudflare`；此入口會直接以 Node 呼叫 vinext CLI，設定
`CF_STANDALONE=1`，並關閉本機預覽模式。它不安裝依賴。部署必須使用產生的
`dist/server/wrangler.json`，其中已包含 Worker bundle 和 `dist/client` 資產路徑。

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

# Cyber RPG Arena - Next.js src/app 版

這個資料夾已轉成適合 `create-next-app` 並啟用 `src/` 目錄的結構。

## 放進目前專案

把 `src/app` 複製到你的 Next.js 專案根目錄，覆蓋原本的：

```txt
src/app/layout.tsx
src/app/page.tsx
src/app/globals.css
```

## 安裝額外依賴

這份頁面有使用 `lucide-react` 圖示套件：

```bash
npm install lucide-react
```

## 啟動

```bash
npm run dev
```

打開：

```txt
http://localhost:3000
```

## 備註

- 原本 zip 是根目錄 `app/` 結構，這份已改為 `src/app/`。
- 使用 Tailwind CSS v4 寫法：`@import "tailwindcss";`。
- 遊戲進度存在瀏覽器 localStorage，key 是 `cyber-rpg-arena-save`。

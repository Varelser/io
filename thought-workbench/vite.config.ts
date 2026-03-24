import packageJson from "./package.json";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const appVersion = packageJson.version || "0.0.0";
const buildTime = new Date().toISOString();
const DEFERRED_PANEL_PATHS = [
  "/components/panels/BookmarkPanel.tsx",
  "/components/panels/BundlePanel.tsx",
  "/components/panels/ConversionQueuePanel.tsx",
  "/components/panels/EventLogPanel.tsx",
  "/components/panels/IntegrityPanel.tsx",
  "/components/panels/LayoutPresetPanel.tsx",
  "/components/panels/QueryPanel.tsx",
  "/components/panels/ScenarioBranchPanel.tsx",
  "/components/panels/SmartFolderPanel.tsx",
  "/components/panels/SuggestionPanel.tsx",
];

export default defineConfig({
  base: "/4dthinkingos/",
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["icon.svg", "icon-maskable.svg", "favicon.svg", "pwa-screenshot-wide.svg", "pwa-screenshot-narrow.svg"],
      workbox: {
        globPatterns: ["**/*.{js,mjs,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /\.(?:js|mjs|css|html)$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "thought-workbench-static",
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "thought-workbench-images",
              expiration: { maxEntries: 60, maxAgeSeconds: 90 * 24 * 60 * 60 },
            },
          },
        ],
      },
      manifest: {
        name: "Thought Workbench",
        short_name: "tw",
        lang: "ja",
        description: "4D 知識管理 システム — ノード・球体・タイムライン",
        theme_color: "#020202",
        background_color: "#020202",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone", "browser"],
        orientation: "landscape",
        start_url: "/4dthinkingos/",
        scope: "/4dthinkingos/",
        categories: ["productivity", "education", "utilities"],
        shortcuts: [
          {
            name: "Workspace",
            short_name: "Workspace",
            description: "Open the workspace map and recent sphere layout",
            url: "/4dthinkingos/",
            icons: [{ src: "favicon.svg", sizes: "64x64", type: "image/svg+xml" }],
          },
          {
            name: "Load Sample",
            short_name: "Sample",
            description: "Start from bundled sample workspaces",
            url: "/4dthinkingos/",
            icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml" }],
          },
        ],
        screenshots: [
          {
            src: "pwa-screenshot-wide.svg",
            sizes: "1280x720",
            type: "image/svg+xml",
            form_factor: "wide",
            label: "Desktop multi-pane workspace with inspector and analytics",
          },
          {
            src: "pwa-screenshot-narrow.svg",
            sizes: "720x1280",
            type: "image/svg+xml",
            form_factor: "narrow",
            label: "Mobile layout showing workspace, review, and preset flows",
          },
        ],
        icons: [
          { src: "favicon.svg", sizes: "64x64", type: "image/svg+xml", purpose: "any" },
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      devOptions: {
        enabled: false, // dev サーバーでは SW を無効にして開発体験を維持
      },
    }),
  ],
  server: {
    port: 5173,
    open: false,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("pdfjs-dist")) return "vendor-pdf";
            if (id.includes("jszip") || id.includes("mammoth")) return "vendor-docio";
            return "vendor-runtime";
          }
          if (id.includes("/components/views/")) return "app-views";
          if (DEFERRED_PANEL_PATHS.some((path) => id.includes(path))) return "app-panels-deferred";
          if (id.includes("/components/panels/")) return "app-panels";
          if (
            id.includes("/components/workspace/") ||
            id.includes("/components/sphere/") ||
            id.includes("/components/MainViewport.tsx") ||
            id.includes("/components/Minimap.tsx") ||
            id.includes("/components/TimelineScrubber.tsx")
          ) {
            return "app-spatial";
          }
          if (
            id.includes("/hooks/") ||
            id.includes("/graph-ops/") ||
            id.includes("/normalize/") ||
            id.includes("/projection/") ||
            id.includes("/pagerank/") ||
            id.includes("/storage/") ||
            id.includes("/import/") ||
            id.includes("/utils/")
          ) {
            return "app-core";
          }
        },
      },
    },
  },
});

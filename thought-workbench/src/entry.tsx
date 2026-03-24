import React from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import ThoughtWorkbenchClean from "../index";
import "./main.css";

function Root() {
  const [offlineReady, setOfflineReady] = React.useState(false);
  const [needRefresh, setNeedRefresh] = React.useState(false);
  const [updateServiceWorker, setUpdateServiceWorker] = React.useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

  React.useEffect(() => {
    const updateSW = registerSW({
      immediate: true,
      onOfflineReady() {
        setOfflineReady(true);
      },
      onNeedRefresh() {
        // 新SW がアクティブになった時点で旧チャンクが消えるため、
        // 即座にリロードして新コード+新SWで統一する。
        // データは IndexedDB に永続化されているので損失なし。
        updateSW(true);
      },
    });
    setUpdateServiceWorker(() => updateSW);
  }, []);

  const handleRefresh = React.useCallback(() => {
    if (!updateServiceWorker) return;
    void updateServiceWorker(true);
  }, [updateServiceWorker]);

  return (
    <ThoughtWorkbenchClean
      appMeta={{ version: __APP_VERSION__, buildTime: __BUILD_TIME__ }}
      pwaState={{ offlineReady, needRefresh, onRefresh: handleRefresh }}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

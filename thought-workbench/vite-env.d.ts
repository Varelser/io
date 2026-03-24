declare module "*?url" {
  const src: string;
  export default src;
}

declare module "virtual:pwa-register" {
  export function registerSW(options?: {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
  }): (reloadPage?: boolean) => Promise<void>;
}

declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HARDWARE_BRIDGE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

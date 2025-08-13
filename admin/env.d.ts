/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MSG_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string

  // Add your new flags here:
  readonly VITE_FIREBASE_FUNCTIONS_REGION?: string
  readonly VITE_USE_FN_RECURSIVE_DELETE?: string
  readonly VITE_USE_FN_TOGGLE_PUBLISH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

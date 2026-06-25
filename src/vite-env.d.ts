/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Vite injects `import.meta.env` at build time. Declaring an `ImportMetaEnv`
// interface here teaches TypeScript about it so we don't get spurious
// "Property 'env' does not exist on type 'ImportMeta'" errors in our code.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENV?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string;
  /** Plausible domain (e.g. "affixai.com"). Unset = analytics disabled. */
  readonly VITE_PLAUSIBLE_DOMAIN?: string;
  /** Optional override for the Plausible script URL (CNAME proxy). */
  readonly VITE_PLAUSIBLE_SCRIPT_SRC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// `react-signature-canvas` ships without type declarations. Declare a
// minimal default-export class with `any` typing on its instance methods —
// the runtime API is small and we use it in two files (SignaturesPage,
// GuestSignPage). Cheaper than chasing the @types package upstream.
declare module 'react-signature-canvas' {
  import * as React from 'react';
  // The default export is BOTH the component class AND the ref instance
  // type — we use it as `useRef<SignatureCanvas | null>(null)` in calling
  // code. A class declaration satisfies both forms.
  export default class SignatureCanvas extends React.Component<any> {
    clear(): void;
    isEmpty(): boolean;
    toDataURL(type?: string, encoderOptions?: number): string;
    fromDataURL(dataUrl: string, options?: any): void;
    getCanvas(): HTMLCanvasElement;
    getTrimmedCanvas(): HTMLCanvasElement;
    [key: string]: any;
  }
}


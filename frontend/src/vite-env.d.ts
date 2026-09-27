/// <reference types="vite/client" />

// Allow importing CSS files
declare module '*.css' {
  const content: string;
  export default content;
}

// Allow importing SVG files as React components
declare module '*.svg?react' {
  import type { FC, SVGProps } from 'react';
  const ReactComponent: FC<SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}

// Vite env variables type augmentation
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


import { createPortal } from 'react-dom';

/**
 * Renders overlays (modals, drawers) directly under <body>. Page content lives in stacking contexts
 * (route transition, cards), which would otherwise trap an overlay beneath the fixed mobile header
 * and bottom tab bar.
 */
export const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  createPortal(children, document.body);

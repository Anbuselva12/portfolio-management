import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { useAuthStore } from './store/auth.store';

const Root = () => {
  const initialize = useAuthStore((state) => state.initialize);
  
  useEffect(() => {
    initialize();
  }, [initialize]);

  return <App />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);

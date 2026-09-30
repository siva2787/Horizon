import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.tsx';
import './index.css';

// Per-tab session token so a teacher and a student can be signed in in different tabs.
const TOKEN_KEY = 'zone_sid';
const nativeFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (!url.startsWith('/api')) return nativeFetch(input, init);
  const headers = new Headers(init.headers);
  const t = sessionStorage.getItem(TOKEN_KEY);
  if (t) headers.set('x-zone-sid', t);
  const res = await nativeFetch(input, { ...init, headers });
  if (url.startsWith('/api/auth/login') || url.startsWith('/api/auth/register') || url.startsWith('/api/auth/clerk')) {
    const data = await res.clone().json().catch(() => null);
    if (data?.token) sessionStorage.setItem(TOKEN_KEY, data.token);
  }
  if (url.startsWith('/api/auth/logout')) sessionStorage.removeItem(TOKEN_KEY);
  return res;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
      <App />
    </ClerkProvider>
  </StrictMode>,
);
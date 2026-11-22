import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { isSupabaseConfigured } from './lib/supabase';
import './index.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('The app root element is missing.');
}

createRoot(root).render(
  isSupabaseConfigured ? (
    <App />
  ) : (
    <main role="alert" className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900 dark:bg-[#0B0F17] dark:text-slate-100">
      <section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-semibold">Supabase setup is still loading</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          This preview needs <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to connect. Refresh after the preview environment has finished loading its variables.
        </p>
      </section>
    </main>
  ),
);

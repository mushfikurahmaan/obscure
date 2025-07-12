import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { getCurrentWindow } from "@tauri-apps/api/window";
import { loadData } from '../lib/utils';

interface LoginProps {
  onLogin?: () => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const theme = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    if (theme !== 'system') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const applySystemTheme = () => {
        if (mql.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };
      applySystemTheme();
      mql.addEventListener('change', applySystemTheme);
      return () => mql.removeEventListener('change', applySystemTheme);
    }
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError('');
    try {
      await loadData(password);
      sessionStorage.setItem('masterPassword', password);
      setVerifying(false);
      if (onLogin) onLogin();
      else navigate('/');
    } catch {
      setVerifying(false);
      setError('Incorrect password.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background transition-colors text-[hsl(var(--foreground))]" style={{ WebkitAppRegion: 'drag', backgroundColor: 'hsl(var(--background))' }}>
      {/* Window Controls */}
      <div className="absolute top-0 right-0 flex items-center gap-1 z-10" style={{ WebkitAppRegion: 'no-drag', height: '2.5rem' }}>
        <button
          className="w-10 h-10 px-0 flex items-center justify-center hover:bg-windowlight dark:hover:bg-windowgray transition-colors select-none"
          title="Minimize"
          onClick={async () => { const window = getCurrentWindow(); await window.minimize(); }}
        >
          <svg width="12" height="2" viewBox="0 0 12 2" fill="none" style={{ display: 'block', margin: 'auto' }}><rect width="12" height="2" rx="1" fill="currentColor" /></svg>
        </button>
        <button
          className="w-10 h-10 px-0 flex items-center justify-center hover:bg-windowlight dark:hover:bg-windowgray transition-colors select-none"
          title="Maximize"
          onClick={async () => { const window = getCurrentWindow(); await window.toggleMaximize(); }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ display: 'block', margin: 'auto' }}><rect x="1" y="1" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
        </button>
        <button
          className="w-10 h-10 px-0 flex items-center justify-center hover:bg-windowred hover:text-white transition-colors select-none"
          title="Close"
          onClick={async () => { const window = getCurrentWindow(); await window.close(); }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ display: 'block', margin: 'auto' }}><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" /><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.5" /></svg>
        </button>
      </div>
      <form
        onSubmit={handleLogin}
        className="flex flex-col items-center w-full max-w-xs gap-2"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <h1 className="text-xl font-bold mb-1 text-center">Unlock Obscure</h1>
        <input
          type="password"
          className="w-full border rounded px-2 py-1 mb-1 text-sm bg-[hsl(var(--backgroud))]"
          placeholder="Enter master password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        {error && <div className="text-red-500 text-xs mb-1 w-full">{error}</div>}
        <Button type="submit" className="w-full h-8 text-sm bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90" disabled={verifying}>
          {verifying ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4 mr-1 text-blue-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Verifying…
            </span>
          ) : (
            'Unlock'
          )}
        </Button>
      </form>
    </div>
  );
};

export default Login; 
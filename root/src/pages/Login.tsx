import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { getCurrentWindow } from "@tauri-apps/api/window";
import { loadData } from '../lib/utils';
import { Eye, EyeOff } from 'lucide-react';
import notesImg from '../assets/notes.png';

interface LoginProps {
  onLogin?: () => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let unlistenResize: (() => void) | undefined;
    let unlistenMax: (() => void) | undefined;
    let unlistenUnmax: (() => void) | undefined;
    const setup = async () => {
      const win = getCurrentWindow();
      setIsMaximized(await win.isMaximized());
      unlistenResize = await win.listen('tauri://resize', async () => {
        setIsMaximized(await win.isMaximized());
      });
      unlistenMax = await win.listen('tauri://maximize', () => setIsMaximized(true));
      unlistenUnmax = await win.listen('tauri://unmaximize', () => setIsMaximized(false));
    };
    setup();
    return () => {
      if (unlistenResize) unlistenResize();
      if (unlistenMax) unlistenMax();
      if (unlistenUnmax) unlistenUnmax();
    };
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
    <div className="h-screen min-h-0 flex flex-row bg-white dark:bg-[#18181b] transition-colors relative" style={{ WebkitAppRegion: 'drag' }}>
      {/* Window Controls */}
      <div className="absolute top-0 right-0 flex items-center gap-1 z-20 p-2" style={{ WebkitAppRegion: 'no-drag', height: '2.5rem' }}>
        <button
          className="w-10 h-10 px-0 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-windowgray transition-colors select-none"
          title="Minimize"
          onClick={async () => { const window = getCurrentWindow(); await window.minimize(); }}
        >
          <span style={{ fontFamily: 'Segoe MDL2 Assets', fontSize: 11 }}>&#xE921;</span>
        </button>
        {isMaximized ? (
          <button
            className="w-10 h-10 px-0 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-windowgray transition-colors select-none"
            title="Restore"
            onClick={async () => { const window = getCurrentWindow(); await window.toggleMaximize(); }}
          >
            <span style={{ fontFamily: 'Segoe MDL2 Assets', fontSize: 11 }}>&#xE923;</span>
          </button>
        ) : (
          <button
            className="w-10 h-10 px-0 flex items-center justify-center hover:bg-windowlight dark:hover:bg-windowgray transition-colors select-none"
            title="Maximize"
            onClick={async () => { const window = getCurrentWindow(); await window.toggleMaximize(); }}
          >
            <span style={{ fontFamily: 'Segoe MDL2 Assets', fontSize: 11 }}>&#xE922;</span>
          </button>
        )}
        <button
          className="w-10 h-10 px-0 flex items-center justify-center hover:bg-windowred hover:text-white transition-colors select-none"
          title="Close"
          onClick={async () => { const window = getCurrentWindow(); await window.close(); }}
        >
          <span style={{ fontFamily: 'Segoe MDL2 Assets', fontSize: 11 }}>&#xE8BB;</span>
        </button>
      </div>
      {/* Right: Login Card */}
      <div className="flex-1 h-full flex items-center justify-center p-6 bg-white dark:bg-background" style={{ WebkitAppRegion: 'drag' }}>
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-2xl p-8 flex flex-col gap-6 bg-white dark:bg-background"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl font-bold tracking-tight">Obscure</span>
            <span className="text-sm text-muted-foreground">Sign in to your account</span>
          </div>
          {/* Password input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium">Master Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="w-full border rounded-lg px-3 py-2 text-base pr-10 focus:ring-2 focus:ring-primary focus:border-primary transition bg-[hsl(var(--background))]"
                placeholder="Enter your master password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                autoComplete="current-password"
                disabled={verifying}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                onClick={() => setShowPassword(v => !v)}
                disabled={verifying}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          {error && <div className="text-red-500 text-xs text-center -mt-4">{error}</div>}
          {verifying ? (
            <button
              type="button"
              className="w-full h-10 flex items-center justify-center text-base font-semibold rounded-lg bg-indigo-500 text-white cursor-not-allowed"
              disabled
            >
              <svg className="mr-3 w-5 h-5 animate-spin" viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="white"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray="60"
                  strokeDashoffset="20"
                />
              </svg>
              Verifying…
            </button>
          ) : (
            <Button
              type="submit"
              className="w-full h-10 text-base font-semibold rounded-lg bg-foreground text-background hover:bg-primary/90 transition"
              disabled={verifying}
            >
              Sign In
            </Button>
          )}
          <div className="flex flex-col items-center gap-2 mt-2">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:underline focus:outline-none"
              tabIndex={-1}
              onClick={() => alert('Forgot password flow coming soon!')}
            >
              Forgot password?
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 
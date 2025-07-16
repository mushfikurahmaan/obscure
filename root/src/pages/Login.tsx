import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { getCurrentWindow } from "@tauri-apps/api/window";
import { loadData, saveData } from '../lib/utils';
import CustomPasswordInput from '../components/CustomPasswordInput';
// Remove MatrixText import if not used elsewhere
// import MatrixText from '../components/MatrixText';

interface LoginProps {
  onLogin?: () => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showRecoveryPopup, setShowRecoveryPopup] = useState(false);
  const [recoveryCodeInput, setRecoveryCodeInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [resetCount, setResetCount] = useState(0);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showResetSuccessPopup, setShowResetSuccessPopup] = useState(false);

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

  useEffect(() => {
    const count = parseInt(localStorage.getItem('recoveryCodeUses') || '0', 10);
    setResetCount(count);
  }, [showRecoveryPopup]);

  const hashRecoveryCode = async (code: string) => {
    const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleRecoveryReset = async () => {
    setRecoveryError('');
    if (!recoveryCodeInput || !newPassword || !confirmPassword) {
      setRecoveryError('All fields are required.');
      return;
    }
    if (newPassword.length < 8) {
      setRecoveryError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setRecoveryError('Passwords do not match.');
      return;
    }
    setRecoveryLoading(true);
    try {
      const hash = await hashRecoveryCode(recoveryCodeInput);
      const storedHash = localStorage.getItem('recoveryCodeHash');
      let uses = parseInt(localStorage.getItem('recoveryCodeUses') || '0', 10);
      if (!storedHash || uses >= 3) {
        setRecoveryError('Recovery code is invalid or has been used too many times.');
        setRecoveryLoading(false);
        return;
      }
      if (hash !== storedHash) {
        setRecoveryError('Recovery code is incorrect.');
        setRecoveryLoading(false);
        return;
      }
      // Overwrite vault with new password
      await window.localStorage.clear(); // Clear all localStorage (including code hash/counter)
      localStorage.setItem('recoveryCodeHash', storedHash);
      localStorage.setItem('recoveryCodeUses', (uses + 1).toString());
      setResetCount(uses + 1);
      // Save empty vault with new password
      await saveData(newPassword, JSON.stringify({ notes: [] }));
      setResetSuccess(true);
      setShowResetSuccessPopup(true);
      setRecoveryLoading(false);
    } catch (e) {
      setRecoveryError('Failed to reset password.');
      setRecoveryLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError('');
    setTimeout(async () => {
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
    }, 2000); // 2 second delay
  };

  const resetsLeft = 3 - resetCount;

  return (
    <div className="h-screen min-h-0 flex flex-row bg-background transition-colors relative" style={{ WebkitAppRegion: 'drag' }}>
      {/* Window Controls */}
      <div className="absolute top-0 right-0 flex items-center gap-1 z-20 p-2" style={{ WebkitAppRegion: 'no-drag', height: '2.5rem' }}>
        <button
          className="w-10 h-10 px-0 flex items-center justify-center hover:bg-windowlight dark:hover:bg-windowgray transition-colors select-none"
          title="Minimize"
          onClick={async () => { const window = getCurrentWindow(); await window.minimize(); }}
        >
          <span style={{ fontFamily: 'Segoe MDL2 Assets', fontSize: 11 }}>&#xE921;</span>
        </button>
        {isMaximized ? (
          <button
            className="w-10 h-10 px-0 flex items-center justify-center hover:bg-windowlight dark:hover:bg-windowgray transition-colors select-none"
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
      <div className="flex-1 h-full flex items-center justify-center p-6 bg-background" style={{ WebkitAppRegion: 'drag' }}>
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-2xl p-8 flex flex-col gap-6 bg-background"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl font-bold tracking-tight">Obscure</span>
            <span className="text-sm text-muted-foreground">Sign in to your account</span>
          </div>
          {/* Password input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium">Master Password</label>
            <CustomPasswordInput
              value={password}
              onChange={setPassword}
              placeholder="Enter your master password"
              disabled={verifying}
              autoFocus
            />
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
              disabled={verifying || password.length === 0}
            >
              Sign In
            </Button>
          )}
          <div className="flex flex-col items-center gap-2 mt-2">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:underline focus:outline-none"
              tabIndex={-1}
              onClick={() => setShowRecoveryPopup(true)}
            >
              Forgot password?
            </button>
          </div>
        </form>
      </div>
      {/* Recovery popup modal */}
      {showRecoveryPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl p-5 w-full max-w-sm flex flex-col items-center border border-[hsl(var(--border))] relative text-card-foreground bg-background">
            <div className="text-2xl font-bold mb-1 text-center">Reset Password</div>
            <div className="text-sm text-muted-foreground mb-2 text-center">
              Enter your recovery code and set a new password.<br />
              <span className="font-semibold">Resets left: {3 - resetCount}</span>
            </div>
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-2 text-center">
              <b>Warning:</b> Resetting your password will <u>wipe all your notes</u>. Only use this if you have lost your password and accept losing all your data.
            </div>
            {resetsLeft === 0 && (
              <div className="text-xs text-red-700 bg-red-100 border border-red-300 rounded p-2 mb-2 text-center font-semibold">
                Your recovery code has expired. Password reset is no longer possible.
              </div>
            )}
            <div className="w-full flex flex-col gap-1 mb-1">
              <label className="text-xs font-semibold mb-0.5 text-green-500">Recovery Code</label>
              <input
                type="text"
                value={recoveryCodeInput}
                onChange={e => setRecoveryCodeInput(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-200 font-mono tracking-widest"
                autoFocus
                disabled={resetsLeft === 0}
              />
              <label className="text-xs font-semibold mt-1 mb-0.5">New Password</label>
              <CustomPasswordInput
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Enter new password"
                disabled={recoveryLoading || resetsLeft === 0}
              />
              <label className="text-xs font-semibold mt-1 mb-0.5">Confirm Password</label>
              <CustomPasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Retype new password"
                disabled={recoveryLoading || resetsLeft === 0}
              />
            </div>
            {recoveryError && <div className="text-red-500 text-xs mb-1 text-center">{recoveryError}</div>}
            {resetSuccess ? (
              <div className="text-green-600 text-center font-semibold mb-1">Password reset successful! Please log in.</div>
            ) : null}
            <div className="flex flex-col w-full gap-1 mt-2">
              <button
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow border border-[hsl(var(--border))] bg-background text-foreground hover:bg-muted transition disabled:opacity-60 cursor-pointer"
                onClick={() => { setShowRecoveryPopup(false); setRecoveryCodeInput(''); setNewPassword(''); setConfirmPassword(''); setRecoveryError(''); setResetSuccess(false); }}
                disabled={recoveryLoading}
              >
                Cancel
              </button>
              <button
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-primary/90 transition disabled:opacity-60 ${recoveryLoading ? 'bg-indigo-500 text-white' : 'bg-black text-white'}`}
                onClick={handleRecoveryReset}
                disabled={recoveryLoading || resetsLeft === 0}
              >
                {recoveryLoading ? (
                  <span className="flex items-center gap-2">
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
                    Resetting…
                  </span>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Password reset success popup */}
      {showResetSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl p-8 w-full max-w-xs flex flex-col items-center border border-[hsl(var(--border))] relative text-card-foreground bg-background">
            <div className="text-2xl font-bold mb-2 text-center">Password Reset Successful!</div>
            <div className="text-sm text-muted-foreground mb-4 text-center">Please log in with your new password.</div>
            <button
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow bg-indigo-500 text-white hover:bg-indigo-800 transition mt-2"
              onClick={() => {
                setShowResetSuccessPopup(false);
                setShowRecoveryPopup(false);
                setRecoveryCodeInput('');
                setNewPassword('');
                setConfirmPassword('');
                setRecoveryError('');
                setResetSuccess(false);
              }}
            >
              Go to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login; 
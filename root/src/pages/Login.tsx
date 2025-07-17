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
  const [showInactivityLockMsg, setShowInactivityLockMsg] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(() => parseInt(localStorage.getItem('loginFailedAttempts') || '0', 10));
  const [lockoutExpiry, setLockoutExpiry] = useState(() => parseInt(localStorage.getItem('loginLockoutExpiry') || '0', 10));
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [showFirstLoginMsg, setShowFirstLoginMsg] = useState(false);

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

  useEffect(() => {
    if (localStorage.getItem('lockedByInactivity')) {
      setShowInactivityLockMsg(true);
      localStorage.removeItem('lockedByInactivity');
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem('showFirstLoginMessage')) {
      setShowFirstLoginMsg(true);
      localStorage.removeItem('showFirstLoginMessage');
    }
  }, []);

  // Lockout timer effect
  useEffect(() => {
    if (lockoutExpiry > Date.now()) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((lockoutExpiry - Date.now()) / 1000));
        setLockoutRemaining(remaining);
        if (remaining <= 0) {
          setFailedAttempts(0);
          localStorage.setItem('loginFailedAttempts', '0');
          setLockoutExpiry(0);
          localStorage.setItem('loginLockoutExpiry', '0');
          clearInterval(interval);
        }
      }, 250);
      return () => clearInterval(interval);
    } else {
      setLockoutRemaining(0);
    }
  }, [lockoutExpiry]);

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
    if (lockoutExpiry > Date.now()) return;
    setVerifying(true);
    setError('');
    setTimeout(async () => {
      try {
        await loadData(password);
        sessionStorage.setItem('masterPassword', password);
        setVerifying(false);
        setFailedAttempts(0);
        localStorage.setItem('loginFailedAttempts', '0');
        setLockoutExpiry(0);
        localStorage.setItem('loginLockoutExpiry', '0');
        if (onLogin) onLogin();
        else navigate('/');
      } catch {
        setVerifying(false);
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        localStorage.setItem('loginFailedAttempts', newAttempts.toString());
        if (newAttempts >= 5) {
          const expiry = Date.now() + 30000;
          setLockoutExpiry(expiry);
          localStorage.setItem('loginLockoutExpiry', expiry.toString());
          setLockoutRemaining(30);
        }
        setError('Incorrect password.');
      }
    }, 2000);
  };

  const resetsLeft = 3 - resetCount;

  // Add password validation helper
  const validatePassword = (pw: string) => {
    if (pw.length < 8) return 'Password must be at least 8 characters.';
    if (!/[a-z]/.test(pw)) return 'Password must include a lowercase letter.';
    if (!/[A-Z]/.test(pw)) return 'Password must include an uppercase letter.';
    if (!/[0-9]/.test(pw)) return 'Password must include a number.';
    if (!/[^a-zA-Z0-9]/.test(pw)) return 'Password must include a special character.';
    return '';
  };
  const passwordValidation = validatePassword(newPassword);
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  return (
    <div className="h-screen min-h-0 flex flex-row bg-background transition-colors relative" style={{ WebkitAppRegion: 'drag' }}>
      {/* Window Controls */}
      <div className="absolute top-0 right-0 flex items-center gap-1 z-20 p-2" style={{ WebkitAppRegion: 'no-drag', height: '2.5rem' }}>
        <button
          className="w-10 h-10 px-0 flex items-center justify-center transition-colors select-none window-control-btn"
          title="Minimize"
          onClick={async () => { const window = getCurrentWindow(); await window.minimize(); }}
        >
          <span style={{ fontFamily: 'Segoe MDL2 Assets', fontSize: 11 }}>&#xE921;</span>
        </button>
        {isMaximized ? (
          <button
            className="w-10 h-10 px-0 flex items-center justify-center transition-colors select-none window-control-btn"
            title="Restore"
            onClick={async () => { const window = getCurrentWindow(); await window.toggleMaximize(); }}
          >
            <span style={{ fontFamily: 'Segoe MDL2 Assets', fontSize: 11 }}>&#xE923;</span>
          </button>
        ) : (
          <button
            className="w-10 h-10 px-0 flex items-center justify-center transition-colors select-none window-control-btn"
            title="Maximize"
            onClick={async () => { const window = getCurrentWindow(); await window.toggleMaximize(); }}
          >
            <span style={{ fontFamily: 'Segoe MDL2 Assets', fontSize: 10}}>&#xE922;</span>
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
          {showFirstLoginMsg && (
            <div className="w-full mb-2 px-4 py-2 rounded-lg bg-yellow-100 text-yellow-800 text-center text-sm font-medium">
              To ensure accuracy and enhance security, please enter your password twice.
            </div>
          )}
          {showInactivityLockMsg && (
            <div className="w-full mb-2 px-4 py-2 rounded-lg bg-yellow-100 text-yellow-800 text-center text-sm font-medium">
              Your app has been locked due to inactivity.
            </div>
          )}
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
              disabled={verifying || (lockoutExpiry > Date.now())}
              autoFocus
            />
            {lockoutExpiry > Date.now() && (
              <div className="text-xs text-red-500 text-center mt-1">
                Too many failed attempts. Please wait {lockoutRemaining} second{lockoutRemaining !== 1 ? 's' : ''} before trying again.
              </div>
            )}
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
              disabled={verifying || password.length === 0 || (lockoutExpiry > Date.now())}
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
            {resetsLeft > 0 && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-2 text-center">
                <b>Warning:</b> Resetting your password will <u>wipe all your notes</u>. Only use this if you have lost your password and accept losing all your data.
              </div>
            )}
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
              {/* Real-time feedback */}
              {newPassword && passwordValidation && (
                <div className="text-red-500 text-xs mb-1">{passwordValidation}</div>
              )}
              {newPassword && !passwordValidation && confirmPassword && !passwordsMatch && (
                <div className="text-red-500 text-xs mb-1">Passwords do not match.</div>
              )}
            </div>
            {recoveryError && <div className="text-red-500 text-xs mb-1 text-center">{recoveryError}</div>}
            {resetSuccess ? (
              <div className="text-green-600 text-center font-semibold mb-1">Password reset successful! Please log in.</div>
            ) : null}
            <div className="flex flex-col w-full gap-1 mt-2">
              <button
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow transition disabled:opacity-60 cursor-pointer ` +
                  (recoveryLoading
                    ? 'bg-indigo-500 text-foreground hover:bg-indigo-800'
                    : 'bg-foreground text-background hover:bg-primary/90')}
                onClick={async () => {
                  setRecoveryLoading(true);
                  await new Promise(res => setTimeout(res, 2000));
                  await handleRecoveryReset();
                  setRecoveryLoading(false);
                }}
                disabled={recoveryLoading || resetsLeft === 0}
              >
                {recoveryLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="mr-3 w-5 h-5 animate-spin text-foreground" viewBox="0 0 24 24">
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
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
              <button className="mt-2 text-xs text-muted-foreground hover:underline cursor-pointer" onClick={() => { setShowRecoveryPopup(false); setRecoveryCodeInput(''); setNewPassword(''); setConfirmPassword(''); setRecoveryError(''); setResetSuccess(false); }}
                disabled={recoveryLoading}>Cancel</button>
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
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { getCurrentWindow } from "@tauri-apps/api/window";
import { X } from 'lucide-react';
import { saveData, importData, loadData } from '../lib/utils';
import notesImg from '../assets/onboarding_screen.jpg';

interface FirstSetupProps {
  onSetupComplete?: () => void;
}

const FirstSetup = ({ onSetupComplete }: FirstSetupProps) => {
  const navigate = useNavigate();
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showImportAuto, setShowImportAuto] = useState(false);
  const [showImportManual, setShowImportManual] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
  // Remove passwordError state, use only live validation
  const [importPassword, setImportPassword] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState('');
  // Remove showMainOptions state and use only showCreatePassword for the dialog
  const [showImportManualDialog, setShowImportManualDialog] = useState(false);
  const [manualImportFile, setManualImportFile] = useState<File | null>(null);
  const [manualImportPassword, setManualImportPassword] = useState('');
  const [manualImportError, setManualImportError] = useState('');
  const [manualImportLoading, setManualImportLoading] = useState(false);
  // Add state for import and create success popups and countdown
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [showCreateSuccess, setShowCreateSuccess] = useState(false);
  const [successCountdown, setSuccessCountdown] = useState(3);

  // Password validation helpers
  const validatePassword = (pw: string) => {
    if (pw.length < 8) return 'Password must be at least 8 characters.';
    if (!/[a-z]/.test(pw)) return 'Password must include a lowercase letter.';
    if (!/[A-Z]/.test(pw)) return 'Password must include an uppercase letter.';
    if (!/[0-9]/.test(pw)) return 'Password must include a number.';
    if (!/[^a-zA-Z0-9]/.test(pw)) return 'Password must include a special character.';
    return '';
  };

  const passwordValidation = validatePassword(masterPassword);
  const passwordsMatch = masterPassword === retypePassword && masterPassword.length > 0;

  // Handlers for each flow
  const handleCreatePassword = async () => {
    if (passwordValidation) return;
    if (!passwordsMatch) return;
    try {
      await saveData(masterPassword, JSON.stringify({ notes: [] }));
      setShowCreatePassword(false);
      setMasterPassword('');
      setRetypePassword('');
      setShowCreateSuccess(true);
      setSuccessCountdown(3);
    } catch (e) {
      // Optionally show error
      alert('Failed to initialize secure storage.');
    }
  };

  const handleImportAuto = () => {
    // Simulate scan: check if localStorage has 'userData'
    if (localStorage.getItem('userData')) {
      setShowImportAuto(false);
      setImportPassword('');
      if (onSetupComplete) onSetupComplete();
      else navigate('/login');
    } else {
      setShowImportAuto(false);
      setShowImportManual(true);
    }
  };

  const handleImportManual = async () => {
    if (!manualImportFile || !manualImportPassword) {
      setManualImportError('Please select a file and enter your password.');
      return;
    }
    setManualImportError('');
    setManualImportLoading(true);
    try {
      // Read file as text
      const fileContent = await manualImportFile.text();
      await importData(fileContent);
      // Try to decrypt with password
      await loadData(manualImportPassword);
      setShowImportManualDialog(false);
      setManualImportFile(null);
      setManualImportPassword('');
      setManualImportLoading(false);
      setShowImportSuccess(true);
      setSuccessCountdown(3);
    } catch (e) {
      setManualImportLoading(false);
      setManualImportError('Failed to decrypt file. Check your password or file.');
    }
  };

  useEffect(() => {
    // Force light mode for first setup
    document.documentElement.classList.remove('dark');
    document.body.style.background = '#fff';
    document.body.style.color = '#111';
    return () => {
      document.body.style.background = '';
      document.body.style.color = '';
    };
  }, []);

  // Countdown effect for success popups
  useEffect(() => {
    if (!showImportSuccess && !showCreateSuccess) return;
    if (successCountdown === 0) {
      setShowImportSuccess(false);
      setShowCreateSuccess(false);
      window.location.href = '/login';
      return;
    }
    const timer = setTimeout(() => setSuccessCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [showImportSuccess, showCreateSuccess, successCountdown]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-black" style={{ WebkitAppRegion: 'drag' }}>
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
      <div className="flex flex-col md:flex-row items-center w-full max-w-6xl gap-4 md:gap-8 p-4" style={{ WebkitAppRegion: 'no-drag' }}>
        {/* Image section */}
        <div className="flex justify-start items-center w-full md:w-auto md:flex-1 md:pl-4 mb-6 md:mb-0">
          <img src={notesImg} alt="Welcome" className="w-48 h-48 md:w-[520px] md:h-[520px] max-w-full max-h-[40vh] md:max-w-[54vw] md:max-h-[80vh] object-contain rounded-2xl" />
        </div>
        {/* Main content section */}
        <div className="flex flex-col items-center justify-between flex-1 w-full max-w-xs h-auto md:h-[520px]">
          <div className="flex flex-col w-full items-center gap-2 mt-0 mb-16">
            <h1 className="text-2xl font-bold text-center">Obscure</h1>
            <p className="text-base text-center text-muted-foreground">A secure, modern note-taking app for privacy-focused users.</p>
          </div>
          <div className="flex flex-col w-full gap-2 mt-auto mb-0">
            <Button className="w-full h-10 text-lg bg-black text-white hover:bg-neutral-800" onClick={() => setShowCreatePassword(true)}>
              Get Started from Scratch
            </Button>
            <Button className="w-full h-10 text-lg bg-black text-white hover:bg-neutral-800" onClick={() => setShowImportManualDialog(true)}>
              Import Existing Account
            </Button>
          </div>
          {/* Import Existing Account Dialog */}
          {showCreatePassword && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-xs flex flex-col items-center border border-[hsl(var(--border))] relative">
                <div className="text-xl font-bold mb-2 text-center">Create Master Password</div>
                <div className="text-sm text-muted-foreground mb-4 text-center">Set a strong password to secure your account. You will need this password to unlock the app.</div>
                <input
                  type="password"
                  className="w-full border rounded-lg px-3 py-2 text-base mb-2 bg-[hsl(var(--background))]"
                  placeholder="Enter master password"
                  value={masterPassword}
                  onChange={e => setMasterPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <input
                  type="password"
                  className="w-full border rounded-lg px-3 py-2 text-base mb-2 bg-[hsl(var(--background))]"
                  placeholder="Retype master password"
                  value={retypePassword}
                  onChange={e => setRetypePassword(e.target.value)}
                  autoComplete="new-password"
                />
                {/* Real-time feedback */}
                {masterPassword && passwordValidation && (
                  <div className="text-red-500 text-xs mb-1">{passwordValidation}</div>
                )}
                {masterPassword && !passwordValidation && retypePassword && !passwordsMatch && (
                  <div className="text-red-500 text-xs mb-1">Passwords do not match.</div>
                )}
                <div className="flex flex-col w-full gap-2 mt-4">
                  <button
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow border border-[hsl(var(--border))] bg-background text-foreground hover:bg-muted transition disabled:opacity-60"
                    onClick={() => { setShowCreatePassword(false); setMasterPassword(''); setRetypePassword(''); }}
                  >
                    Cancel
                  </button>
                  <button
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-primary/90 transition disabled:opacity-60 ${showCreateSuccess ? 'bg-indigo-500 text-white' : 'bg-black text-white'}`}
                    onClick={handleCreatePassword}
                    disabled={!!passwordValidation || !passwordsMatch || showCreateSuccess}
                  >
                    {showCreateSuccess ? (
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
                        Creating…
                      </span>
                    ) : (
                      'Set Password'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          {showImportManualDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-xs flex flex-col items-center border border-[hsl(var(--border))] relative">
                <div className="text-xl font-bold mb-2 text-center">Import Manually</div>
                <div className="text-sm text-muted-foreground mb-4 text-center">Select your encrypted data file and enter your master password to decrypt.</div>
                <input
                  type="file"
                  className="w-full border rounded-lg px-3 py-2 text-base mb-2"
                  onChange={e => setManualImportFile(e.target.files?.[0] || null)}
                />
                <input
                  type="password"
                  className="w-full border rounded-lg px-3 py-2 text-base mb-2 bg-[hsl(var(--background))]"
                  placeholder="Enter master password"
                  value={manualImportPassword}
                  onChange={e => setManualImportPassword(e.target.value)}
                />
                {manualImportError && <div className="text-red-500 text-xs mb-1">{manualImportError}</div>}
                <div className="flex flex-col w-full gap-2 mt-4">
                  <button
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow border border-[hsl(var(--border))] bg-background text-foreground hover:bg-muted transition disabled:opacity-60"
                    onClick={() => {
                      setShowImportManualDialog(false);
                      setManualImportFile(null);
                      setManualImportPassword('');
                      setManualImportError('');
                      setManualImportLoading(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-primary/90 transition disabled:opacity-60 ${manualImportLoading ? 'bg-indigo-500 text-white' : 'bg-black text-white'}`}
                    onClick={handleImportManual}
                    disabled={!manualImportFile || !manualImportPassword || manualImportLoading}
                  >
                    {manualImportLoading ? (
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
                        Importing…
                      </span>
                    ) : (
                      'Import and Unlock'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Import Success Popup */}
          {showImportSuccess && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-xs flex flex-col items-center border border-[hsl(var(--border))] relative">
                <div className="text-2xl font-bold mb-2 text-center">Import Successful!</div>
                <div className="text-sm text-muted-foreground mb-4 text-center">Redirecting to login…</div>
                <div className="text-base font-semibold text-center mb-2">{successCountdown}</div>
              </div>
            </div>
          )}
          {/* Create Success Popup */}
          {showCreateSuccess && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-xs flex flex-col items-center border border-[hsl(var(--border))] relative">
                <div className="text-2xl font-bold mb-2 text-center">Account Created!</div>
                <div className="text-sm text-muted-foreground mb-4 text-center">Redirecting to login…</div>
                <div className="text-base font-semibold text-center mb-2">{successCountdown}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FirstSetup; 
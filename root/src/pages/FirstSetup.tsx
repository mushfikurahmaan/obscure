import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '../components/ui/alert-dialog';
import { getCurrentWindow } from "@tauri-apps/api/window";
import { X } from 'lucide-react';
import { saveData, importData, loadData } from '../lib/utils';

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
      if (onSetupComplete) onSetupComplete();
      else navigate('/login');
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
    try {
      // Read file as text
      const fileContent = await manualImportFile.text();
      await importData(fileContent);
      // Try to decrypt with password
      await loadData(manualImportPassword);
      setShowImportManualDialog(false);
      setManualImportFile(null);
      setManualImportPassword('');
      if (onSetupComplete) onSetupComplete();
      else navigate('/');
    } catch (e) {
      setManualImportError('Failed to decrypt file. Check your password or file.');
    }
  };

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] text-[hsl(var(--foreground))]" style={{ WebkitAppRegion: 'drag' }}>
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
      <div className="flex flex-col items-center w-full max-w-xs gap-4" style={{ WebkitAppRegion: 'no-drag' }}>
        <h1 className="text-xl font-bold mb-2 text-center">Welcome to Obscure</h1>
        <Button className="w-full h-10 text-base bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200" onClick={() => setShowCreatePassword(true)}>
          Get Started from Scratch
        </Button>
        <Button className="w-full h-10 text-base bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200" onClick={() => setShowImportAuto(true)}>
          Import Existing Account
        </Button>
        {/* Import Existing Account Dialog */}
        <AlertDialog open={showImportAuto} onOpenChange={setShowImportAuto}>
          <AlertDialogContent className="max-w-xs p-4">
            <AlertDialogDescription className="sr-only">Import your encrypted data file and enter your master password to unlock your account.</AlertDialogDescription>
            <div className="flex justify-between items-center mb-2">
              <AlertDialogTitle className="text-base">Import Existing Account</AlertDialogTitle>
              <button
                className="p-1 rounded hover:bg-muted"
                style={{ WebkitAppRegion: 'no-drag' }}
                onClick={() => setShowImportAuto(false)}
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mb-2 text-xs text-left">
              Enter your master password to scan for existing data, or import manually from a file.
            </div>
            <input
              type="password"
              className="w-full border rounded px-2 py-1 mb-2 text-sm bg-[hsl(var(--backgroud))]"
              placeholder="Enter master password"
              value={importPassword}
              onChange={e => setImportPassword(e.target.value)}
            />
            <Button variant="outline" className="w-full h-8 text-sm mb-3 bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 border-none" onClick={() => { setShowImportAuto(false); handleImportAuto(); }} disabled={!importPassword}>
              Let the App Find Automatically
            </Button>
            <div className="flex items-center my-2">
              <div className="flex-grow border-t border-border" />
              <span className="mx-2 text-xs text-muted-foreground">or</span>
              <div className="flex-grow border-t border-border" />
            </div>
            <Button variant="outline" className="w-full h-8 text-sm bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 border-none" onClick={() => { setShowImportAuto(false); setShowImportManualDialog(true); }}>
              Import Manually (Choose File)
            </Button>
          </AlertDialogContent>
        </AlertDialog>
        {/* Manual Import Dialog */}
        <AlertDialog open={showImportManualDialog} onOpenChange={setShowImportManualDialog}>
          <AlertDialogContent className="max-w-xs p-4">
            <AlertDialogDescription className="sr-only">Import your encrypted data file and enter your master password to unlock your account.</AlertDialogDescription>
            <div className="flex justify-between items-center mb-2">
              <AlertDialogTitle className="text-base">Import Manually</AlertDialogTitle>
              <button
                className="p-1 rounded hover:bg-muted"
                style={{ WebkitAppRegion: 'no-drag' }}
                onClick={() => setShowImportManualDialog(false)}
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <AlertDialogDescription className="mb-2 text-xs">
              Select your encrypted data file and enter your master password to decrypt.
            </AlertDialogDescription>
            <input
              type="file"
              className="w-full border rounded px-2 py-1 mb-2 text-xs"
              onChange={e => setManualImportFile(e.target.files?.[0] || null)}
            />
            <input
              type="password"
              className="w-full border rounded px-2 py-1 mb-2 text-xs bg-[hsl(var(--backgroud))]"
              placeholder="Enter master password"
              value={manualImportPassword}
              onChange={e => setManualImportPassword(e.target.value)}
            />
            {manualImportError && <div className="text-red-500 text-xs mb-1">{manualImportError}</div>}
            <AlertDialogFooter>
              <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleImportManual}
                disabled={!manualImportFile || !manualImportPassword}
                className="text-xs cursor-pointer"
              >
                Import and Unlock
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Create Master Password Dialog */}
        <AlertDialog open={showCreatePassword} onOpenChange={setShowCreatePassword}>
          <AlertDialogContent className="max-w-xs p-4">
            <AlertDialogDescription className="sr-only">Set a strong password to secure your account. You will need this password to unlock the app.</AlertDialogDescription>
            <div className="flex justify-between items-center mb-2">
              <AlertDialogTitle className="text-base">Create Master Password</AlertDialogTitle>
              <button
                className="p-1 rounded hover:bg-muted"
                style={{ WebkitAppRegion: 'no-drag' }}
                onClick={() => { setShowCreatePassword(false); setMasterPassword(''); setRetypePassword(''); }}
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <AlertDialogDescription className="mb-2 text-xs">
              Set a strong password to secure your account. You will need this password to unlock the app.
            </AlertDialogDescription>
            <input
              type="password"
              className="w-full border rounded px-2 py-1 mb-1 text-sm  bg-[hsl(var(--backgroud))]"
              placeholder="Enter master password"
              value={masterPassword}
              onChange={e => setMasterPassword(e.target.value)}
              autoComplete="new-password"
            />
            <input
              type="password"
              className="w-full border rounded px-2 py-1 mb-1 text-sm bg-[hsl(var(--backgroud))]"
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
            <AlertDialogFooter>
              <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCreatePassword}
                disabled={!!passwordValidation || !passwordsMatch}
                className="text-xs cursor-pointer"
              >
                Set Password
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default FirstSetup; 
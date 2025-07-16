import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { saveData, importData, loadData } from '../lib/utils';
import { listen } from "@tauri-apps/api/event";
import { Card, CardContent } from '../components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../components/ui/carousel';
import useEmblaCarousel, { type UseEmblaCarouselType } from 'embla-carousel-react';
import CustomPasswordInput from '../components/CustomPasswordInput';
import crypto from 'crypto';
import MatrixText from '../components/MatrixText';

interface FirstSetupProps {
  onSetupComplete?: () => void;
}

const ONBOARDING_STEPS = [
  {
    title: 'Welcome to Obscure',
    subtitle: 'Open. Type. Close.',
    description: 'A private, distraction-free notes app that saves everything for you—securely and silently.'
  },
  {
    title: 'Write Without Limits',
    subtitle: 'Markdown + Rich Text. Fast, fluid, powerful.',
    description: 'From quick thoughts to deep work—checklists, code, formatting—it all just flows.'
  },
  {
    title: 'Local-First. Always Private.',
    subtitle: 'Your notes, your device, your rules.',
    description: 'No cloud, no trackers. Everything stays offline and encrypted with your master password.'
  },
  {
    title: 'Start With Obscure',
    subtitle: 'Create or Import Your Vault',
    description: 'Get started in seconds. No accounts, no nonsense. Your notes stay yours, always.'
  },
];

const generateRecoveryCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 18; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const hashRecoveryCode = (code: string) => {
  // Simple SHA-256 hash for local use
  return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(code)).then(buf => {
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  });
};

const FirstSetup = ({ onSetupComplete }: FirstSetupProps) => {
  const navigate = useNavigate();
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showImportAuto, setShowImportAuto] = useState(false);
  const [showImportManual, setShowImportManual] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState('');
  const [showImportManualDialog, setShowImportManualDialog] = useState(false);
  const [manualImportFile, setManualImportFile] = useState<File | null>(null);
  const [manualImportPassword, setManualImportPassword] = useState('');
  const [manualImportError, setManualImportError] = useState('');
  const [manualImportLoading, setManualImportLoading] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<UseEmblaCarouselType[1] | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState<'create' | 'import' | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [showRecoveryCode, setShowRecoveryCode] = useState(false);
  // Add state for copy feedback
  const [copied, setCopied] = useState(false);

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
    setCreateLoading(true);
    setTimeout(async () => {
      try {
        await saveData(masterPassword, JSON.stringify({ notes: [] }));
        // Generate and store recovery code
        const code = generateRecoveryCode();
        setRecoveryCode(code);
        setShowRecoveryCode(true);
        const hash = await hashRecoveryCode(code);
        localStorage.setItem('recoveryCodeHash', hash);
        localStorage.setItem('recoveryCodeUses', '0');
        setShowCreatePassword(false);
        setMasterPassword('');
        setRetypePassword('');
        setShowSuccessPopup(null); // Don't show default success popup
        localStorage.setItem('showFirstLoginMessage', '1');
      } catch (e) {
        alert('Failed to initialize secure storage.');
      } finally {
        setCreateLoading(false);
      }
    }, 2000); // 2 second delay
  };

  const handleImportAuto = () => {
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
      const fileContent = await manualImportFile.text();
      await importData(fileContent);
      let decrypted: any;
      try {
        decrypted = await loadData(manualImportPassword);
      } catch (e) {
        setManualImportLoading(false);
        setManualImportError('Failed to decrypt file. Check your password or file.');
        return;
      }
      let vaultObj: any;
      try {
        vaultObj = JSON.parse(decrypted);
      } catch {
        setManualImportLoading(false);
        setManualImportError('Imported file is not valid JSON.');
        return;
      }
      if (!vaultObj || !Array.isArray(vaultObj.notes)) {
        setManualImportLoading(false);
        setManualImportError('This file is not a valid vault. If you want to import a single note, use the single note import feature.');
        return;
      }
      setShowImportManualDialog(false);
      setManualImportFile(null);
      setManualImportPassword('');
      setManualImportLoading(false);
      setShowSuccessPopup('import');
      localStorage.setItem('showFirstLoginMessage', '1');
    } catch (e) {
      setManualImportLoading(false);
      setManualImportError('Failed to decrypt file. Check your password or file.');
    }
  };

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
    if (!carouselApi) return;
    const onSelect = () => setCarouselIndex(carouselApi.selectedScrollSnap());
    carouselApi.on('select', onSelect);
    setCarouselIndex(carouselApi.selectedScrollSnap());
    return () => { carouselApi.off('select', onSelect); };
  }, [carouselApi]);

  return (
    <div className="min-h-screen w-screen h-screen flex flex-col items-center justify-center bg-background text-foreground transition-colors duration-300 overflow-hidden">
      {/* Draggable Title Bar Area */}
      <div 
        className="absolute top-0 left-0 w-full h-12 z-10" 
        style={{ WebkitAppRegion: 'drag' }}
      >
        {/* This creates a draggable area across the top */}
      </div>

      {/* Window Controls - Keep these as no-drag */}
      <div 
        className="absolute top-0 right-0 flex items-center gap-1 z-20" 
        style={{ WebkitAppRegion: 'no-drag', height: '2.5rem' }}
      >
        <button
          className="w-10 h-10 px-0 flex items-center justify-center transition-colors select-none window-control-btn"
          title="Minimize"
          onClick={async () => { 
            const window = getCurrentWindow(); 
            await window.minimize(); 
          }}
        >
          <span style={{ fontFamily: 'Segoe MDL2 Assets', fontSize: 11 }}>&#xE921;</span>
        </button>
        {isMaximized ? (
          <button
            className="w-10 h-10 px-0 flex items-center justify-center transition-colors select-none window-control-btn"
            title="Restore"
            onClick={async () => { 
              const window = getCurrentWindow(); 
              await window.toggleMaximize(); 
            }}
          >
            <span style={{ fontFamily: 'Segoe MDL2 Assets', fontSize: 11 }}>&#xE923;</span>
          </button>
        ) : (
          <button
            className="w-10 h-10 px-0 flex items-center justify-center transition-colors select-none window-control-btn"
            title="Maximize"
            onClick={async () => { 
              const window = getCurrentWindow(); 
              await window.toggleMaximize(); 
            }}
          >
            <span style={{ fontFamily: 'Segoe MDL2 Assets', fontSize: 11 }}>&#xE922;</span>
          </button>
        )}
        <button
          className="w-10 h-10 px-0 flex items-center justify-center hover:bg-windowred hover:text-white transition-colors select-none"
          title="Close"
          onClick={async () => { 
            const window = getCurrentWindow(); 
            await window.close(); 
          }}
        >
          <span style={{ fontFamily: 'Segoe MDL2 Assets', fontSize: 11 }}>&#xE8BB;</span>
        </button>
      </div>

      {/* Improved Light Bar Effect */}
      <div className="absolute top-0 left-0 w-full flex justify-center pointer-events-none" style={{ zIndex: 20, height: '100vh' }}>
        {/* Light bar right at the top edge */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-1">
          {/* Main light bar */}
          <div className="w-24 h-1 bg-indigo-500 rounded-full"></div>
          {/* Inner bright glow */}
          <div className="absolute top-0 left-0 w-24 h-1 bg-indigo-400 rounded-full blur-sm opacity-80"></div>
          {/* Medium glow */}
          <div className="absolute -top-0.5 -left-1 w-26 h-2 bg-indigo-400 rounded-full blur-md opacity-40"></div>
          {/* Outer soft glow */}
          <div className="absolute -top-1 -left-2 w-28 h-3 bg-indigo-300 rounded-full blur-lg opacity-25"></div>
        </div>
        {/* Smooth radial light effect for light mode */}
        <div
          className="absolute top-0 left-0 w-full h-screen pointer-events-none dark:hidden"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.45) 0%, rgba(99,102,241,0.10) 60%, transparent 100%)',
          }}
        />
        {/* Smooth radial light effect for dark mode */}
        <div
          className="hidden dark:block absolute top-0 left-0 w-full h-screen pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.30) 0%, rgba(99,102,241,0.08) 55%, transparent 100%)',
          }}
        />
      </div>

      {/* Main Content - Remove WebkitAppRegion: 'no-drag' or set to 'drag' */}
      <div className="w-full h-full flex flex-col items-center justify-center p-0 md:p-8 gap-0 bg-transparent">
        <Carousel className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center bg-transparent" setApi={setCarouselApi}>
          <CarouselContent className="bg-transparent">
            {ONBOARDING_STEPS.map((step, idx) => (
              <CarouselItem key={idx} className="bg-transparent">
                <div className="p-1 h-full flex items-center justify-center bg-transparent">
                  <Card className="w-full h-full min-h-[420px] flex flex-col items-center justify-center bg-transparent text-card-foreground border-0 shadow-none">
                    <CardContent className="flex flex-col items-center justify-center w-full h-full p-8 select-none bg-transparent" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      <div className="text-4xl font-extrabold mb-4 w-full text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{step.title}</div>
                      <div className="text-xl font-semibold mb-2 w-full text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{step.subtitle}</div>
                      <div className="text-base md:text-lg mb-8 w-full text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{step.description}</div>
                      {idx === ONBOARDING_STEPS.length - 1 && (
                        <div className="flex flex-col gap-2 w-full max-w-xs items-center mt-4">
                          <Button className="w-full h-10 text-base font-semibold bg-indigo-500 text-white rounded-lg shadow hover:bg-indigo-800 transition" onClick={() => setShowCreatePassword(true)}>
                            Start from Scratch
                          </Button>
                          <Button className="w-full h-10 text-base font-semibold bg-indigo-500 text-white rounded-lg shadow hover:bg-indigo-800 transition" onClick={() => setShowImportManualDialog(true)}>
                            Import Existing Vault
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
        
        {/* Progress bar */}
        <div className="flex flex-row gap-2 mt-8 justify-center w-full bg-transparent">
          {ONBOARDING_STEPS.map((_, idx) => (
            <span
              key={idx}
              className={`w-2 h-2 rounded-full border-2 ${carouselIndex === idx ? 'bg-indigo-500 border-indigo-500' : 'bg-neutral-300 dark:bg-neutral-700 border-neutral-400 dark:border-neutral-500'} transition-all bg-transparent`}
            />
          ))}
        </div>
      </div>

      {/* Create Password Dialog */}
      {showCreatePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl p-8 w-full max-w-xs flex flex-col items-center border border-[hsl(var(--border))] relative text-card-foreground bg-background">
            <div className="text-xl font-bold mb-2 text-center">Create Master Password</div>
            <div className="text-sm text-muted-foreground mb-4 text-center">Set a strong password to secure your account. You will need this password to unlock the app.</div>
            <div className="flex flex-col w-full gap-2 mb-2">
              <CustomPasswordInput
                value={masterPassword}
                onChange={setMasterPassword}
                placeholder="Enter master password"
                disabled={createLoading}
                autoFocus
              />
              <CustomPasswordInput
                value={retypePassword}
                onChange={setRetypePassword}
                placeholder="Retype master password"
                disabled={createLoading}
              />
            </div>
            {/* Real-time feedback */}
            {masterPassword && passwordValidation && (
              <div className="text-red-500 text-xs mb-1">{passwordValidation}</div>
            )}
            {masterPassword && !passwordValidation && retypePassword && !passwordsMatch && (
              <div className="text-red-500 text-xs mb-1">Passwords do not match.</div>
            )}
            <div className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 rounded p-2 mb-2 text-center">
              <b>Important:</b> If you forget your password, <u>all your notes will be lost</u>. There is no way to recover them. Please write down or remember your password securely.
            </div>
            <div className="flex flex-col w-full gap-2 mt-4">
              <button
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow transition disabled:opacity-60 ${createLoading ? 'bg-indigo-500 text-white' : 'bg-foreground text-background'} hover:bg-primary/90`}
                onClick={handleCreatePassword}
                disabled={!!passwordValidation || !passwordsMatch || createLoading}
              >
                {createLoading ? (
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
              <button className="mt-2 text-xs text-muted-foreground hover:underline" onClick={() => { setShowCreatePassword(false); setMasterPassword(''); setRetypePassword(''); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Show recovery code after password creation */}
      {showRecoveryCode && recoveryCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl p-8 w-full max-w-xs flex flex-col items-center border border-[hsl(var(--border))] relative text-card-foreground bg-background">
            <div className="text-2xl font-bold mb-2 text-center">Save Your Recovery Code</div>
            <div className="text-sm text-muted-foreground mb-4 text-center">
              This is your only way to reset your password if you forget it. <b>Write it down and keep it safe.</b> You can use it up to 3 times. After that, it will be invalid.
            </div>
            <div className="mb-2 w-full flex flex-col items-center">
              <code className="block w-full text-center font-mono text-base md:text-lg tracking-widest text-[hsl(var(--code-block-text))] bg-[hsl(var(--code-block-background))] rounded px-3 py-2 whitespace-nowrap overflow-x-auto select-all">
                {recoveryCode}
              </code>
            </div>
            <button
              className="w-full flex items-center justify-center px-4 py-2 rounded-lg font-semibold text-base shadow border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--code-block-text))] hover:bg-muted transition mb-1"
              onClick={async () => {
                await navigator.clipboard.writeText(recoveryCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-2 text-center">
              <b>Warning:</b> Resetting your password will <u>wipe all your notes</u>. Only use this if you are sure you have lost your password and accept losing all your data.
            </div>
            <button
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow bg-indigo-500 text-white hover:bg-indigo-800 transition mt-0"
              onClick={() => { setShowRecoveryCode(false); setShowSuccessPopup('create'); setRecoveryCode(null); }}
            >
              I have saved it
            </button>
          </div>
        </div>
      )}

      {/* Import Manual Dialog */}
      {showImportManualDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl p-8 w-full max-w-xs flex flex-col items-center border border-[hsl(var(--border))] relative bg-background text-card-foreground">
            <div className="text-xl font-bold mb-2 text-center">Import Manually</div>
            <div className="text-sm text-muted-foreground mb-4 text-center">Select your encrypted data file and enter your master password to decrypt.</div>
            <input
              type="file"
              className="w-full border rounded-lg px-3 py-2 text-base mb-2"
              onChange={e => setManualImportFile(e.target.files?.[0] || null)}
            />
            <CustomPasswordInput
              value={manualImportPassword}
              onChange={setManualImportPassword}
              placeholder="Enter master password"
              disabled={manualImportLoading}
              autoFocus
            />
            {manualImportError && <div className="text-red-500 text-xs mb-1">{manualImportError}</div>}
            <div className="flex flex-col w-full gap-2 mt-4">
              <button
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow transition disabled:opacity-60 ${manualImportLoading ? 'bg-indigo-500 text-white' : 'bg-foreground text-background'} hover:bg-primary/90 cursor-pointer`}
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
              <button className="mt-2 text-xs text-muted-foreground hover:underline" onClick={() => {
                  setShowImportManualDialog(false);
                  setManualImportFile(null);
                  setManualImportPassword('');
                  setManualImportError('');
                  setManualImportLoading(false);
                }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl p-8 w-full max-w-xs flex flex-col items-center border border-[hsl(var(--border))] relative text-card-foreground bg-background">
            <div className="text-2xl font-bold mb-2 text-center">
              {showSuccessPopup === 'create' ? 'Account Created!' : 'Import Successful!'}
            </div>
            <div className="text-sm text-muted-foreground mb-4 text-center">
              Account {showSuccessPopup === 'create' ? 'creation' : 'import'} successful. Please log in.
            </div>
            <button
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow bg-indigo-500 text-white hover:bg-indigo-800 transition mt-2"
              onClick={() => { window.location.href = '/login'; }}
            >
              Go to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FirstSetup;
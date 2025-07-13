import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { saveData, importData, loadData } from '../lib/utils';
import notesImg from '../assets/notes.png';
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

interface FirstSetupProps {
  onSetupComplete?: () => void;
}

const ONBOARDING_STEPS = [
  {
    title: 'Obscure',
    subtitle: 'A private, powerful notes app for devs and thinkers.',
    description: 'Your thoughts stay offline, safe, and yours.',
  },
  {
    title: 'Local-First, Always Private',
    subtitle: 'No Cloud. No Tracking.',
    description: 'Your notes are stored locally and encrypted with your master password. Even we can’t read them.',
  },
  {
    title: 'Fast Markdown/Rich Text Editor',
    subtitle: 'Write Freely',
    description: 'Code snippets, checklists, formatting — all in one place. Optimized for writing, built for speed.',
  },
  {
    title: 'Encrypted Vault',
    subtitle: 'Secure Everything',
    description: 'Lock notes, protect with a single master password. Your data is encrypted with AES-256.',
  },
  {
    title: 'Ready to Begin?',
    subtitle: 'Let’s Get You Started',
    description: 'Create a vault or import your existing one. Only you control your data.',
  },
];

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
  // Remove state for import and create success popups and countdown
  const [isMaximized, setIsMaximized] = useState(false);
  // Remove onboardingStep state
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<UseEmblaCarouselType[1] | null>(null);
  // Add state for success popup
  const [showSuccessPopup, setShowSuccessPopup] = useState<'create' | 'import' | null>(null);
  // Add loading state for create password
  const [createLoading, setCreateLoading] = useState(false);

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
    try {
      await saveData(masterPassword, JSON.stringify({ notes: [] }));
      setShowCreatePassword(false);
      setMasterPassword('');
      setRetypePassword('');
      // setShowCreateSuccess(true); // Removed
      // setSuccessCountdown(3); // Removed
      setShowSuccessPopup('create');
    } catch (e) {
      // Optionally show error
      alert('Failed to initialize secure storage.');
    } finally {
      setCreateLoading(false);
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
      // setShowImportSuccess(true); // Removed
      // setSuccessCountdown(3); // Removed
      setShowSuccessPopup('import');
    } catch (e) {
      setManualImportLoading(false);
      setManualImportError('Failed to decrypt file. Check your password or file.');
    }
  };

  // Corrected Tauri v2 window event listening
 // Replace the useEffect hook with this corrected version:

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

  // Set fixed window size and disable resizing for first login screen
useEffect(() => {
  const setFixedSize = async () => {
    const win = getCurrentWindow();
    await win.setResizable(false);
    await win.setSize(new LogicalSize(900, 600));
    await win.setDecorations(false); // Optionally disable window decorations
  };
  setFixedSize();

  // On unmount, re-enable resizing and decorations
  return () => {
    const resetSize = async () => {
      const win = getCurrentWindow();
      await win.setResizable(true);
      await win.setDecorations(true);
      // Optionally, set a different size for the main app here
      // await win.setSize(new LogicalSize(1200, 800));
    };
    resetSize();
  };
}, []);

  // Remove the useEffect for countdown and popup
  // useEffect(() => {
  //   if (!showImportSuccess && !showCreateSuccess) return;
  //   if (successCountdown === 0) {
  //     setShowImportSuccess(false);
  //     setShowCreateSuccess(false);
  //     window.location.href = '/login';
  //     return;
  //   }
  //   const timer = setTimeout(() => setSuccessCountdown(c => c - 1), 1000);
  //   return () => clearTimeout(timer);
  // }, [showImportSuccess, showCreateSuccess, successCountdown]);

  // Add effect to update carouselIndex on slide change
  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setCarouselIndex(carouselApi.selectedScrollSnap());
    carouselApi.on('select', onSelect);
    // Set initial index
    setCarouselIndex(carouselApi.selectedScrollSnap());
    return () => { carouselApi.off('select', onSelect); };
  }, [carouselApi]);

  return (
    <div className="min-h-screen w-screen h-screen flex items-center justify-center bg-background text-foreground transition-colors duration-300"
      style={{
        '--window-control-icon':
          typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
            ? '#ffffff'
            : '#000000',
      } as React.CSSProperties}
    >
      {/* Window Controls */}
      <div className="absolute top-0 right-0 flex items-center gap-1 z-10" style={{ WebkitAppRegion: 'drag', height: '2.5rem' }}>
        <button
          className="w-10 h-10 px-0 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-windowgray transition-colors select-none"
          style={{ WebkitAppRegion: 'no-drag' }}
          title="Minimize"
          onClick={async () => { 
            const window = getCurrentWindow(); 
            await window.minimize(); 
          }}
        >
          <span style={{ fontFamily: 'Segoe MDL2 Assets', fontSize: 11, color: 'var(--window-control-icon)' }}>&#xE921;</span>
        </button>
        {isMaximized ? (
          <button
            className="w-10 h-10 px-0 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-windowgray transition-colors select-none"
            style={{ WebkitAppRegion: 'no-drag' }}
            title="Restore"
            onClick={async () => { 
              const window = getCurrentWindow(); 
              await window.toggleMaximize(); 
            }}
          >
            <span style={{ fontFamily: 'Segoe MDL2 Assets', fontSize: 11, color: 'var(--window-control-icon)' }}>&#xE923;</span>
          </button>
        ) : (
          <button
            className="w-10 h-10 px-0 flex items-center justify-center hover:bg-windowlight dark:hover:bg-windowgray transition-colors select-none"
            style={{ WebkitAppRegion: 'no-drag' }}
            title="Maximize"
            onClick={async () => { 
              const window = getCurrentWindow(); 
              await window.toggleMaximize(); 
            }}
          >
            <span style={{ fontFamily: 'Segoe MDL2 Assets', fontSize: 11, color: 'var(--window-control-icon)' }}>&#xE922;</span>
          </button>
        )}
        <button
          className="w-10 h-10 px-0 flex items-center justify-center hover:bg-windowred hover:text-white transition-colors select-none"
          style={{ WebkitAppRegion: 'no-drag' }}
          title="Close"
          onClick={async () => { 
            const window = getCurrentWindow(); 
            await window.close(); 
          }}
        >
          <span style={{ fontFamily: 'Segoe MDL2 Assets', fontSize: 11, color: 'var(--window-control-icon)'}}>&#xE8BB;</span>
        </button>
      </div>
      <div className="w-full h-full flex flex-col items-center justify-center p-0 md:p-8 gap-0 bg-transparent" style={{ WebkitAppRegion: 'no-drag' }}>
        <Carousel className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center" setApi={setCarouselApi}>
          <CarouselContent>
            {ONBOARDING_STEPS.map((step, idx) => (
              <CarouselItem key={idx}>
                <div className="p-1 h-full flex items-center justify-center">
                  <Card className="w-full h-full min-h-[420px] flex flex-col items-center justify-center bg-card text-card-foreground border-0 shadow-none">
                    <CardContent className="flex flex-col items-center justify-center w-full h-full p-8 select-none" style={{ fontFamily: 'Epilogue, sans-serif' }}>
                      <div className="text-4xl font-extrabold mb-4 w-full text-center">{step.title}</div>
                      <div className="text-xl font-semibold mb-2 w-full text-center">{step.subtitle}</div>
                      <div className="text-base md:text-lg mb-8 w-full text-center">{step.description}</div>
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
        <div className="flex flex-row gap-2 mt-8 justify-center w-full">
          {ONBOARDING_STEPS.map((_, idx) => (
            <span
              key={idx}
              className={`w-2 h-2 rounded-full border-2 ${carouselIndex === idx ? 'bg-indigo-500 border-indigo-500' : 'bg-neutral-300 dark:bg-neutral-700 border-neutral-400 dark:border-neutral-500'} transition-all`}
            />
          ))}
        </div>
      </div>
      {/* Dialogs and popups remain unchanged */}
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
                <div className="flex flex-col w-full gap-2 mt-4">
                  <button
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow border border-[hsl(var(--border))] bg-background text-foreground hover:bg-muted transition disabled:opacity-60"
                    onClick={() => { setShowCreatePassword(false); setMasterPassword(''); setRetypePassword(''); }}
                  >
                    Cancel
                  </button>
                  <button
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-primary/90 transition disabled:opacity-60 ${createLoading ? 'bg-indigo-500 text-white' : 'bg-black text-white'}`}
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
                </div>
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
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-primary/90 transition disabled:opacity-60 cursor-pointer ${manualImportLoading ? 'bg-indigo-500 text-white' : 'bg-black text-white'}`}
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
          {/* Remove the JSX for Import Success Popup and Create Success Popup */}
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
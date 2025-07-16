import { useState, useRef, useEffect } from 'react';
import { Search, Plus, Trash, Settings, Archive, SquarePlus, Sun, Moon, Laptop, KeyRound, Upload, Download, Settings2, Info, RefreshCw, Mail, BookOpen, Lock, FileDown, Eye, EyeOff, LockOpen, FileCode2, Scale, X, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import type { Note } from '../pages/Index';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuSeparator,
  ContextMenuRadioGroup,
  ContextMenuRadioItem
} from './ui/context-menu';
import { useNavigate } from 'react-router-dom';
import { clearDataFile, exportData, loadData, importData, saveData } from '../lib/utils';
import { useTheme } from '../lib/theme';
import jsPDF from 'jspdf';
import { slateToHtml } from '../lib/slateToHtml';
import { slateToMarkdown } from '../lib/slateToMarkdown';
import { contentToSlateValue } from './NoteEditor';
import CustomPasswordInput from './CustomPasswordInput';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from './ui/dropdown-menu';
import { HoldToConfirmButton } from './HoldToConfirmButton';

interface SidebarProps {
  notes: Note[];
  selectedNote: Note | null;
  collapsed: boolean;
  isDark: boolean;
  onNoteSelect: (note: Note) => void;
  onCreateNote: () => void;
  onDeleteNote: (noteId: string) => void;
  onRestoreNote: (noteId: string) => void;
  onDeletePermanently: (noteId: string) => void;
  onToggleCollapse: () => void;
  onRemoveFavorite: (noteId: string) => void;
  onDeletedClick: () => void;
  deletedCount: number;
  onArchivedClick: () => void;
  archivedCount: number;
  onArchiveNote: (noteId: string) => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  onLock: () => void;
  overlayMode?: boolean;
  overlayOpen?: boolean;
  onOverlayClose?: () => void;
}

export const Sidebar = ({
  notes,
  selectedNote,
  collapsed,
  onNoteSelect,
  onCreateNote,
  onDeleteNote,
  onRemoveFavorite,
  onDeletedClick,
  deletedCount,
  onArchivedClick,
  archivedCount,
  onArchiveNote,
  theme,
  setTheme,
  onLock,
  overlayMode = false,
  overlayOpen = false,
  onOverlayClose,
}: SidebarProps) => {
  const [, setHoveredNote] = useState<string | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string>('notes'); // Track active sidebar section
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null); // <-- Add ref for sidebar
  const navigate = useNavigate();
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportJsonPassword, setExportJsonPassword] = useState('');
  const [exportJsonError, setExportJsonError] = useState('');
  const [exportingType, setExportingType] = useState<null | 'dat' | 'json'>(null);
  const [showPassword, setShowPassword] = useState(false);
  // Add import dialog state and related states
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [importError, setImportError] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  // Add change password dialog state and related states
  const [changePwDialogOpen, setChangePwDialogOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmNewPw, setConfirmNewPw] = useState('');
  const [changePwError, setChangePwError] = useState('');
  const [changePwLoading, setChangePwLoading] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmNewPw, setShowConfirmNewPw] = useState(false);
  // Add state for password change confirmation popup
  const [showPwChangeSuccess, setShowPwChangeSuccess] = useState(false);
  // Add state for clear data success popup and countdown
  const [showClearDataSuccess, setShowClearDataSuccess] = useState(false);
  const [clearDataCountdown, setClearDataCountdown] = useState(5);
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  // Add state for single note import dialog
  const [singleNoteImportDialogOpen, setSingleNoteImportDialogOpen] = useState(false);
  const [singleNoteImportFile, setSingleNoteImportFile] = useState<File | null>(null);
  const [singleNoteImportPassword, setSingleNoteImportPassword] = useState('');
  const [singleNoteImportError, setSingleNoteImportError] = useState('');
  const [singleNoteImportLoading, setSingleNoteImportLoading] = useState(false);
  const [showSingleNoteImportSuccess, setShowSingleNoteImportSuccess] = useState(false);
  // --- Add state for clear data password and error ---
  const [clearDataPassword, setClearDataPassword] = useState('');
  const [clearDataError, setClearDataError] = useState('');
  const [clearDataLoading, setClearDataLoading] = useState(false);
  // Add state for Developer Options popup
  const [developerOptionsOpen, setDeveloperOptionsOpen] = useState(false);
  // Add state for font selection
  const [fontSelectorOpen, setFontSelectorOpen] = useState(false);
  const [selectedFont, setSelectedFont] = useState(() => localStorage.getItem('appFontFamily') || 'spacegrotesk');
  // Add state for inactivity drawer
  const [inactivityDrawerOpen, setInactivityDrawerOpen] = useState(false);
  const inactivityOptions = [
    { value: 'off', label: 'Off' },
    { value: '1', label: '1 minute' },
    { value: '2', label: '2 minutes' },
    { value: '5', label: '5 minutes' },
    { value: '10', label: '10 minutes' },
    { value: '30', label: '30 minutes' },
  ];
  const inactivityValue = localStorage.getItem('inactivityLockMinutes') || 'off';

  // Apply font to document body or root
  useEffect(() => {
    document.body.classList.remove('font-roboto', 'font-inter', 'font-arial', 'font-spacegrotesk');
    document.body.classList.add(`font-${selectedFont}`);
    localStorage.setItem('appFontFamily', selectedFont);
  }, [selectedFont]);

  // Listen for global search trigger (Ctrl+K)
  useEffect(() => {
    const handler = () => {
      setIsSearchActive(true);
      setActiveSection('search');
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    };
    window.addEventListener('trigger-app-search', handler);
    return () => window.removeEventListener('trigger-app-search', handler);
  }, []);

  // Handle search activation
  const handleSearchClick = () => {
    setIsSearchActive(true);
    setActiveSection('search');
    // Focus the input after the animation completes
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 250);
  };

  // Handle click outside to close search (now checks for sidebar, not just input)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isSearchActive &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setIsSearchActive(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchActive]);

  // Handle Escape key to close search
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isSearchActive) {
        setIsSearchActive(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isSearchActive]);

  
  const menuItems = [
    { icon: SquarePlus, label: 'New Note', active: false, onClick: onCreateNote },
  ];

  const handleClearAllData = async () => {
    setClearDataError('');
    setClearDataLoading(true);
    setTimeout(async () => {
      try {
        // Verify password before clearing data
        await loadData(clearDataPassword);
        setConfirmClearOpen(false);
        await clearDataFile();
        sessionStorage.removeItem('masterPassword');
        sessionStorage.removeItem('loggedIn');
        setShowClearDataSuccess(true);
        setClearDataCountdown(5);
        setClearDataPassword('');
      } catch (e) {
        setClearDataError('Incorrect master password. Data was not deleted.');
      } finally {
        setClearDataLoading(false);
      }
    }, 2000); // 2 second delay
  };

  const handleExportDat = async () => {
    setExportingType('dat');
    setTimeout(async () => {
      try {
        const fileContent = await exportData();
        const blob = new Blob([fileContent], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vault.dat';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        setExportDialogOpen(false);
      } catch (e) {
        alert('Failed to export encrypted file.');
      }
      setExportingType(null);
    }, 2000); // 2 second delay
  };

  const handleExportJson = async () => {
    setExportingType('json');
    setExportJsonError('');
    setTimeout(async () => {
      try {
        const data = await loadData(exportJsonPassword);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'notes.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        setExportDialogOpen(false);
        setExportJsonPassword('');
      } catch (e) {
        setExportJsonError('Incorrect password or corrupt data.');
      }
      setExportingType(null);
    }, 2000); // 2 second delay
  };

  useEffect(() => {
    if (exportJsonError) {
      const timer = setTimeout(() => setExportJsonError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [exportJsonError]);

  // Add import handler
  const handleImportNotes = async () => {
    setImportError('');
    if (!importFile) {
      setImportError('Please select a file.');
      return;
    }
    if (!importPassword) {
      setImportError('Please enter your password.');
      return;
    }
    setImportLoading(true);
    setTimeout(async () => {
      try {
        const fileContent = await importFile.text();
        await importData(fileContent);
        // Try to decrypt and check format
        let decrypted: any;
        try {
          decrypted = await loadData(importPassword);
        } catch (e) {
          setImportError('Failed to import. Check your password or file.');
          setImportLoading(false);
          return;
        }
        let vaultObj: any;
        try {
          vaultObj = JSON.parse(decrypted);
        } catch {
          setImportError('Imported file is not valid JSON.');
          setImportLoading(false);
          return;
        }
        if (!vaultObj || !Array.isArray(vaultObj.notes)) {
          setImportError('This file is not a valid vault. If you want to import a single note, use the single note import feature.');
          setImportLoading(false);
          return;
        }
        setImportDialogOpen(false);
        setImportFile(null);
        setImportPassword('');
        setShowImportSuccess(true);
      } catch (e) {
        setImportError('Failed to import. Check your password or file.');
      } finally {
        setImportLoading(false);
      }
    }, 2000); // 2 second delay
  };

  // Password policy validation (copied from FirstSetup)
  function validatePassword(pw: string): string {
    if (pw.length < 8) return 'Password must be at least 8 characters.';
    if (!/[a-z]/.test(pw)) return 'Password must include a lowercase letter.';
    if (!/[A-Z]/.test(pw)) return 'Password must include an uppercase letter.';
    if (!/[0-9]/.test(pw)) return 'Password must include a number.';
    if (!/[^a-zA-Z0-9]/.test(pw)) return 'Password must include a special character.';
    return '';
  }

  // Replace handleChangePassword with secure logic
  const handleChangePassword = async () => {
    setChangePwError('');
    if (!currentPw || !newPw || !confirmNewPw) {
      setChangePwError('Please fill in all fields.');
      return;
    }
    if (newPw !== confirmNewPw) {
      setChangePwError('New passwords do not match.');
      return;
    }
    const pwPolicyError = validatePassword(newPw);
    if (pwPolicyError) {
      setChangePwError(pwPolicyError);
      return;
    }
    setChangePwLoading(true);
    try {
      // 1. Load and decrypt data with current password
      const data = await loadData(currentPw);
      // 2. Save data with new password (re-encrypt)
      await saveData(newPw, data);
      setChangePwDialogOpen(false);
      setCurrentPw('');
      setNewPw('');
      setConfirmNewPw('');
      setShowPwChangeSuccess(true);
    } catch (e) {
      setChangePwError('Current password is incorrect.');
    } finally {
      setChangePwLoading(false);
    }
  };

  // Helper to reset all change password dialog fields
  const resetChangePwDialog = () => {
    setCurrentPw('');
    setNewPw('');
    setConfirmNewPw('');
    setChangePwError('');
    setShowCurrentPw(false);
    setShowNewPw(false);
    setShowConfirmNewPw(false);
  };

  // Helper to reset import dialog fields
  const resetImportDialog = () => {
    setImportFile(null);
    setImportPassword('');
    setImportError('');
    setImportLoading(false);
  };
  // Helper to reset export dialog fields
  const resetExportDialog = () => {
    setExportJsonPassword('');
    setExportJsonError('');
    setShowPassword(false);
    setExportingType(null);
  };

  // Add export as PDF and Markdown handlers
  const handleExportNotePdf = async (note: Note) => {
    try {
      const slateValue = contentToSlateValue(note.content);
      const html = slateToHtml(slateValue);
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      await doc.html(`<div style='font-family: sans-serif; font-size: 14px;'>${html}</div>`, {
        callback: function (doc) {
          doc.save(`${note.title || 'note'}.pdf`);
        },
        x: 24,
        y: 24,
        width: 550,
        windowWidth: 950
      });
    } catch (e) {
      alert('Failed to export as PDF.');
    }
  };

  const handleExportNoteMarkdown = (note: Note) => {
    try {
      const slateValue = contentToSlateValue(note.content);
      const md = slateToMarkdown(slateValue);
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${note.title || 'note'}.md`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (e) {
      alert('Failed to export as Markdown.');
    }
  };

  // Add export as encrypted .dat handler
  const handleExportNoteDat = async (note: Note) => {
    try {
      // Prompt for password (reuse sessionStorage or prompt if not available)
      let masterPassword = sessionStorage.getItem('masterPassword');
      if (!masterPassword) {
        masterPassword = prompt('Enter your master password to export this note as encrypted (.dat):') || '';
      }
      if (!masterPassword) return;
      // Encrypt only this note as a vault
      const noteVault = JSON.stringify(note);
      // Save to a temp vault, export, then restore original vault
      let originalVault: string | null = null;
      try {
        originalVault = await exportData();
      } catch {}
      await saveData(masterPassword, noteVault);
      const fileContent = await exportData();
      // Restore original vault
      if (originalVault) await importData(originalVault);
      // Download as .dat
      const blob = new Blob([fileContent], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${note.title || 'note'}.dat`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (e) {
      alert('Failed to export as encrypted .dat.');
    }
  };

  // Add countdown effect for clear data popup
  useEffect(() => {
    if (!showClearDataSuccess) return;
    if (clearDataCountdown === 0) {
      window.location.href = '/';
      return;
    }
    const timer = setTimeout(() => setClearDataCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [showClearDataSuccess, clearDataCountdown]);

  // Handler for single note import
  const handleSingleNoteImport = async () => {
    setSingleNoteImportError('');
    if (!singleNoteImportFile) {
      setSingleNoteImportError('Please select a file.');
      return;
    }
    if (!singleNoteImportPassword) {
      setSingleNoteImportError('Please enter your password.');
      return;
    }
    setSingleNoteImportLoading(true);
    try {
      const fileContent = await singleNoteImportFile.text();
      let originalVault: string | null = null;
      try {
        originalVault = await exportData();
      } catch {}
      await importData(fileContent);
      let decrypted: any;
      try {
        decrypted = await loadData(singleNoteImportPassword);
      } catch (e) {
        if (originalVault) await importData(originalVault);
        setSingleNoteImportError('Incorrect password or corrupt file.');
        setSingleNoteImportLoading(false);
        return;
      }
      let noteObj: any;
      try {
        noteObj = JSON.parse(decrypted);
      } catch {
        if (originalVault) await importData(originalVault);
        setSingleNoteImportError('File is not a valid note.');
        setSingleNoteImportLoading(false);
        return;
      }
      if (Array.isArray(noteObj) || (noteObj.notes && Array.isArray(noteObj.notes))) {
        if (originalVault) await importData(originalVault);
        setSingleNoteImportError('You can only import a single note here.');
        setSingleNoteImportLoading(false);
        return;
      }
      if (!noteObj.id || !noteObj.title || !('content' in noteObj)) {
        if (originalVault) await importData(originalVault);
        setSingleNoteImportError('File is not a valid note.');
        setSingleNoteImportLoading(false);
        return;
      }
      if (originalVault) await importData(originalVault);
      if (notes.some(n => n.id === noteObj.id)) {
        setSingleNoteImportError('A note with this ID already exists.');
        setSingleNoteImportLoading(false);
        return;
      }
      const mergedNotes = [noteObj, ...notes];
      await saveData(singleNoteImportPassword, JSON.stringify({ notes: mergedNotes }));
      setShowSingleNoteImportSuccess(true);
      setSingleNoteImportDialogOpen(false);
      setSingleNoteImportFile(null);
      setSingleNoteImportPassword('');
    } catch (e) {
      setSingleNoteImportError('Failed to import. Check your password or file.');
    } finally {
      setSingleNoteImportLoading(false);
    }
  };
  // Helper to reset single note import dialog fields
  const resetSingleNoteImportDialog = () => {
    setSingleNoteImportFile(null);
    setSingleNoteImportPassword('');
    setSingleNoteImportError('');
    setSingleNoteImportLoading(false);
  };

  // Add effect to close overlay on Escape or click outside (only in overlay mode)
  useEffect(() => {
    if (!overlayMode || !overlayOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOverlayClose && onOverlayClose();
    };
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      // Check if click is inside sidebar
      if (sidebarRef.current && sidebarRef.current.contains(target)) return;
      // Check if click is inside any open menu (dropdown/context menu/popover/dialog)
      const menuSelectors = [
        '.dropdown-menu',
        '.context-menu',
        '.radix-dropdown-menu',
        '.radix-context-menu',
        '.menu',
        '.DialogContent',
        '.PopoverContent',
        '[role="menu"]',
        '[data-radix-popper-content-wrapper]',
        '.fixed.inset-0.z-50', // Add selector for modals/popups
      ];
      for (const selector of menuSelectors) {
        if (document.querySelector(selector) && (e.target instanceof Element) && (e.target.closest(selector))) {
          return;
        }
      }
      onOverlayClose && onOverlayClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClick);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClick);
    };
  }, [overlayMode, overlayOpen, onOverlayClose]);

  // Sidebar container
  if (overlayMode) {
    return overlayOpen ? (
      <>
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-all pointer-events-none" />
        <div
        
          ref={sidebarRef}
          className="fixed top-0 left-0 h-full w-64 min-w-64 z-50 bg-[hsl(var(--sidebar-background))] text-[hsl(var(--foreground))] border-r-[1.5px] border-r-[hsl(var(--sidebar-border))] shadow-xl transition-transform duration-200 pointer-events-auto flex flex-col"
          style={{ transform: overlayOpen ? 'translateX(0)' : 'translateX(-100%)' }}
        >
          {/* Top Menu Section */}
          <div className="px-3 py-2 flex-shrink-0">
            <div className="space-y-1">
              {/* New Note Button */}
              <div
                className={`flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] ${activeSection === 'new' ? 'bg-[hsl(var(--sidebar-active))]' : ''}`}
                onClick={() => { onCreateNote(); setActiveSection('new'); }}
              >
                <div className="flex items-center space-x-3">
                  <SquarePlus className="w-4 h-4" />
                  <span className="font-normal">New Note</span>
                </div>
              </div>
              {/* Search with Smooth Transition */}
              <div className="relative overflow-hidden">
                <div
                  className={`flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] ${activeSection === 'search' ? 'bg-[hsl(var(--sidebar-active))]' : ''}`}
                  onClick={!isSearchActive ? handleSearchClick : undefined}
                >
                  <div className="flex items-center w-full relative">
                    {/* Search Icon - Always Fixed */}
                    <Search className="w-4 h-4 flex-shrink-0 z-20 relative" />
                    
                    {/* Container for sliding elements */}
                    <div className="flex-1 ml-3 relative h-5 overflow-hidden">
                      {/* Search Label - Slides out to left */}
                      <span 
                        className={`font-normal absolute left-0 top-0 whitespace-nowrap transition-all duration-300 ease-in-out ${
                          isSearchActive 
                            ? 'transform -translate-x-full opacity-0' 
                            : 'transform translate-x-0 opacity-100'
                        }`}
                      >
                        Search
                      </span>
                      
                      {/* Search Input - Slides in from right */}
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`absolute left-0 top-0 w-full bg-transparent border-none outline-none text-[hsl(var(--sidebar-foreground))] placeholder-[hsl(var(--sidebar-foreground))] placeholder-opacity-60 transition-all duration-300 ease-in-out ${
                          isSearchActive 
                            ? 'transform translate-x-0 opacity-100 pointer-events-auto' 
                            : 'transform translate-x-full opacity-0 pointer-events-none'
                        }`}
                        placeholder="Search notes..."
                      />
                    </div>
                  </div>
                </div>
              </div>
              {/* Archive Button (main menu) */}
              <div
                className={`flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] ${activeSection === 'archive' ? 'bg-[hsl(var(--sidebar-active))]' : ''}`}
                onClick={() => { onArchivedClick(); setActiveSection('archive'); }}
              >
                <div className="flex items-center space-x-3">
                  <Archive className="w-4 h-4" />
                  <span className="font-normal">Archive</span>
                </div>
                {archivedCount !== undefined && (
                  <span className="text-xs text-[hsl(var(--sidebar-foreground))]">{archivedCount}</span>
                )}
              </div>
            </div>
          </div>

          {/* Folder Section */}
          <div className="px-3 py-2 flex-shrink-0">
            <div className="space-y-1">
              {/* Settings Button with Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div
                    className={`flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] ${activeSection === 'settings' ? 'bg-[hsl(var(--sidebar-active))]' : ''}`}
                    onClick={() => setActiveSection('settings')}
                  >
                    <div className="flex items-center space-x-3">
                      <Settings className="w-4 h-4" />
                      <span className="font-normal">Settings</span>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" sideOffset={8} className="w-52 bg-[hsl(var(--sidebar-background))] border border-[hsl(var(--context-menu-border))]">
                  {/* Appearance Section */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Appearance</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-50 bg-[hsl(var(--sidebar-background))] border border-[hsl(var(--context-menu-border))]">
                      <DropdownMenuRadioGroup
                        value={theme}
                        onValueChange={value => {
                          if (value === 'light' || value === 'dark' || value === 'system') {
                            setTheme(value);
                          }
                        }}
                      >
                        <DropdownMenuRadioItem value="light">
                          <Sun className="mr-2 h-4 w-4" />
                          Light
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="dark">
                          <Moon className="mr-2 h-4 w-4" />
                          Dark
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="system">
                          <Laptop className="mr-2 h-4 w-4" />
                          System
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  {/* Security & Privacy Section */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Security & Privacy</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-56 bg-[hsl(var(--sidebar-background))] border border-[hsl(var(--context-menu-border))]">
                      <DropdownMenuItem onClick={onLock}>
                        <Lock className="mr-2 h-4 w-4" />
                        Lock App
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setChangePwDialogOpen(true)}>
                        <KeyRound className="mr-2 h-4 w-4" />
                        Change master password
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className='border-t border-[hsl(var(--context-menu-border))]' />
                      <DropdownMenuItem variant="destructive" onClick={() => setConfirmClearOpen(true)}>
                        <Trash className="mr-2 h-4 w-4" />
                        Clear all data
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  {/* Advanced Section */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Advanced</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-56 bg-[hsl(var(--sidebar-background))] border border-[hsl(var(--context-menu-border))]">
                      <DropdownMenuItem onClick={() => setExportDialogOpen(true)}>
                        <Upload className="mr-2 h-4 w-4" />
                        Export notes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                        <Download className="mr-2 h-4 w-4" />
                        Import notes
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings2 className="mr-2 h-4 w-4" />
                        <span onClick={() => setDeveloperOptionsOpen(true)} style={{ width: '100%' }}>Preferences</span>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  {/* About Section */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>About</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-56 bg-[hsl(var(--sidebar-background))] border border-[hsl(var(--context-menu-border))]">
                      <DropdownMenuItem>
                        <Info className="mr-2 h-4 w-4" />
                        App version
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Check for updates
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Mail className="mr-2 h-4 w-4" />
                        Contact support
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Scale className="mr-2 h-4 w-4" />
                        Open source licenses
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Trash Button (unchanged) */}
              <div
                className={`flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] ${activeSection === 'trash' ? 'bg-[hsl(var(--sidebar-active))]' : ''}`}
                onClick={() => { onDeletedClick(); setActiveSection('trash'); }}
              >
                <div className="flex items-center space-x-3">
                  <Trash className="w-4 h-4" />
                  <span className="font-normal">Trash</span>
                </div>
                {deletedCount !== undefined && (
                  <span className="text-xs text-[hsl(var(--sidebar-foreground))]">{deletedCount}</span>
                )}
              </div>
            </div>
          </div>

          {/* Horizontal line between Folder and Favourites */}
          <div className="px-3 flex-shrink-0">
            <div className="border-t border-[hsl(var(--border))] w-full my-2" />
          </div>

          {/* Favorites Section */}
          <div className="px-3 py-2 flex-shrink-0">
            <div className="mb-2">
              <h3 className="text-xs font-normal text-[hsl(var(--sidebar-foreground))] px-3">Favourites</h3>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {notes.filter(note => note.isFavorite).map((note) => (
                <ContextMenu key={note.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] ${activeSection === `favorite-${note.id}` ? 'bg-[hsl(var(--sidebar-active))]' : ''}`}
                      onClick={() => { onNoteSelect(note); setActiveSection(`favorite-${note.id}`); }}
                    >
                      {note.favoriteEmoji ? (
                        <span className="text-lg">{note.favoriteEmoji}</span>
                      ) : (
                        <span className="text-sm favorite-icon">❤️</span>
                      )}
                      <span className="font-normal text-sm truncate">{note.title || 'Untitled Note'}</span>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="min-w-[120px] bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] border border-[hsl(var(--context-menu-border))] rounded-md p-1 animate-in fade-in-80">
                  <ContextMenuItem
                      onClick={() => onRemoveFavorite(note.id)}
                      className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]"
                    >
                      <Trash className="w-4 h-4 text-red-400" />
                      <span className="font-normal text-red-400">Remove</span>
                  </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          </div>

          {/* Horizontal line between Favourites and My Notes */}
          <div className="px-3 flex-shrink-0">
            <div className="border-t border-[hsl(var(--border))] w-full my-2" />
          </div>

          {/* My Notes Section - This is the key fix */}
          <div className="px-3 py-2 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <h3 className="text-xs font-normal text-[hsl(var(--sidebar-foreground))] px-3">My Notes</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-[hsl(var(--sidebar-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--sidebar-hover))]"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="right"
                  align="start"
                  className="w-44 ml-2 bg-[hsl(var(--sidebar-background))] text-xs border border-[hsl(var(--context-menu-border))] text-[hsl(var(--sidebar-foreground))]"
                >
                  <DropdownMenuItem
                    onClick={() => {
                      onCreateNote();
                    }}
                    className="flex items-center px-3 py-1.5 rounded-md text-sm w-full cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]"
                  >
                    <SquarePlus className="w-4 h-4 mr-2" />
                    New Note
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSingleNoteImportDialogOpen(true);
                    }}
                    className="flex items-center px-3 py-1.5 rounded-md text-sm w-full cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Import Note
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="space-y-1">
                {notes
                  .filter(note => !note.deleted && !note.archived)
                  .filter(note => {
                    // Filter by search query if search is active
                    if (isSearchActive && searchQuery) {
                      return note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             note.content?.toLowerCase().includes(searchQuery.toLowerCase());
                    }
                    return true;
                  })
                  .map((note) => (
                  <ContextMenu key={note.id}>
                    <ContextMenuTrigger asChild>
                      <div
                        className={`flex items-center space-x-3 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
                          selectedNote && note.id === selectedNote.id ? 'bg-[hsl(var(--sidebar-active))] text-[hsl(var(--foreground))]' : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onNoteSelect(note);
                          setActiveSection(`note-${note.id}`);
                        }}
                        onMouseEnter={() => setHoveredNote(note.id)}
                        onMouseLeave={() => setHoveredNote(null)}
                      >
                        <BookOpen className="w-4 h-4"/>
                        <span className="font-normal text-sm flex-1 truncate">{note.title || 'Untitled Note'}</span>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-44 bg-[hsl(var(--sidebar-background))] text-xs border border-[hsl(var(--context-menu-border))] text-[hsl(var(--sidebar-foreground))]">
                      <ContextMenuSub>
                        <ContextMenuSubTrigger className="flex items-center px-3 py-1.5 rounded-md text-sm w-full cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]">
                          <Upload className="w-4 h-4 mr-2" />
                          Export As
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent className="w-40 bg-[hsl(var(--sidebar-background))] border border-[hsl(var(--context-menu-border))] rounded-md p-1">
                          <ContextMenuItem
                            className="flex items-center px-3 py-1.5 rounded-md text-xs w-full cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]"
                            onClick={() => handleExportNotePdf(note)}
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            PDF
                          </ContextMenuItem>
                          <ContextMenuItem
                            className="flex items-center px-3 py-1.5 rounded-md text-xs w-full cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]"
                            onClick={() => handleExportNoteMarkdown(note)}
                          >
                            <FileCode2 className="w-4 h-4 mr-2" />
                            Markdown
                          </ContextMenuItem>
                          <ContextMenuItem
                            className="flex items-center px-3 py-1.5 rounded-md text-xs w-full cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]"
                            onClick={() => handleExportNoteDat(note)}
                          >
                            <Lock className="w-4 h-4 mr-2" />
                            Encrypted (.dat)
                          </ContextMenuItem>
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                      {/* Archive Item */}
                      <ContextMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onArchiveNote(note.id);
                        }}
                        className={`flex items-center px-3 py-1.5 rounded-md text-sm w-full cursor-pointer transition-colors
      ${theme === 'dark' ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-600 hover:text-yellow-700'} hover:bg-[hsl(var(--sidebar-hover)))`}
                      >
                        <Archive className={`w-4 h-4 mr-2 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
                        Archive
                      </ContextMenuItem>
                      {/* Trash Item */}
                      <ContextMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNote(note.id);
                        }}
                        className={`flex items-center px-3 py-1.5 rounded-md text-sm w-full cursor-pointer transition-colors
      ${theme === 'dark' ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'} hover:bg-[hsl(var(--sidebar-hover)))`}
                      >
                        <Trash className={`w-4 h-4 mr-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                        Trash
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>
            </div>
          </div>
        </div>
          {/* Confirm dialog for clear all data */}
          {confirmClearOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center border border-[hsl(var(--border))] relative">
                <div className="text-2xl font-bold mb-2 text-center">Delete all data?</div>
                <div className="text-sm text-muted-foreground mb-6 text-center">This will permanently delete all your notes and settings from this device. This action cannot be undone.<br/>To confirm, enter your master password.</div>
                <div className="flex flex-col w-full gap-3 mt-2">
                  <CustomPasswordInput
                    value={clearDataPassword}
                    onChange={setClearDataPassword}
                    placeholder="Enter master password to confirm"
                    disabled={clearDataLoading}
                    autoFocus
                  />
                  {clearDataError && <div className="text-red-500 text-xs text-center">{clearDataError}</div>}
                  <button
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow border border-[hsl(var(--border))] bg-background text-foreground hover:bg-muted transition disabled:opacity-60"
                    onClick={() => { setConfirmClearOpen(false); setClearDataPassword(''); setClearDataError(''); }}
                    disabled={clearDataLoading}
                  >
                    Cancel
                  </button>
                  <HoldToConfirmButton
                    onHoldComplete={handleClearAllData}
                   className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow text-red-600 hover:text-[hsl(var(--foreground))] hover:bg-muted transition disabled:opacity-60 bg-[hsl(var(--background))] border border-[hsl(var(--border))]"
                    disabled={!clearDataPassword || clearDataLoading}
                  >
                    {clearDataLoading ? (
                      <>
                        <svg className="mr-3 w-5 h-5 animate-spin" viewBox="0 0 24 24">
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="red"
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray="60"
                            strokeDashoffset="20"
                          />
                        </svg>
                        Deleting…
                      </>
                    ) : (
                      'Press & Hold to Delete'
                    )}
                  </HoldToConfirmButton>
                </div>
              </div>
            </div>
          )}
          {/* Export Dialog */}
          {exportDialogOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center border border-[hsl(var(--border))] relative">
                <div className="text-2xl font-bold mb-2 text-center">Export Notes</div>
                <div className="text-sm text-muted-foreground mb-6 text-center">Backup your notes securely or export as readable JSON.</div>
                <button
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-primary/90 transition disabled:opacity-60 mb-4
                    ${exportingType === 'dat' ? 'bg-indigo-500 text-white' : 'bg-foreground text-background'}`}
                  onClick={handleExportDat}
                  disabled={exportingType !== null}
                >
                  {exportingType === 'dat' ? (
                    <>
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
                      Exporting…
                    </>
                  ) : (
                    <>
                  <Lock className="w-5 h-5" />
                      Export Encrypted (.dat)
                    </>
                  )}
                </button>
                <div className="flex items-center w-full my-2">
                  <div className="flex-grow border-t border-border" />
                  <span className="mx-3 text-xs text-muted-foreground font-medium">or</span>
                  <div className="flex-grow border-t border-border" />
                </div>
                <div className="w-full flex flex-col gap-2 mb-6">
                  <CustomPasswordInput
                    value={exportJsonPassword}
                    onChange={setExportJsonPassword}
                    placeholder="Master password for JSON export"
                    disabled={exportingType !== null}
                    autoFocus
                  />
                </div>
                  <button
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-secondary/80 transition disabled:opacity-60
    ${exportingType === 'json' ? 'bg-indigo-500 text-white' : theme === 'dark' ? 'bg-foreground text-background' : 'bg-foreground text-background'}`}
                    onClick={handleExportJson}
                    disabled={!exportJsonPassword || exportingType !== null}
                  >
                    {exportingType === 'json' ? (
                      <>
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
                        Exporting…
                      </>
                    ) : (
                      <>
                  <LockOpen className="w-5 h-5" />
                        Export Decrypted (.json)
                      </>
                    )}
                  </button>
                  {exportJsonError && <div className="text-red-500 text-xs mt-1 text-center">{exportJsonError}</div>}
                <button className="mt-2 text-xs text-muted-foreground hover:underline" onClick={() => { setExportDialogOpen(false); resetExportDialog(); }} disabled={exportingType !== null}>Cancel</button>
              </div>
            </div>
          )}
          {/* Import Dialog */}
          {importDialogOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center border border-[hsl(var(--border))] relative">
                <div className="text-2xl font-bold mb-2 text-center">Import Notes</div>
                <div className="text-sm text-muted-foreground mb-6 text-center">Restore your notes from a backup file.</div>
                <input
                  type="file"
                  accept=".dat,.json"
                  className="w-full border rounded-lg px-3 py-2 text-base mb-2 bg-[hsl(var(--background))]"
                  onChange={e => setImportFile(e.target.files?.[0] || null)}
                  disabled={importLoading}
                />
                <div className="flex flex-col w-full gap-2 mb-6">
                <CustomPasswordInput
                  value={importPassword}
                  onChange={setImportPassword}
                  placeholder="Master password to decrypt"
                  disabled={importLoading}
                  autoFocus
                />
                </div>
                {importError && <div className="text-red-500 text-xs mb-2 text-center">{importError}</div>}
                <button
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-primary/90 transition disabled:opacity-60 mb-2
                    ${importLoading ? 'bg-indigo-500 text-white' : 'bg-foreground text-background'}`}
                  onClick={handleImportNotes}
                  disabled={!importFile || !importPassword || importLoading}
                >
                  {importLoading ? (
                    <>
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
                    </>
                  ) : (
                    <>
                  <Download className="w-5 h-5" />
                      Import Notes
                    </>
                  )}
                </button>
                <button className="mt-2 text-xs text-muted-foreground hover:underline" onClick={() => { setImportDialogOpen(false); resetImportDialog(); }} disabled={importLoading}>Cancel</button>
              </div>
            </div>
          )}
          {/* Full Backup Import Success Popup */}
          {showImportSuccess && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center border border-[hsl(var(--border))] relative">
                <div className="text-2xl font-bold mb-2 text-center">Notes imported successfully.</div>
                <div className="text-sm text-muted-foreground mb-6 text-center">Your notes have been restored from backup.</div>
                <button
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-primary/90 transition disabled:opacity-60 mb-2 bg-foreground text-background"
                  onClick={() => { setShowImportSuccess(false); window.location.reload(); }}
                >
                  OK
                </button>
              </div>
            </div>
          )}
          {/* Change Master Password Dialog */}
          {changePwDialogOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-card rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center border border-[hsl(var(--border))] relative text-card-foreground bg-background">
                <div className="text-xl font-bold mb-2 text-center">Change Master Password</div>
                <div className="text-sm text-muted-foreground mb-4 text-center">Enter your current password and choose a new one.</div>
                <div className="flex flex-col w-full gap-3 mb-2">
                  <CustomPasswordInput
                    value={currentPw}
                    onChange={setCurrentPw}
                    placeholder="Current password"
                    disabled={changePwLoading}
                    autoFocus
                  />
                  <CustomPasswordInput
                    value={newPw}
                    onChange={setNewPw}
                    placeholder="New password"
                    disabled={changePwLoading}
                  />
                  <CustomPasswordInput
                    value={confirmNewPw}
                    onChange={setConfirmNewPw}
                    placeholder="Confirm new password"
                    disabled={changePwLoading}
                  />
                </div>
                {changePwError && <div className="text-red-500 text-xs mb-1">{changePwError}</div>}
                <div className="flex flex-col w-full gap-2 mt-4">
                  <button
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-primary/90 transition disabled:opacity-60 ${changePwLoading ? 'bg-indigo-500 text-white' : 'bg-foreground text-[hsl(var(--background))]'}`}
                    onClick={handleChangePassword}
                    disabled={changePwLoading}
                  >
                    {changePwLoading ? (
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
                        Changing…
                      </span>
                    ) : (
                      'Change Password'
                    )}
                  </button>
                  <button className="mt-2 text-xs text-muted-foreground hover:underline" onClick={() => { setChangePwDialogOpen(false); resetChangePwDialog(); }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
          {/* Password Change Success Popup */}
          {showPwChangeSuccess && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center border border-[hsl(var(--border))] relative">
                <div className="text-2xl font-bold mb-2 text-center">Password Changed</div>
                <div className="text-sm text-muted-foreground mb-6 text-center">Your password has been changed successfully. Please re-login to continue.</div>
                <button
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-primary/90 transition disabled:opacity-60 mb-2 bg-foreground text-background"
                  onClick={() => {
                    setShowPwChangeSuccess(false);
                    sessionStorage.removeItem('masterPassword');
                    window.location.href = '/login';
                  }}
                >
                  Re-login
                </button>
              </div>
            </div>
          )}
          {/* Clear Data Success Popup */}
          {showClearDataSuccess && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center border border-[hsl(var(--border))] relative">
                <div className="text-2xl font-bold mb-2 text-center">All Data Deleted</div>
                <div className="text-sm text-muted-foreground mb-6 text-center">Your data has been deleted. Please create a new account or import an existing one if available.</div>
                <div className="text-base font-semibold text-center mb-4">Redirecting in {clearDataCountdown}…</div>
                <button
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-primary/90 transition disabled:opacity-60 mb-2 bg-foreground text-background"
                  onClick={() => { setShowClearDataSuccess(false); window.location.href = '/'; }}
                >
                  Go to Setup Now
                </button>
              </div>
            </div>
          )}
          {/* Single Note Import Dialog (for Notes > Plus > Import) */}
          {singleNoteImportDialogOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center border border-[hsl(var(--border))] relative">
                <div className="text-2xl font-bold mb-2 text-center">Import Note</div>
                <div className="text-sm text-muted-foreground mb-6 text-center">Import a single encrypted note (.dat file).</div>
                <input
                  type="file"
                  accept=".dat"
                  className="w-full border rounded-lg px-3 py-2 text-base mb-2 bg-[hsl(var(--background))]"
                  onChange={e => setSingleNoteImportFile(e.target.files?.[0] || null)}
                  disabled={singleNoteImportLoading}
                />
                <div className="flex flex-col w-full gap-2 mb-6">
                  <CustomPasswordInput
                    value={singleNoteImportPassword}
                    onChange={setSingleNoteImportPassword}
                    placeholder="Master password to decrypt"
                    disabled={singleNoteImportLoading}
                    autoFocus
                  />
                </div>
                {singleNoteImportError && <div className="text-red-500 text-xs mb-2 text-center">{singleNoteImportError}</div>}
                <button
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-primary/90 transition disabled:opacity-60 mb-2
                    ${singleNoteImportLoading ? 'bg-indigo-500 text-white' : 'bg-foreground text-background'}`}
                  onClick={handleSingleNoteImport}
                  disabled={!singleNoteImportFile || !singleNoteImportPassword || singleNoteImportLoading}
                >
                  {singleNoteImportLoading ? (
                    <>
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
                    </>
                  ) : (
                    <>
                  <Download className="w-5 h-5" />
                      Import Note
                    </>
                  )}
                </button>
                <button className="mt-2 text-xs text-muted-foreground hover:underline" onClick={() => { setSingleNoteImportDialogOpen(false); resetSingleNoteImportDialog(); }} disabled={singleNoteImportLoading}>Cancel</button>
              </div>
            </div>
          )}
          {/* Single Note Import Success Popup */}
          {showSingleNoteImportSuccess && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center border border-[hsl(var(--border))] relative">
                <div className="text-2xl font-bold mb-2 text-center">Note imported successfully.</div>
                <div className="text-sm text-muted-foreground mb-6 text-center">Your note has been added to your vault.</div>
                <button
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-primary/90 transition disabled:opacity-60 mb-2 bg-foreground text-background"
                  onClick={() => { setShowSingleNoteImportSuccess(false); window.location.reload(); }}
                >
                  OK
                </button>
              </div>
            </div>
          )}
          {/* Developer Options Popup */}
          {developerOptionsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center border border-[hsl(var(--border))] relative">
                <button
                  onClick={() => setDeveloperOptionsOpen(false)}
                  className="absolute top-4 right-4 p-1 hover:bg-muted rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="text-2xl font-bold mb-2 text-center">Preferences</div>
                <div className="text-sm text-muted-foreground mb-6 text-center">Customize your app experience, appearance, and security.</div>
                <div className="flex flex-col w-full gap-3 mt-2 overflow-visible" style={{ maxHeight: '18rem' }}>
                  {/* Reset UI State Button */}
                  <button
                    className="w-full px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-background text-foreground hover:bg-muted transition"
                    onClick={() => {
                      setTheme('system');
                      setSelectedFont('spacegrotesk');
                      localStorage.removeItem('appFontFamily');
                      localStorage.setItem('inactivityLockMinutes', 'off');
                      window.dispatchEvent(new Event('inactivityLockSettingChanged'));
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('sidebarCollapsed');
                      }
                      window.location.reload();
                    }}
                  >
                    Reset UI State
                  </button>
                  {/* Lock when inactive drawer */}
                  <div className="w-full relative">
                    {/* Drawer Content */}
                    <div
                      className={`absolute bottom-full left-0 right-0 transition-all duration-300 ease-out ${
                        inactivityDrawerOpen ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2 pointer-events-none'
                      }`}
                      style={{ marginBottom: '8px', zIndex: 100 }}
                    >
                      <div className="w-full bg-background rounded-xl border border-[hsl(var(--border))] shadow-lg overflow-hidden">
                        <div className="p-2 space-y-1">
                          {inactivityOptions.map(opt => (
                            <button
                              key={opt.value}
                              className={`w-full px-4 py-2.5 rounded-lg text-sm transition text-left ${
                                inactivityValue === opt.value
                                  ? 'bg-indigo-100 text-indigo-500 font-medium border border-indigo-300'
                                  : 'text-foreground hover:bg-muted'
                              }`}
                              onClick={() => {
                                localStorage.setItem('inactivityLockMinutes', opt.value);
                                window.dispatchEvent(new Event('inactivityLockSettingChanged'));
                                setInactivityDrawerOpen(false);
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Main Button */}
                    <button
                      className="w-full px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-background text-foreground hover:bg-muted transition flex items-center justify-between relative"
                      onClick={() => {
                        if (fontSelectorOpen) setFontSelectorOpen(false);
                        setInactivityDrawerOpen(v => !v);
                      }}
                      style={{ zIndex: 1 }}
                    >
                      <span>Lock when inactive</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {inactivityOptions.find(opt => opt.value === inactivityValue)?.label}
                        </span>
                        <div className={`transform transition-transform duration-300 ${inactivityDrawerOpen ? 'rotate-180' : ''}`}> 
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </button>
                  </div>
                  {/* Font Selector */}
                  <div className="w-full relative">
                    {/* Drawer Content */}
                    <div
                      className={`absolute bottom-full left-0 right-0 transition-all duration-300 ease-out ${
                        fontSelectorOpen ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2 pointer-events-none'
                      }`}
                      style={{ marginBottom: '8px', zIndex: 100 }}
                    >
                      <div className="w-full bg-background rounded-xl border border-[hsl(var(--border))] shadow-lg overflow-hidden">
                        <div className="p-2 space-y-1">
                          {["roboto", "inter", "arial", "spacegrotesk"].map((font) => (
                            <button
                              key={font}
                              className={`w-full px-4 py-2.5 rounded-lg text-sm transition text-left ${
                                selectedFont === font
                                  ? 'bg-indigo-100 text-indigo-500 font-medium border border-indigo-300'
                                  : 'text-foreground hover:bg-muted'
                              }`}
                              style={{ fontFamily: font }}
                              onClick={() => {
                                setSelectedFont(font);
                                setFontSelectorOpen(false);
                              }}
                            >
                              {font.charAt(0).toUpperCase() + font.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Main Button */}
                    <button
                      className="w-full px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-background text-foreground hover:bg-muted transition flex items-center justify-between relative"
                      onClick={() => {
                        if (inactivityDrawerOpen) setInactivityDrawerOpen(false);
                        setFontSelectorOpen(v => !v);
                      }}
                      style={{ zIndex: 1 }}
                    >
                      <span>Change Font</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {selectedFont.charAt(0).toUpperCase() + selectedFont.slice(1)}
                        </span>
                        <div className={`transform transition-transform duration-300 ${fontSelectorOpen ? 'rotate-180' : ''}`}> 
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
      </>
    ) : null;
  }

  return (
    <div 
      ref={sidebarRef} // <-- Attach ref to sidebar container
      className={`flex flex-col h-screen min-h-0 transition-all duration-200 ${collapsed ? 'w-0 min-w-0 overflow-hidden' : 'w-64 min-w-64'} bg-[hsl(var(--sidebar-background))] text-[hsl(var(--foreground))] border-r-[1.5px] border-r-[hsl(var(--sidebar-border))]`}
    >
      {/* Top Menu Section */}
      <div className="px-3 py-2">
        <div className="space-y-1">
          {/* New Note Button */}
          <div
            className={`flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] ${activeSection === 'new' ? 'bg-[hsl(var(--sidebar-active))]' : ''}`}
            onClick={() => { onCreateNote(); setActiveSection('new'); }}
          >
            <div className="flex items-center space-x-3">
              <SquarePlus className="w-4 h-4" />
              <span className="font-normal">New Note</span>
            </div>
          </div>
          {/* Search with Smooth Transition */}
          <div className="relative overflow-hidden">
            <div
              className={`flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] ${activeSection === 'search' ? 'bg-[hsl(var(--sidebar-active))]' : ''}`}
              onClick={!isSearchActive ? handleSearchClick : undefined}
            >
              <div className="flex items-center w-full relative">
                {/* Search Icon - Always Fixed */}
                <Search className="w-4 h-4 flex-shrink-0 z-20 relative" />
                
                {/* Container for sliding elements */}
                <div className="flex-1 ml-3 relative h-5 overflow-hidden">
                  {/* Search Label - Slides out to left */}
                  <span 
                    className={`font-normal absolute left-0 top-0 whitespace-nowrap transition-all duration-300 ease-in-out ${
                      isSearchActive 
                        ? 'transform -translate-x-full opacity-0' 
                        : 'transform translate-x-0 opacity-100'
                    }`}
                  >
                    Search
                  </span>
                  
                  {/* Search Input - Slides in from right */}
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`absolute left-0 top-0 w-full bg-transparent border-none outline-none text-[hsl(var(--sidebar-foreground))] placeholder-[hsl(var(--sidebar-foreground))] placeholder-opacity-60 transition-all duration-300 ease-in-out ${
                      isSearchActive 
                        ? 'transform translate-x-0 opacity-100 pointer-events-auto' 
                        : 'transform translate-x-full opacity-0 pointer-events-none'
                    }`}
                    placeholder="Search notes..."
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Archive Button (main menu) */}
          <div
            className={`flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] ${activeSection === 'archive' ? 'bg-[hsl(var(--sidebar-active))]' : ''}`}
            onClick={() => { onArchivedClick(); setActiveSection('archive'); }}
          >
            <div className="flex items-center space-x-3">
              <Archive className="w-4 h-4" />
              <span className="font-normal">Archive</span>
            </div>
            {archivedCount !== undefined && (
              <span className="text-xs text-[hsl(var(--sidebar-foreground))]">{archivedCount}</span>
            )}
          </div>
        </div>
      </div>

      {/* Folder Section */}
      <div className="px-3 py-2">
        <div className="space-y-1">
          {/* Settings Button with Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div
                className={`flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] ${activeSection === 'settings' ? 'bg-[hsl(var(--sidebar-active))]' : ''}`}
                onClick={() => setActiveSection('settings')}
              >
                <div className="flex items-center space-x-3">
                  <Settings className="w-4 h-4" />
                  <span className="font-normal">Settings</span>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={8} className="w-52 bg-[hsl(var(--sidebar-background))] border border-[hsl(var(--context-menu-border))]">
              {/* Appearance Section */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Appearance</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-50 bg-[hsl(var(--sidebar-background))] border border-[hsl(var(--context-menu-border))]">
                  <DropdownMenuRadioGroup
                    value={theme}
                    onValueChange={value => {
                      if (value === 'light' || value === 'dark' || value === 'system') {
                        setTheme(value);
                      }
                    }}
                  >
                    <DropdownMenuRadioItem value="light">
                      <Sun className="mr-2 h-4 w-4" />
                      Light
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">
                      <Moon className="mr-2 h-4 w-4" />
                      Dark
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system">
                      <Laptop className="mr-2 h-4 w-4" />
                      System
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              {/* Security & Privacy Section */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Security & Privacy</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 bg-[hsl(var(--sidebar-background))] border border-[hsl(var(--context-menu-border))]">
                  <DropdownMenuItem onClick={onLock}>
                    <Lock className="mr-2 h-4 w-4" />
                    Lock App
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setChangePwDialogOpen(true)}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Change master password
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className='border-t border-[hsl(var(--context-menu-border))]' />
                  <DropdownMenuItem variant="destructive" onClick={() => setConfirmClearOpen(true)}>
                    <Trash className="mr-2 h-4 w-4" />
                    Clear all data
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              {/* Advanced Section */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Advanced</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 bg-[hsl(var(--sidebar-background))] border border-[hsl(var(--context-menu-border))]">
                  <DropdownMenuItem onClick={() => setExportDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Export notes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                    <Download className="mr-2 h-4 w-4" />
                    Import notes
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings2 className="mr-2 h-4 w-4" />
                    <span onClick={() => setDeveloperOptionsOpen(true)} style={{ width: '100%' }}>Preferences</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              {/* About Section */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>About</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 bg-[hsl(var(--sidebar-background))] border border-[hsl(var(--context-menu-border))]">
                  <DropdownMenuItem>
                    <Info className="mr-2 h-4 w-4" />
                    App version
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Check for updates
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Mail className="mr-2 h-4 w-4" />
                    Contact support
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Scale className="mr-2 h-4 w-4" />
                    Open source licenses
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Trash Button (unchanged) */}
          <div
            className={`flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] ${activeSection === 'trash' ? 'bg-[hsl(var(--sidebar-active))]' : ''}`}
            onClick={() => { onDeletedClick(); setActiveSection('trash'); }}
          >
            <div className="flex items-center space-x-3">
              <Trash className="w-4 h-4" />
              <span className="font-normal">Trash</span>
            </div>
            {deletedCount !== undefined && (
              <span className="text-xs text-[hsl(var(--sidebar-foreground))]">{deletedCount}</span>
            )}
          </div>
        </div>
      </div>

      {/* Horizontal line between Folder and Favourites */}
      <div className="px-3">
        <div className="border-t border-[hsl(var(--border))] w-full my-2" />
      </div>

      {/* Favorites Section */}
      <div className="px-3 py-2">
        <div className="mb-2">
          <h3 className="text-xs font-normal text-[hsl(var(--sidebar-foreground))] px-3">Favourites</h3>
        </div>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {notes.filter(note => note.isFavorite).map((note) => (
            <ContextMenu key={note.id}>
              <ContextMenuTrigger asChild>
                <div
                  className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] ${activeSection === `favorite-${note.id}` ? 'bg-[hsl(var(--sidebar-active))]' : ''}`}
                  onClick={() => { onNoteSelect(note); setActiveSection(`favorite-${note.id}`); }}
                >
                  {note.favoriteEmoji ? (
                    <span className="text-lg">{note.favoriteEmoji}</span>
                  ) : (
                    <span className="text-sm favorite-icon">❤️</span>
                  )}
                  <span className="font-normal text-sm truncate">{note.title || 'Untitled Note'}</span>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="min-w-[120px] bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] border border-[hsl(var(--context-menu-border))] rounded-md p-1 animate-in fade-in-80">
              <ContextMenuItem
                  onClick={() => onRemoveFavorite(note.id)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]"
                >
                  <Trash className="w-4 h-4 text-red-400" />
                  <span className="font-normal text-red-400">Remove</span>
              </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
      </div>

      {/* Horizontal line between Favourites and My Notes */}
      <div className="px-3">
        <div className="border-t border-[hsl(var(--border))] w-full my-2" />
      </div>

      {/* My Notes Section */}
      <div className="px-3 py-2 flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-normal text-[hsl(var(--sidebar-foreground))] px-3">My Notes</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-[hsl(var(--sidebar-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--sidebar-hover))]"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="right"
              align="start"
              className="w-44 ml-2 bg-[hsl(var(--sidebar-background))] text-xs border border-[hsl(var(--context-menu-border))] text-[hsl(var(--sidebar-foreground))]"
            >
              <DropdownMenuItem
                onClick={() => {
                  onCreateNote();
                }}
                className="flex items-center px-3 py-1.5 rounded-md text-sm w-full cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]"
              >
                <SquarePlus className="w-4 h-4 mr-2" />
                New Note
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSingleNoteImportDialogOpen(true);
                }}
                className="flex items-center px-3 py-1.5 rounded-md text-sm w-full cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]"
              >
                <Download className="w-4 h-4 mr-2" />
                Import Note
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="space-y-1 flex-1 min-h-0 overflow-y-auto">
          {notes
            .filter(note => !note.deleted && !note.archived)
            .filter(note => {
              // Filter by search query if search is active
              if (isSearchActive && searchQuery) {
                return note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       note.content?.toLowerCase().includes(searchQuery.toLowerCase());
              }
              return true;
            })
            .map((note) => (
            <ContextMenu key={note.id}>
              <ContextMenuTrigger asChild>
                <div
                  className={`flex items-center space-x-3 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
                    selectedNote && note.id === selectedNote.id ? 'bg-[hsl(var(--sidebar-active))] text-[hsl(var(--foreground))]' : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNoteSelect(note);
                    setActiveSection(`note-${note.id}`);
                  }}
                  onMouseEnter={() => setHoveredNote(note.id)}
                  onMouseLeave={() => setHoveredNote(null)}
                >
                  <BookOpen className="w-4 h-4"/>
                  <span className="font-normal text-sm flex-1 truncate">{note.title || 'Untitled Note'}</span>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-44 bg-[hsl(var(--sidebar-background))] text-xs border border-[hsl(var(--context-menu-border))] text-[hsl(var(--sidebar-foreground))]">
                <ContextMenuSub>
                  <ContextMenuSubTrigger className="flex items-center px-3 py-1.5 rounded-md text-sm w-full cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]">
                    <Upload className="w-4 h-4 mr-2" />
                    Export As
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-40 bg-[hsl(var(--sidebar-background))] border border-[hsl(var(--context-menu-border))] rounded-md p-1">
                    <ContextMenuItem
                      className="flex items-center px-3 py-1.5 rounded-md text-xs w-full cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]"
                      onClick={() => handleExportNotePdf(note)}
                    >
                      <FileDown className="w-4 h-4 mr-2" />
                      PDF
                    </ContextMenuItem>
                    <ContextMenuItem
                      className="flex items-center px-3 py-1.5 rounded-md text-xs w-full cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]"
                      onClick={() => handleExportNoteMarkdown(note)}
                    >
                      <FileCode2 className="w-4 h-4 mr-2" />
                      Markdown
                    </ContextMenuItem>
                    <ContextMenuItem
                      className="flex items-center px-3 py-1.5 rounded-md text-xs w-full cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]"
                      onClick={() => handleExportNoteDat(note)}
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Encrypted (.dat)
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
                {/* Archive Item */}
                <ContextMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchiveNote(note.id);
                  }}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm w-full cursor-pointer transition-colors
    ${theme === 'dark' ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-600 hover:text-yellow-700'} hover:bg-[hsl(var(--sidebar-hover))}`}
                >
                  <Archive className={`w-4 h-4 mr-2 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
                  Archive
                </ContextMenuItem>
                {/* Trash Item */}
                <ContextMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNote(note.id);
                  }}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm w-full cursor-pointer transition-colors
    ${theme === 'dark' ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'} hover:bg-[hsl(var(--sidebar-hover))}`}
                >
                  <Trash className={`w-4 h-4 mr-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                  Trash
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
      </div>
      {/* Confirm dialog for clear all data */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center border border-[hsl(var(--border))] relative">
            <div className="text-2xl font-bold mb-2 text-center">Delete all data?</div>
            <div className="text-sm text-muted-foreground mb-6 text-center">This will permanently delete all your notes and settings from this device. This action cannot be undone.<br/>To confirm, enter your master password.</div>
            <div className="flex flex-col w-full gap-3 mt-2">
              <CustomPasswordInput
                value={clearDataPassword}
                onChange={setClearDataPassword}
                placeholder="Enter master password to confirm"
                disabled={clearDataLoading}
                autoFocus
              />
              {clearDataError && <div className="text-red-500 text-xs text-center">{clearDataError}</div>}
              <button
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow border border-[hsl(var(--border))] bg-background text-foreground hover:bg-muted transition disabled:opacity-60"
                onClick={() => { setConfirmClearOpen(false); setClearDataPassword(''); setClearDataError(''); }}
                disabled={clearDataLoading}
              >
                Cancel
              </button>
              <HoldToConfirmButton
                onHoldComplete={handleClearAllData}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow text-red-600 hover:text-[hsl(var(--foreground))] hover:bg-muted transition disabled:opacity-60 bg-[hsl(var(--background))] border border-[hsl(var(--border))]"
                disabled={!clearDataPassword || clearDataLoading}
              >
                {clearDataLoading ? (
                  <>
                    <svg className="mr-3 w-5 h-5 animate-spin" viewBox="0 0 24 24">
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="red"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray="60"
                        strokeDashoffset="20"
                      />
                    </svg>
                    Deleting…
                  </>
                ) : (
                  'Press & Hold to Delete'
                )}
              </HoldToConfirmButton>
            </div>
          </div>
        </div>
      )}
      {/* Export Dialog */}
      {exportDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center border border-[hsl(var(--border))] relative">
            <div className="text-2xl font-bold mb-2 text-center">Export Notes</div>
            <div className="text-sm text-muted-foreground mb-6 text-center">Backup your notes securely or export as readable JSON.</div>
            <button
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-primary/90 transition disabled:opacity-60 mb-4
                ${exportingType === 'dat' ? 'bg-indigo-500 text-white' : 'bg-foreground text-background'}`}
              onClick={handleExportDat}
              disabled={exportingType !== null}
            >
              {exportingType === 'dat' ? (
                <>
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
                  Exporting…
                </>
              ) : (
                <>
              <Lock className="w-5 h-5" />
                  Export Encrypted (.dat)
                </>
              )}
            </button>
            <div className="flex items-center w-full my-2">
              <div className="flex-grow border-t border-border" />
              <span className="mx-3 text-xs text-muted-foreground font-medium">or</span>
              <div className="flex-grow border-t border-border" />
            </div>
            <div className="w-full flex flex-col gap-2 mb-6">
              <CustomPasswordInput
                value={exportJsonPassword}
                onChange={setExportJsonPassword}
                placeholder="Master password for JSON export"
                disabled={exportingType !== null}
                autoFocus
              />
            </div>
              <button
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-secondary/80 transition disabled:opacity-60
    ${exportingType === 'json' ? 'bg-indigo-500 text-white' : theme === 'dark' ? 'bg-foreground text-background' : 'bg-foreground text-background'}`}
                onClick={handleExportJson}
                disabled={!exportJsonPassword || exportingType !== null}
              >
                {exportingType === 'json' ? (
                  <>
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
                    Exporting…
                  </>
                ) : (
                  <>
              <LockOpen className="w-5 h-5" />
                  Export Decrypted (.json)
                </>
                )}
              </button>
              {exportJsonError && <div className="text-red-500 text-xs mt-1 text-center">{exportJsonError}</div>}
            <button className="mt-2 text-xs text-muted-foreground hover:underline" onClick={() => { setExportDialogOpen(false); resetExportDialog(); }} disabled={exportingType !== null}>Cancel</button>
          </div>
        </div>
      )}
      {/* Import Dialog */}
      {importDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center border border-[hsl(var(--border))] relative">
            <div className="text-2xl font-bold mb-2 text-center">Import Notes</div>
            <div className="text-sm text-muted-foreground mb-6 text-center">Restore your notes from a backup file.</div>
            <input
              type="file"
              accept=".dat,.json"
              className="w-full border rounded-lg px-3 py-2 text-base mb-2 bg-[hsl(var(--background))]"
              onChange={e => setImportFile(e.target.files?.[0] || null)}
              disabled={importLoading}
            />
            <div className="flex flex-col w-full gap-2 mb-6">
            <CustomPasswordInput
              value={importPassword}
              onChange={setImportPassword}
              placeholder="Master password to decrypt"
              disabled={importLoading}
              autoFocus
            />
            </div>
            {importError && <div className="text-red-500 text-xs mb-2 text-center">{importError}</div>}
            <button
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-primary/90 transition disabled:opacity-60 mb-2
                ${importLoading ? 'bg-indigo-500 text-white' : 'bg-foreground text-background'}`}
              onClick={handleImportNotes}
              disabled={!importFile || !importPassword || importLoading}
            >
              {importLoading ? (
                <>
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
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Import Notes
                </>
              )}
            </button>
            <button className="mt-2 text-xs text-muted-foreground hover:underline" onClick={() => { setImportDialogOpen(false); resetImportDialog(); }} disabled={importLoading}>Cancel</button>
          </div>
        </div>
      )}
      {/* Full Backup Import Success Popup */}
      {showImportSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center border border-[hsl(var(--border))] relative">
            <div className="text-2xl font-bold mb-2 text-center">Notes imported successfully.</div>
            <div className="text-sm text-muted-foreground mb-6 text-center">Your notes have been restored from backup.</div>
            <button
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-primary/90 transition disabled:opacity-60 mb-2 bg-foreground text-background"
              onClick={() => { setShowImportSuccess(false); window.location.reload(); }}
            >
              OK
            </button>
          </div>
        </div>
      )}
      {/* Change Master Password Dialog */}
      {changePwDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center border border-[hsl(var(--border))] relative text-card-foreground bg-background">
            <div className="text-xl font-bold mb-2 text-center">Change Master Password</div>
            <div className="text-sm text-muted-foreground mb-4 text-center">Enter your current password and choose a new one.</div>
            <div className="flex flex-col w-full gap-3 mb-2">
              <CustomPasswordInput
                value={currentPw}
                onChange={setCurrentPw}
                placeholder="Current password"
                disabled={changePwLoading}
                autoFocus
              />
              <CustomPasswordInput
                value={newPw}
                onChange={setNewPw}
                placeholder="New password"
                disabled={changePwLoading}
              />
              <CustomPasswordInput
                value={confirmNewPw}
                onChange={setConfirmNewPw}
                placeholder="Confirm new password"
                disabled={changePwLoading}
              />
            </div>
            {changePwError && <div className="text-red-500 text-xs mb-1">{changePwError}</div>}
            <div className="flex flex-col w-full gap-2 mt-4">
              <button
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-primary/90 transition disabled:opacity-60 ${changePwLoading ? 'bg-indigo-500 text-white' : 'bg-foreground text-[hsl(var(--background))]'}`}
                onClick={handleChangePassword}
                disabled={changePwLoading}
              >
                {changePwLoading ? (
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
                    Changing…
                  </span>
                ) : (
                  'Change Password'
                )}
              </button>
              <button className="mt-2 text-xs text-muted-foreground hover:underline" onClick={() => { setChangePwDialogOpen(false); resetChangePwDialog(); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Password Change Success Popup */}
      {showPwChangeSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center border border-[hsl(var(--border))] relative">
            <div className="text-2xl font-bold mb-2 text-center">Password Changed</div>
            <div className="text-sm text-muted-foreground mb-6 text-center">Your password has been changed successfully. Please re-login to continue.</div>
            <button
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-primary/90 transition disabled:opacity-60 mb-2 bg-foreground text-background"
              onClick={() => {
                setShowPwChangeSuccess(false);
                sessionStorage.removeItem('masterPassword');
                window.location.href = '/login';
              }}
            >
              Re-login
            </button>
          </div>
        </div>
      )}
      {/* Clear Data Success Popup */}
      {showClearDataSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center border border-[hsl(var(--border))] relative">
            <div className="text-2xl font-bold mb-2 text-center">All Data Deleted</div>
            <div className="text-sm text-muted-foreground mb-6 text-center">Your data has been deleted. Please create a new account or import an existing one if available.</div>
            <div className="text-base font-semibold text-center mb-4">Redirecting in {clearDataCountdown}…</div>
            <button
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-primary/90 transition disabled:opacity-60 mb-2 bg-foreground text-background"
              onClick={() => { setShowClearDataSuccess(false); window.location.href = '/'; }}
            >
              Go to Setup Now
            </button>
          </div>
        </div>
      )}
      {/* Single Note Import Dialog (for Notes > Plus > Import) */}
      {singleNoteImportDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center border border-[hsl(var(--border))] relative">
            <div className="text-2xl font-bold mb-2 text-center">Import Note</div>
            <div className="text-sm text-muted-foreground mb-6 text-center">Import a single encrypted note (.dat file).</div>
            <input
              type="file"
              accept=".dat"
              className="w-full border rounded-lg px-3 py-2 text-base mb-2 bg-[hsl(var(--background))]"
              onChange={e => setSingleNoteImportFile(e.target.files?.[0] || null)}
              disabled={singleNoteImportLoading}
            />
            <div className="flex flex-col w-full gap-2 mb-6">
              <CustomPasswordInput
                value={singleNoteImportPassword}
                onChange={setSingleNoteImportPassword}
                placeholder="Master password to decrypt"
                disabled={singleNoteImportLoading}
                autoFocus
              />
            </div>
            {singleNoteImportError && <div className="text-red-500 text-xs mb-2 text-center">{singleNoteImportError}</div>}
            <button
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-primary/90 transition disabled:opacity-60 mb-2
                ${singleNoteImportLoading ? 'bg-indigo-500 text-white' : 'bg-foreground text-background'}`}
              onClick={handleSingleNoteImport}
              disabled={!singleNoteImportFile || !singleNoteImportPassword || singleNoteImportLoading}
            >
              {singleNoteImportLoading ? (
                <>
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
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Import Note
                </>
              )}
            </button>
            <button className="mt-2 text-xs text-muted-foreground hover:underline" onClick={() => { setSingleNoteImportDialogOpen(false); resetSingleNoteImportDialog(); }} disabled={singleNoteImportLoading}>Cancel</button>
          </div>
        </div>
      )}
      {/* Single Note Import Success Popup */}
      {showSingleNoteImportSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center border border-[hsl(var(--border))] relative">
            <div className="text-2xl font-bold mb-2 text-center">Note imported successfully.</div>
            <div className="text-sm text-muted-foreground mb-6 text-center">Your note has been added to your vault.</div>
            <button
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-primary/90 transition disabled:opacity-60 mb-2 bg-foreground text-background"
              onClick={() => { setShowSingleNoteImportSuccess(false); window.location.reload(); }}
            >
              OK
            </button>
          </div>
        </div>
      )}
      {/* Developer Options Popup */}
      {developerOptionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center border border-[hsl(var(--border))] relative">
            <button
              onClick={() => setDeveloperOptionsOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-muted rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-2xl font-bold mb-2 text-center">Preferences</div>
            <div className="text-sm text-muted-foreground mb-6 text-center">Customize your app experience, appearance, and security.</div>
            <div className="flex flex-col w-full gap-3 mt-2 overflow-visible" style={{ maxHeight: '18rem' }}>
              {/* Reset UI State Button */}
              <button
                className="w-full px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-background text-foreground hover:bg-muted transition"
                onClick={() => {
                  setTheme('system');
                  setSelectedFont('spacegrotesk');
                  localStorage.removeItem('appFontFamily');
                  localStorage.setItem('inactivityLockMinutes', 'off');
                  window.dispatchEvent(new Event('inactivityLockSettingChanged'));
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('sidebarCollapsed');
                  }
                  window.location.reload();
                }}
              >
                Reset UI State
              </button>
              {/* Lock when inactive drawer */}
              <div className="w-full relative">
                {/* Drawer Content */}
                <div
                  className={`absolute bottom-full left-0 right-0 transition-all duration-300 ease-out ${
                    inactivityDrawerOpen ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2 pointer-events-none'
                  }`}
                  style={{ marginBottom: '8px', zIndex: 100 }}
                >
                  <div className="w-full bg-background rounded-xl border border-[hsl(var(--border))] shadow-lg overflow-hidden">
                    <div className="p-2 space-y-1">
                      {inactivityOptions.map(opt => (
                        <button
                          key={opt.value}
                          className={`w-full px-4 py-2.5 rounded-lg text-sm transition text-left ${
                            inactivityValue === opt.value
                              ? 'bg-indigo-100 text-indigo-500 font-medium border border-indigo-300'
                              : 'text-foreground hover:bg-muted'
                          }`}
                          onClick={() => {
                            localStorage.setItem('inactivityLockMinutes', opt.value);
                            window.dispatchEvent(new Event('inactivityLockSettingChanged'));
                            setInactivityDrawerOpen(false);
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Main Button */}
                <button
                  className="w-full px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-background text-foreground hover:bg-muted transition flex items-center justify-between relative"
                  onClick={() => {
                    if (fontSelectorOpen) setFontSelectorOpen(false);
                    setInactivityDrawerOpen(v => !v);
                  }}
                  style={{ zIndex: 1 }}
                >
                  <span>Lock when inactive</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {inactivityOptions.find(opt => opt.value === inactivityValue)?.label}
                    </span>
                    <div className={`transform transition-transform duration-300 ${inactivityDrawerOpen ? 'rotate-180' : ''}`}> 
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              </div>
              {/* Font Selector */}
              <div className="w-full relative">
                {/* Drawer Content */}
                <div
                  className={`absolute bottom-full left-0 right-0 transition-all duration-300 ease-out ${
                    fontSelectorOpen ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2 pointer-events-none'
                  }`}
                  style={{ marginBottom: '8px', zIndex: 100 }}
                >
                  <div className="w-full bg-background rounded-xl border border-[hsl(var(--border))] shadow-lg overflow-hidden">
                    <div className="p-2 space-y-1">
                      {["roboto", "inter", "arial", "spacegrotesk"].map((font) => (
                        <button
                          key={font}
                          className={`w-full px-4 py-2.5 rounded-lg text-sm transition text-left ${
                            selectedFont === font
                              ? 'bg-indigo-100 text-indigo-500 font-medium border border-indigo-300'
                              : 'text-foreground hover:bg-muted'
                          }`}
                          style={{ fontFamily: font }}
                          onClick={() => {
                            setSelectedFont(font);
                            setFontSelectorOpen(false);
                          }}
                        >
                          {font.charAt(0).toUpperCase() + font.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Main Button */}
                <button
                  className="w-full px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-background text-foreground hover:bg-muted transition flex items-center justify-between relative"
                  onClick={() => {
                    if (inactivityDrawerOpen) setInactivityDrawerOpen(false);
                    setFontSelectorOpen(v => !v);
                  }}
                  style={{ zIndex: 1 }}
                >
                  <span>Change Font</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {selectedFont.charAt(0).toUpperCase() + selectedFont.slice(1)}
                    </span>
                    <div className={`transform transition-transform duration-300 ${fontSelectorOpen ? 'rotate-180' : ''}`}> 
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
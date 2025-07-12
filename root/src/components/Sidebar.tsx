import { useState, useRef, useEffect } from 'react';
import { Search, Plus, Trash, Settings, NotebookText, Archive, NotebookPen, Sun, Moon, Laptop, KeyRound, Upload, Download, Settings2, Info, RefreshCw, Mail, BookOpen, Lock, FileDown, Eye, EyeOff, LockOpen, X} from 'lucide-react';
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

  const getLocalEmojiPath = (filename: string) => filename || '';

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
    { icon: NotebookPen, label: 'New Note', active: false, onClick: onCreateNote },
  ];

  const handleClearAllData = async () => {
    setConfirmClearOpen(false);
    await clearDataFile();
    sessionStorage.removeItem('masterPassword');
    sessionStorage.removeItem('loggedIn');
    window.location.href = '/'; // reload to onboarding/FirstSetup
  };

  const handleExportDat = async () => {
    setExportingType('dat');
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
  };

  const handleExportJson = async () => {
    setExportingType('json');
    setExportJsonError('');
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
    try {
      const fileContent = await importFile.text();
      await importData(fileContent);
      await loadData(importPassword); // Will throw if password is wrong
      setImportDialogOpen(false);
      setImportFile(null);
      setImportPassword('');
      setTimeout(() => window.location.reload(), 500); // Reload to reflect imported notes
    } catch (e) {
      setImportError('Failed to import. Check your password or file.');
    } finally {
      setImportLoading(false);
    }
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

  return (
    <div 
      ref={sidebarRef} // <-- Attach ref to sidebar container
      className={`flex flex-col h-screen min-h-0 transition-all duration-200 ${collapsed ? 'w-0 overflow-hidden' : 'w-64'} overflow-hidden bg-[hsl(var(--sidebar-background))] text-[hsl(var(--foreground))] border-r-[1.5px] border-r-[hsl(var(--sidebar-border))]`}
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
              <NotebookPen className="w-4 h-4" />
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
          {/* Settings Button with Context Menu */}
          <ContextMenu>
            <ContextMenuTrigger asChild>
            <div
              className={`flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] ${activeSection === 'settings' ? 'bg-[hsl(var(--sidebar-active))]' : ''}`}
              onClick={() => setActiveSection('settings')}
            >
              <div className="flex items-center space-x-3">
                  <Settings className="w-4 h-4" />
                  <span className="font-normal">Settings</span>
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-52 bg-[hsl(var(--sidebar-background))] border border-[hsl(var(--context-menu-border))]">
              {/* Appearance Section */}
              <ContextMenuSub>
                <ContextMenuSubTrigger>Appearance</ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-50 bg-[hsl(var(--sidebar-background))] border border-[hsl(var(--context-menu-border))]">
                  <ContextMenuRadioGroup
                    value={theme}
                    onValueChange={value => {
                      if (value === 'light' || value === 'dark' || value === 'system') {
                        setTheme(value);
                      }
                    }}
                  >
                    <ContextMenuRadioItem value="light">
                      <Sun className="mr-2 h-4 w-4" />
                      Light
                    </ContextMenuRadioItem>
                    <ContextMenuRadioItem value="dark">
                      <Moon className="mr-2 h-4 w-4" />
                      Dark
                    </ContextMenuRadioItem>
                    <ContextMenuRadioItem value="system">
                      <Laptop className="mr-2 h-4 w-4" />
                      System
                    </ContextMenuRadioItem>
                  </ContextMenuRadioGroup>
                </ContextMenuSubContent>
              </ContextMenuSub>
              {/* Security & Privacy Section */}
              <ContextMenuSub>
                <ContextMenuSubTrigger>Security & Privacy</ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-56 bg-[hsl(var(--sidebar-background))] border border-[hsl(var(--context-menu-border))]">
                  <ContextMenuItem onClick={onLock}>
                    <Lock className="mr-2 h-4 w-4" />
                    Lock App
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => setChangePwDialogOpen(true)}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Change master password
                  </ContextMenuItem>
                  <ContextMenuSeparator className='border-t border-[hsl(var(--context-menu-border))]'/>
                  <ContextMenuItem variant="destructive" onClick={() => setConfirmClearOpen(true)}>
                    <Trash className="mr-2 h-4 w-4" />
                    Clear all data
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
              {/* Advanced Section */}
              <ContextMenuSub>
                <ContextMenuSubTrigger>Advanced</ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-56 bg-[hsl(var(--sidebar-background))] border border-[hsl(var(--context-menu-border))]">
                  <ContextMenuItem onClick={() => setExportDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Export notes
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => setImportDialogOpen(true)}>
                    <Download className="mr-2 h-4 w-4" />
                    Import notes
                  </ContextMenuItem>
                  <ContextMenuItem>
                    <Settings2 className="mr-2 h-4 w-4" />
                    Developer options
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
              {/* About Section */}
              <ContextMenuSub>
                <ContextMenuSubTrigger>About</ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-56 bg-[hsl(var(--sidebar-background))] border border-[hsl(var(--context-menu-border))]">
                  <ContextMenuItem>
                    <Info className="mr-2 h-4 w-4" />
                    App version
                  </ContextMenuItem>
                  <ContextMenuItem>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Check for updates
                  </ContextMenuItem>
                  <ContextMenuItem>
                    <Mail className="mr-2 h-4 w-4" />
                    Contact support
                  </ContextMenuItem>
                  <ContextMenuItem>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Open source licenses
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            </ContextMenuContent>
          </ContextMenu>
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
                  className={`flex items-center space-x-3 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] ${activeSection === `favorite-${note.id}` ? 'bg-[hsl(var(--sidebar-active))]' : ''}`}
                  onClick={() => { onNoteSelect(note); setActiveSection(`favorite-${note.id}`); }}
                >
                  {note.favoriteEmoji ? (
                    <img
                      src={getLocalEmojiPath(note.favoriteEmoji)}
                      alt="emoji"
                      className="w-5 h-5 favorite-icon"
                      style={{ display: 'inline' }}
                    />
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
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-[hsl(var(--sidebar-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--sidebar-hover))]"
            onClick={onCreateNote}
          >
            <Plus className="w-3 h-3" />
          </Button>
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
                  <NotebookText className="w-4 h-4"/>
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
                    <ContextMenuItem className="flex items-center px-3 py-1.5 rounded-md text-xs w-full cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]">
                      <FileDown className="w-4 h-4 mr-2" />
                      PDF
                    </ContextMenuItem>
                    <ContextMenuItem className="flex items-center px-3 py-1.5 rounded-md text-xs w-full cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]">
                      <Lock className="w-4 h-4 mr-2" />
                      Encrypted
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
                {/* Archive Item */}
                <ContextMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchiveNote(note.id);
                  }}
                  className="flex items-center px-3 py-1.5 rounded-md text-sm w-full cursor-pointer transition-colors text-yellow-500 hover:text-yellow-400 hover:bg-[hsl(var(--sidebar-hover))]"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </ContextMenuItem>
                {/* Trash Item */}
                <ContextMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNote(note.id);
                  }}
                  className="flex items-center px-3 py-1.5 rounded-md text-sm w-full cursor-pointer transition-colors text-red-400 hover:text-red-300 hover:bg-[hsl(var(--sidebar-hover))]"
                >
                  <Trash className="w-4 h-4 mr-2" />
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
            <div className="text-sm text-muted-foreground mb-6 text-center">This will permanently delete all your notes and settings from this device. This action cannot be undone.</div>
            <div className="flex flex-col w-full gap-3 mt-2">
              <button
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow border border-[hsl(var(--border))] bg-background text-foreground hover:bg-muted transition disabled:opacity-60"
                onClick={() => setConfirmClearOpen(false)}
              >
                Cancel
              </button>
              <button
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-red-700 transition disabled:opacity-60 bg-red-600 text-white"
                onClick={handleClearAllData}
              >
                Delete
              </button>
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
            <div className="w-full flex flex-col gap-2 mb-2">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full border rounded-lg px-3 py-2 text-base pr-10 focus:ring-2 focus:ring-primary focus:border-primary transition bg-[hsl(var(--background))]"
                  placeholder="Master password for JSON export"
                  value={exportJsonPassword}
                  onChange={e => setExportJsonPassword(e.target.value)}
                  disabled={exportingType !== null}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                  disabled={exportingType !== null}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
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
            </div>
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
              className="w-full border rounded-lg px-3 py-2 text-base mb-4 bg-[hsl(var(--background))]"
              onChange={e => setImportFile(e.target.files?.[0] || null)}
              disabled={importLoading}
            />
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2 text-base mb-2 bg-[hsl(var(--background))]"
              placeholder="Master password to decrypt"
              value={importPassword}
              onChange={e => setImportPassword(e.target.value)}
              disabled={importLoading}
              autoComplete="current-password"
            />
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
      {/* Change Master Password Dialog */}
      {changePwDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center border border-[hsl(var(--border))] relative">
            <div className="text-2xl font-bold mb-2 text-center">Change Master Password</div>
            <div className="text-sm text-muted-foreground mb-6 text-center">Update your master password to keep your notes secure.</div>
            <div className="w-full flex flex-col gap-4 mb-2">
              <div className="relative">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  className="w-full border rounded-lg px-3 py-2 text-base pr-10 focus:ring-2 focus:ring-primary focus:border-primary transition bg-[hsl(var(--background))]"
                  placeholder="Current password"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  disabled={changePwLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  onClick={() => setShowCurrentPw(v => !v)}
                  disabled={changePwLoading}
                  aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  className="w-full border rounded-lg px-3 py-2 text-base pr-10 focus:ring-2 focus:ring-primary focus:border-primary transition bg-[hsl(var(--background))]"
                  placeholder="New password"
                  value={newPw}
                  onChange={e => {
                    setNewPw(e.target.value);
                    if (e.target.value) setChangePwError(validatePassword(e.target.value));
                    else setChangePwError('');
                  }}
                  disabled={changePwLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  onClick={() => setShowNewPw(v => !v)}
                  disabled={changePwLoading}
                  aria-label={showNewPw ? 'Hide password' : 'Show password'}
                >
                  {showNewPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirmNewPw ? 'text' : 'password'}
                  className="w-full border rounded-lg px-3 py-2 text-base pr-10 focus:ring-2 focus:ring-primary focus:border-primary transition bg-[hsl(var(--background))]"
                  placeholder="Confirm new password"
                  value={confirmNewPw}
                  onChange={e => setConfirmNewPw(e.target.value)}
                  disabled={changePwLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  onClick={() => setShowConfirmNewPw(v => !v)}
                  disabled={changePwLoading}
                  aria-label={showConfirmNewPw ? 'Hide password' : 'Show password'}
                >
                  {showConfirmNewPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                {/* Show only one feedback message here */}
                {(newPw || confirmNewPw) && (
                  <div className={`text-xs mt-1 ${validatePassword(newPw) ? 'text-red-500' : 'text-green-600'}`}>{validatePassword(newPw) || 'Strong password!'}</div>
                )}
              </div>
              {changePwError && !validatePassword(newPw) && <div className="text-red-500 text-xs mt-1 text-center">{changePwError}</div>}
            </div>
            <button
              className={`w-full flex items-center justify-center mt-4 gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-primary/90 transition disabled:opacity-60 mb-2
                ${changePwLoading ? 'bg-indigo-500 text-white' : 'bg-foreground text-background'}`}
              onClick={handleChangePassword}
              disabled={changePwLoading}
            >
              {changePwLoading ? (
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
                  Changing…
                </>
              ) : (
                <>Change Password</>
              )}
            </button>
            <button className="mt-2 text-xs text-muted-foreground hover:underline" onClick={() => { setChangePwDialogOpen(false); resetChangePwDialog(); }} disabled={changePwLoading}>Cancel</button>
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
    </div>
  );
};
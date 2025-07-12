import { useState, useRef, useEffect } from 'react';
import { Search, Plus, Trash2, Settings, NotebookText, Archive, NotebookPen, Sun, Moon, Laptop, Lock, KeyRound, Upload, Download, Settings2, Info, RefreshCw, Mail, BookOpen, FileLock, FileDown} from 'lucide-react';
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
}: SidebarProps) => {
  const [, setHoveredNote] = useState<string | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null); // <-- Add ref for sidebar

  const getLocalEmojiPath = (filename: string) => filename || '';

  // Handle search activation
  const handleSearchClick = () => {
    setIsSearchActive(true);
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

  return (
    <div 
      ref={sidebarRef} // <-- Attach ref to sidebar container
      className={`flex flex-col h-screen min-h-0 transition-all duration-200 ${collapsed ? 'w-0 overflow-hidden' : 'w-64'} overflow-hidden bg-[hsl(var(--sidebar-background))] text-[hsl(var(--foreground))] border-r-[1.5px] border-r-[hsl(var(--sidebar-border))]`}
    >
      {/* Top Menu Section */}
      <div className="px-3 py-2">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]"
              onClick={item.onClick}
            >
              <div className="flex items-center space-x-3">
                <item.icon className="w-4 h-4" />
                <span className="font-normal">{item.label}</span>
              </div>
            </div>
          ))}

          {/* Search with Smooth Transition */}
          <div className="relative overflow-hidden">
            <div
              className="flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]"
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
            className="flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]"
            onClick={onArchivedClick}
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
              className="flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]"
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
                  <ContextMenuItem>
                    <Lock className="mr-2 h-4 w-4" />
                    Lock App
                  </ContextMenuItem>
                  <ContextMenuItem>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Change master password
                  </ContextMenuItem>
                  <ContextMenuSeparator className='border-t border-[hsl(var(--context-menu-border))]'/>
                  <ContextMenuItem variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear all data
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
              {/* Advanced Section */}
              <ContextMenuSub>
                <ContextMenuSubTrigger>Advanced</ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-56 bg-[hsl(var(--sidebar-background))] border border-[hsl(var(--context-menu-border))]">
                  <ContextMenuItem>
                    <Upload className="mr-2 h-4 w-4" />
                    Export notes
                  </ContextMenuItem>
                  <ContextMenuItem>
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
            className="flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]"
            onClick={onDeletedClick}
          >
            <div className="flex items-center space-x-3">
              <Trash2 className="w-4 h-4" />
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
                  className="flex items-center space-x-3 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]"
                  onClick={() => onNoteSelect(note)}
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
                  <Trash2 className="w-4 h-4 text-red-400" />
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
                    selectedNote && note.id === selectedNote.id ? 'bg-gray-700 text-[hsl(var(--foreground))]' : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNoteSelect(note);
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
                      <FileLock className="w-4 h-4 mr-2" />
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
                  <Trash2 className="w-4 h-4 mr-2" />
                  Trash
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
      </div>
    </div>
  );
};
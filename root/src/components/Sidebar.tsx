import { useState, useRef, useEffect } from 'react';
import { Search, Plus, Trash2, Edit, Settings, HelpCircle, Circle, FileText, FolderOpen, Archive, Hash, Star, BookDashed, NotebookPen } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import type { Note, Category } from '../pages/Index';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuCheckboxItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem
} from './ui/context-menu';

interface SidebarProps {
  notes: Note[];
  categories: Category[];
  selectedNote: Note | null;
  selectedCategory: string;
  collapsed: boolean;
  isDark: boolean;
  onNoteSelect: (note: Note) => void;
  onCategorySelect: (category: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (noteId: string) => void;
  onRestoreNote: (noteId: string) => void;
  onDeletePermanently: (noteId: string) => void;
  onToggleCollapse: () => void;
  onRemoveFavorite: (noteId: string) => void;
  onDeletedClick: () => void;
  deletedCount: number;
}

export const Sidebar = ({
  notes,
  categories,
  selectedNote,
  selectedCategory,
  collapsed,
  isDark,
  onNoteSelect,
  onCategorySelect,
  onCreateNote,
  onDeleteNote,
  onRestoreNote,
  onDeletePermanently,
  onToggleCollapse,
  onRemoveFavorite,
  onDeletedClick,
  deletedCount
}: SidebarProps) => {
  const [hoveredNote, setHoveredNote] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const truncateContent = (content: string, maxLength: number = 40) => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  const menuItems = [
    { icon: NotebookPen, label: 'New Note', active: false },
    { icon: Search, label: 'Search', active: false },
    { icon: BookDashed, label: 'Drafts', active: false },
  ];

  const folderItems = [
    { icon: Settings, label: 'Settings', count: undefined, active: false },
    { icon: Trash2, label: 'Trash', count: deletedCount, active: false, onClick: onDeletedClick },
  ];

  // Remove any useEffect or event listeners related to keyboard shortcuts

  return (
    <div 
      className={`flex flex-col h-screen min-h-0 transition-all duration-200 ${
        collapsed ? 'w-0 overflow-hidden' : 'w-64'
      } overflow-hidden`}
      style={{ backgroundColor: '#262626' }}
    >
      {/* Top Menu Section */}
      <div className="px-3 py-2">
        <div className="space-y-1">
          {menuItems.map((item, index) => (
            <div
              key={item.label}
              className="flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-gray-300 hover:bg-gray-700"
              onClick={index === 0 ? onCreateNote : undefined}
            >
              <div className="flex items-center space-x-3">
                <item.icon className="w-4 h-4" />
                <span className="font-normal">{item.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Folder Section */}
      <div className="px-3 py-2">
        <div className="space-y-1">
          {/* Settings Button with Context Menu */}
          <ContextMenu>
            <ContextMenuTrigger asChild>
            <div
              className="flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-gray-300 hover:bg-gray-700"
            >
              <div className="flex items-center space-x-3">
                  <Settings className="w-4 h-4" />
                  <span className="font-normal">Settings</span>
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-64">
              {/* Appearance Section */}
              <ContextMenuSub>
                <ContextMenuSubTrigger inset>Appearance</ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-56">
                  <ContextMenuRadioGroup value="system">
                    <ContextMenuItem inset disabled>Theme</ContextMenuItem>
                    <ContextMenuRadioItem value="light">Light</ContextMenuRadioItem>
                    <ContextMenuRadioItem value="dark">Dark</ContextMenuRadioItem>
                    <ContextMenuRadioItem value="system">System</ContextMenuRadioItem>
                  </ContextMenuRadioGroup>
                  <ContextMenuSeparator />
                  <ContextMenuRadioGroup value="medium">
                    <ContextMenuItem inset disabled>Font size</ContextMenuItem>
                    <ContextMenuRadioItem value="small">Small</ContextMenuRadioItem>
                    <ContextMenuRadioItem value="medium">Medium</ContextMenuRadioItem>
                    <ContextMenuRadioItem value="large">Large</ContextMenuRadioItem>
                  </ContextMenuRadioGroup>
                  <ContextMenuSeparator />
                  <ContextMenuRadioGroup value="left">
                    <ContextMenuItem inset disabled>Sidebar position</ContextMenuItem>
                    <ContextMenuRadioItem value="left">Left</ContextMenuRadioItem>
                    <ContextMenuRadioItem value="right">Right</ContextMenuRadioItem>
                  </ContextMenuRadioGroup>
                  <ContextMenuSeparator />
                  <ContextMenuItem inset disabled>Accent color</ContextMenuItem>
                  <ContextMenuItem>Blue</ContextMenuItem>
                  <ContextMenuItem>Green</ContextMenuItem>
                  <ContextMenuItem>Purple</ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
              {/* Editor Preferences Section */}
              <ContextMenuSub>
                <ContextMenuSubTrigger inset>Editor Preferences</ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-56">
                  <ContextMenuItem inset disabled>Default font</ContextMenuItem>
                  <ContextMenuItem>Sans</ContextMenuItem>
                  <ContextMenuItem>Serif</ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuCheckboxItem checked>Auto-save</ContextMenuCheckboxItem>
                  <ContextMenuItem inset disabled>Auto-save interval</ContextMenuItem>
                  <ContextMenuItem>1 min</ContextMenuItem>
                  <ContextMenuItem>5 min</ContextMenuItem>
                  <ContextMenuItem>10 min</ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuCheckboxItem checked>Spell check</ContextMenuCheckboxItem>
                  <ContextMenuCheckboxItem>Markdown support</ContextMenuCheckboxItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
              {/* Notes Management Section */}
              <ContextMenuSub>
                <ContextMenuSubTrigger inset>Notes Management</ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-56">
                  <ContextMenuItem inset disabled>Default save location</ContextMenuItem>
                  <ContextMenuItem>Local</ContextMenuItem>
                  <ContextMenuItem>Cloud</ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem inset disabled>Deleted notes retention</ContextMenuItem>
                  <ContextMenuItem>7 days</ContextMenuItem>
                  <ContextMenuItem>30 days</ContextMenuItem>
                  <ContextMenuItem>Forever</ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem>Backup & Restore</ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
              {/* Notifications Section */}
              <ContextMenuSub>
                <ContextMenuSubTrigger inset>Notifications</ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-56">
                  <ContextMenuCheckboxItem>Enable desktop notifications</ContextMenuCheckboxItem>
                  <ContextMenuCheckboxItem>Sound</ContextMenuCheckboxItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
              {/* Security & Privacy Section */}
              <ContextMenuSub>
                <ContextMenuSubTrigger inset>Security & Privacy</ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-56">
                  <ContextMenuCheckboxItem>App lock</ContextMenuCheckboxItem>
                  <ContextMenuCheckboxItem>Data encryption</ContextMenuCheckboxItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem variant="destructive">Clear all data</ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
              {/* Sync & Cloud Section */}
              <ContextMenuSub>
                <ContextMenuSubTrigger inset>Sync & Cloud</ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-56">
                  <ContextMenuCheckboxItem>Sync with cloud</ContextMenuCheckboxItem>
                  <ContextMenuItem>Account management</ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
              {/* Advanced Section */}
              <ContextMenuSub>
                <ContextMenuSubTrigger inset>Advanced</ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-56">
                  <ContextMenuItem>Export notes</ContextMenuItem>
                  <ContextMenuItem>Import notes</ContextMenuItem>
                  <ContextMenuItem>Developer options</ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
              {/* About Section */}
              <ContextMenuSub>
                <ContextMenuSubTrigger inset>About</ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-56">
                  <ContextMenuItem>App version</ContextMenuItem>
                  <ContextMenuItem>Check for updates</ContextMenuItem>
                  <ContextMenuItem>Contact support</ContextMenuItem>
                  <ContextMenuItem>Open source licenses</ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            </ContextMenuContent>
          </ContextMenu>
          {/* Trash Button (unchanged) */}
          <div
            className="flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-gray-300 hover:bg-gray-700"
            onClick={onDeletedClick}
          >
            <div className="flex items-center space-x-3">
              <Trash2 className="w-4 h-4" />
              <span className="font-normal">Trash</span>
            </div>
            {deletedCount !== undefined && (
              <span className="text-xs text-gray-500">{deletedCount}</span>
            )}
          </div>
        </div>
      </div>

      {/* Horizontal line between Folder and Favourites */}
      <div className="px-3">
        <div className="border-t border-gray-600 w-full my-2" />
      </div>

      {/* Favorites Section */}
      <div className="px-3 py-2">
        <div className="mb-2">
          <h3 className="text-xs font-normal text-gray-500 px-3">Favourites</h3>
        </div>
        <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
          {notes.filter(note => note.isFavorite).map((note, index) => (
            <ContextMenu key={note.id}>
              <ContextMenuTrigger asChild>
                <div
                  className="flex items-center space-x-3 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-gray-300 hover:bg-gray-700"
                  onClick={() => onNoteSelect(note)}
                >
                  {note.favoriteEmoji ? (
                    <img
                      src={`https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${note.favoriteEmoji}.svg`}
                      alt="emoji"
                      className="w-4 h-4 favorite-icon"
                      style={{ display: 'inline' }}
                    />
                  ) : (
                    <span className="text-sm favorite-icon">❤️</span>
                  )}
                  <span className="font-normal text-sm truncate">{note.title || 'Untitled Note'}</span>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="min-w-[120px] bg-[#232323] border border-gray-700 rounded-md p-1 animate-in fade-in-80">
                <ContextMenuItem
                  className="text-red-500 hover:bg-gray-700 hover:text-red-400 cursor-pointer rounded px-2 py-1.5 transition-colors"
                  onClick={() => onRemoveFavorite(note.id)}
                >
                  Remove
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
      </div>

      {/* Horizontal line between Favourites and My Notes */}
      <div className="px-3">
        <div className="border-t border-gray-600 w-full my-2" />
      </div>

      {/* My Notes Section */}
      <div className="px-3 py-2 flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-normal text-gray-500 px-3">My Notes</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-gray-500 hover:text-white hover:bg-gray-700"
            onClick={onCreateNote}
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
        <div className="space-y-1 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {notes.filter(note => !note.deleted).map((note, index) => (
            <ContextMenu key={note.id}>
              <ContextMenuTrigger asChild>
                <div
                  className={`flex items-center space-x-3 px-3 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                    selectedNote && note.id === selectedNote.id ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                  onClick={() => onNoteSelect(note)}
                  onMouseEnter={() => setHoveredNote(note.id)}
                  onMouseLeave={() => setHoveredNote(null)}
                >
                  <FileText className="w-3 h-3 note-icon text-gray-400" style={{ shapeRendering: 'geometricPrecision' }} />
                  <span className="font-normal text-xs flex-1 truncate">{note.title || 'Untitled Note'}</span>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-40 bg-[#23272a] border border-gray-700 rounded-sm text-xs text-white shadow-xl p-0">
                <ContextMenuSub>
                  <ContextMenuSubTrigger className="text-white hover:bg-[#36393f] focus:bg-[#36393f] px-2 py-1 rounded-sm font-normal">Export As</ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-40 bg-[#23272a] border border-gray-700 rounded-sm text-xs text-white shadow-xl p-0">
                    <ContextMenuItem className="hover:bg-[#36393f] focus:bg-[#36393f] px-2 py-1 rounded-sm font-semibold">PDF</ContextMenuItem>
                    <ContextMenuItem className="hover:bg-[#36393f] focus:bg-[#36393f] px-2 py-1 rounded-sm font-semibold">Encrypted</ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
                <ContextMenuItem
                  className="text-red-400 opacity-80 hover:opacity-100 hover:text-red-300 font-medium px-2 py-1 rounded-sm"
                  onClick={() => onDeleteNote(note.id)}
                >
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
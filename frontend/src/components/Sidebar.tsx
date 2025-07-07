import { useState } from 'react';
import { Search, Plus, Trash2, Edit, Settings, HelpCircle, Circle, FileText, FolderOpen, Archive, Hash, Star, BookDashed, NotebookPen } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import type { Note, Category } from '../pages/Index';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem
} from './ui/context-menu';

interface SidebarProps {
  notes: Note[];
  categories: Category[];
  selectedNote: Note | null;
  selectedCategory: string;
  searchQuery: string;
  collapsed: boolean;
  isDark: boolean;
  onNoteSelect: (note: Note) => void;
  onCategorySelect: (category: string) => void;
  onSearch: (query: string) => void;
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
  searchQuery,
  collapsed,
  isDark,
  onNoteSelect,
  onCategorySelect,
  onSearch,
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
    { icon: NotebookPen, label: 'New Note', shortcut: 'Ctrl + N', active: false },
    { icon: Search, label: 'Search', shortcut: 'Ctrl + K', active: false },
    { icon: BookDashed, label: 'Drafts', shortcut: 'Ctrl + D', active: false },
  ];

  const folderItems = [
    { icon: Settings, label: 'Settings', count: undefined, active: false, shortcut: 'Ctrl + ,' },
    { icon: Trash2, label: 'Trash', count: deletedCount, active: false, onClick: onDeletedClick },
  ];

  return (
    <div 
      className={`flex flex-col h-screen transition-all duration-200 ${
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
              <span className="text-xs text-gray-500">{item.shortcut}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Folder Section */}
      <div className="px-3 py-2">
        <div className="space-y-1">
          {folderItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-gray-300 hover:bg-gray-700"
              onClick={item.onClick}
            >
              <div className="flex items-center space-x-3">
                <item.icon className="w-4 h-4" />
                <span className="font-normal">{item.label}</span>
              </div>
              {item.shortcut && (
                <span className="text-xs text-gray-500">{item.shortcut}</span>
              )}
              {item.count !== undefined && !item.shortcut && (
                <span className="text-xs text-gray-500">{item.count}</span>
              )}
            </div>
          ))}
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
                      className="w-4 h-4"
                      style={{ display: 'inline' }}
                    />
                  ) : (
                    <span className="text-sm">❤️</span>
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
      <div className="px-3 py-2 flex-1 overflow-hidden">
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
        <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
          {notes.filter(note => !note.deleted).map((note, index) => (
            <div
              key={note.id}
              className={`flex items-center space-x-3 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
                selectedNote && note.id === selectedNote.id ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
              onClick={() => onNoteSelect(note)}
              onMouseEnter={() => setHoveredNote(note.id)}
              onMouseLeave={() => setHoveredNote(null)}
            >
              <FileText className="w-3 h-3 text-gray-400" />
              <span className="font-normal text-sm flex-1 truncate">{note.title || 'Untitled Note'}</span>
              {hoveredNote === note.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-red-500 hover:bg-gray-700 border-none w-5 h-5 p-0"
                  onClick={e => { e.stopPropagation(); onDeleteNote(note.id); }}
                  aria-label="Delete Note"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
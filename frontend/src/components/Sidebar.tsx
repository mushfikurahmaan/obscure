import { useState } from 'react';
import { Search, Plus, Trash2, Edit, Settings, HelpCircle, Circle, FileText, FolderOpen, Archive, Hash, Star } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import type { Note, Category } from '../pages/Index';

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
  onToggleCollapse: () => void;
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
  onToggleCollapse
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
    { icon: FileText, label: 'New Note', shortcut: '⌘N', active: false },
    { icon: Search, label: 'Search', shortcut: '⌘S', active: false },
    { icon: FolderOpen, label: 'Recent', shortcut: '⌘R', active: false }
  ];

  const folderItems = [
    { icon: FileText, label: 'Drafts', count: 3, active: false },
    { icon: Trash2, label: 'Deleted', count: 12, active: false }
  ];

  const favoriteItems = [
    { emoji: '🎨', label: 'How to work with Design systems', active: false },
    { emoji: '📝', label: 'Typography Chapter 1 Lesson 3', active: false },
    { emoji: '⚡', label: 'Technical task for UX Designer.', active: false }
  ];

  const noteItems = [
    { 
      icon: FileText, 
      label: 'Equal. Product Design Agency', 
      active: true,
      subitems: [
        { label: 'Estimate. OlderVoid team' },
        { 
          label: 'UX audit & Nav Architecture',
          subitems: [
            { label: 'UX audit', active: false },
            { label: 'The Essentials of Navi...', active: true }
          ]
        }
      ]
    },
    { icon: FileText, label: 'Dribbble shots', active: false },
    { icon: FileText, label: 'Personal stuff', active: false },
    { icon: FileText, label: 'Design inspiration', active: false },
    { icon: FileText, label: 'Something to read', active: false },
    { icon: FileText, label: 'Draft', active: false }
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
            >
              <div className="flex items-center space-x-3">
                <item.icon className="w-4 h-4" />
                <span className="font-normal">{item.label}</span>
              </div>
              <span className="text-xs text-gray-500">{item.count}</span>
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
          {[
            ...favoriteItems,
            { emoji: '📚', label: 'Reading List', active: false },
            { emoji: '🎵', label: 'Music Notes', active: false },
            { emoji: '🧠', label: 'Brainstorm Ideas', active: false },
            { emoji: '🌟', label: 'Starred Note', active: false },
            { emoji: '💡', label: 'Inspiration', active: false },
            { emoji: '📅', label: 'Meeting Notes', active: false },
            { emoji: '🛠️', label: 'Project Tasks', active: false },
            { emoji: '🍔', label: 'Recipe Ideas', active: false }
          ].map((item, index) => (
            <div
              key={index}
              className="flex items-center space-x-3 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-gray-300 hover:bg-gray-700"
            >
              <span className="text-sm">{item.emoji}</span>
              <span className="font-normal text-sm truncate">{item.label}</span>
            </div>
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
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
        <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
          {[
            ...noteItems,
            { icon: FileText, label: 'UX Research', active: false },
            { icon: FileText, label: 'Meeting Minutes', active: false },
            { icon: FileText, label: 'Client Feedback', active: false },
            { icon: FileText, label: 'Wireframes', active: false },
            { icon: FileText, label: 'Sprint Planning', active: false },
            { icon: FileText, label: 'Release Notes', active: false },
            { icon: FileText, label: 'Bug Reports', active: false },
            { icon: FileText, label: 'Feature Requests', active: false },
            { icon: FileText, label: 'Personal Journal', active: false },
            { icon: FileText, label: 'Travel Plans', active: false },
            { icon: FileText, label: 'Shopping List', active: false }
          ].map((item, index) => (
            <div
              key={index}
              className={`flex items-center space-x-3 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
                item.active ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <item.icon className="w-3 h-3 text-gray-400" />
              <span className="font-normal text-sm flex-1 truncate">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="px-3 py-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-3 px-3 py-1.5 rounded-md text-sm cursor-pointer text-gray-300 hover:bg-gray-700 transition-colors">
            <Settings className="w-4 h-4" />
            <span className="font-normal">Settings</span>
          </div>
          <div className="flex items-center space-x-3 px-3 py-1.5 rounded-md text-sm cursor-pointer text-gray-300 hover:bg-gray-700 transition-colors">
            <HelpCircle className="w-4 h-4" />
            <span className="font-normal">Help & Support</span>
          </div>
        </div>
      </div>
    </div>
  );
};
import { useState, useEffect, useRef } from 'react';
import {Plus, Edit, Heart, Loader2 } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { NoteEditor } from '../components/NoteEditor';
import { SearchResults } from '../components/SearchResults';
import { Button } from '../components/ui/button';

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  count: number;
}

const Index = () => {
  const [isDark, setIsDark] = useState(true);

  const [notes, setNotes] = useState<Note[]>([]);

  const [categories] = useState<Category[]>([
    { id: '1', name: 'Design Thinking', color: 'bg-white', count: 2 },
    { id: '2', name: 'Personal', color: 'bg-white', count: 1 },
    { id: '3', name: 'Work', color: 'bg-white', count: 0 },
    { id: '4', name: 'Projects', color: 'bg-white', count: 0 },
    { id: '5', name: 'Books', color: 'bg-white', count: 0 }
  ]);

  const [selectedNote, setSelectedNote] = useState<Note | null>(notes[0]);
  const [editorTitle, setEditorTitle] = useState(selectedNote ? selectedNote.title : '');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);

  const mainContentRef = useRef<HTMLDivElement>(null);

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleCreateNote = () => {
    // Check for an existing blank note (title and content both empty)
    const existingBlank = notes.find(note => !note.title && !note.content);
    if (existingBlank) {
      setSelectedNote(existingBlank);
      return;
    }
    const newNote: Note = {
      id: Date.now().toString(),
      title: '',
      content: '',
      category: 'Personal',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setNotes([newNote, ...notes]);
    setSelectedNote(newNote);
  };

  const handleUpdateNote = (updatedNote: Note) => {
    setNotes(notes.map(note => 
      note.id === updatedNote.id ? { ...updatedNote, updatedAt: new Date() } : note
    ));
    setSelectedNote(updatedNote);
  };

  const handleTitleChange = (title: string) => {
    setEditorTitle(title);
    if (!selectedNote) return;
    const updatedNote = { ...selectedNote, title };
    setNotes(notes.map(note => 
      note.id === updatedNote.id ? updatedNote : note
    ));
    setSelectedNote(updatedNote);
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes(notes.filter(note => note.id !== noteId));
    if (selectedNote?.id === noteId) {
      setSelectedNote(notes.length > 1 ? notes.find(n => n.id !== noteId) || null : null);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsSearching(query.length > 0);
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: '#1c1c1c' }}>
      {/* Sidebar */}
      <Sidebar
        notes={filteredNotes}
        categories={categories}
        selectedNote={selectedNote}
        selectedCategory={selectedCategory}
        searchQuery={searchQuery}
        collapsed={sidebarCollapsed}
        isDark={isDark}
        onNoteSelect={setSelectedNote}
        onCategorySelect={setSelectedCategory}
        onSearch={handleSearch}
        onCreateNote={handleCreateNote}
        onDeleteNote={handleDeleteNote}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top tabs bar */}
        <div className="flex items-center px-6 py-2 justify-between" style={{ backgroundColor: '#1c1c1c' }}>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="mr-3 text-gray-400 hover:text-white hover:bg-gray-700 border-none w-7 h-7"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {/* Hamburger icon for expand/collapse */}
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
            <span
              className="flex items-center px-4 py-1 rounded-xl bg-white/5 backdrop-blur-sm text-sm font-medium text-white truncate cursor-pointer"
              style={{ minHeight: '2.25rem', maxWidth: '100%' }}
              title={editorTitle}
              onClick={() => {
                if (mainContentRef.current) {
                  mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
            >
              <Loader2 className={`w-4 h-4 mr-2 ${saving ? 'animate-spin text-blue-400' : 'text-gray-500 opacity-40'}`} />
              {(() => {
                const words = (editorTitle || 'Untitled Note').trim().split(/\s+/);
                if (words.length > 7) {
                  return words.slice(0, 7).join(' ') + '...';
                }
                return editorTitle || 'Untitled Note';
              })()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-red-500 hover:bg-gray-700 border-none w-7 h-7"
              aria-label="Favorite"
              // No onClick yet
            >
              <Heart className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-gray-200 text-black hover:bg-gray-300"
              onClick={() => {/* Export logic here */}}
            >
              Export As
            </Button>
          </div>
        </div>

        {/* Main Editor Area */}
        <main ref={mainContentRef} className="flex-1 overflow-auto" style={{ backgroundColor: '#1c1c1c' }}>
          {isSearching ? (
            <SearchResults
              query={searchQuery}
              results={filteredNotes}
              onSelectNote={setSelectedNote}
              isDark={isDark}
            />
          ) : selectedNote ? (
            <NoteEditor
              note={selectedNote}
              onUpdate={handleUpdateNote}
              isDark={isDark}
              alignLeft={32}
              onTitleChange={handleTitleChange}
              onClose={() => setSelectedNote(null)}
              setSaving={setSaving}
            />
          ) : (
            <div className="h-full flex items-center justify-center" style={{ marginLeft: 31, marginRight: 31 }}>
              <div className="text-center max-w-md">
                <div className="w-24 h-24 bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <Edit className="w-12 h-12 text-gray-500" />
                </div>
                <h2 className="text-2xl font-medium text-white mb-3">Start writing</h2>
                <p className="text-gray-400 mb-6 text-base">Select a note from the sidebar or create a new one</p>
                <Button
                  onClick={handleCreateNote}
                  className="bg-orange-600 text-white hover:bg-orange-700 border-none"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Note
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
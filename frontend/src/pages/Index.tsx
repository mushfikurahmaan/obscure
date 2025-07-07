import { useState, useEffect, useRef } from 'react';
import {Plus, Edit, Heart, Loader2, Circle} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { NoteEditor } from '../components/NoteEditor';
import { SearchResults } from '../components/SearchResults';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import ScrollProgressBar from '../components/ScrollProgressBar';
import { DeletedNotesGrid } from '../components/DeletedNotesGrid';

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  isFavorite: boolean;
  favoriteEmoji: string;
  deleted: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  count: number;
}

// Add Twemoji CDN for rendering SVGs
const TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/';
const EMOJI_LIST = [
  '1f60d', // 😍
  '1f60a', // 😊
  '1f609', // 😉
  '1f618', // 😘
  '1f970', // 🥰
  '1f60e', // 😎
  '1f44d', // 👍
  '1f389', // 🎉
  '1f525', // 🔥
  '1f499', // 💙
  '1f49a', // 💚
  '1f49b', // 💛
  '1f49c', // 💜
  '1f494', // 💔
  '1f44f', // 👏
  '1f604', // 😄
  '1f622', // 😢
  '1f62d', // 😭
  '1f631', // 😱
  '1f62e', // 😮
];

const Index = () => {
  const [isDark, setIsDark] = useState(true);

  // Load notes from localStorage if available
  const [notes, setNotes] = useState<Note[]>(() => {
    const stored = localStorage.getItem('notes');
    if (stored) {
      try {
        // Parse and revive Date objects
        return JSON.parse(stored, (key, value) => {
          if ((key === 'createdAt' || key === 'updatedAt') && typeof value === 'string') {
            return new Date(value);
          }
          return value;
        });
      } catch {
        return [];
      }
    }
    return [];
  });

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

  const [favoriteDialogOpen, setFavoriteDialogOpen] = useState(false);
  const [favoriteEmoji, setFavoriteEmoji] = useState('');
  const [favoriteNotes, setFavoriteNotes] = useState<{ id: string; title: string; emoji: string }[]>([]);

  const [viewingDeleted, setViewingDeleted] = useState(false);

  // Sync editorTitle with selectedNote when switching notes
  useEffect(() => {
    setEditorTitle(selectedNote ? selectedNote.title : '');
  }, [selectedNote]);

  // Save notes to localStorage whenever notes change
  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes));
  }, [notes]);

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Filter for My Notes (not deleted)
  const myNotes = notes.filter(note => !note.deleted);
  // Filter for Deleted Notes
  const deletedNotes = notes.filter(note => note.deleted);

  const handleCreateNote = () => {
    // Check for an existing blank note (title and content both empty and not deleted)
    const existingBlank = notes.find(note => !note.title && !note.content && !note.deleted);
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
      updatedAt: new Date(),
      isFavorite: false,
      favoriteEmoji: '',
      deleted: false,
    };
    setNotes([newNote, ...notes]);
    setSelectedNote(newNote);
    // Ensure My Notes list updates immediately
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
    setNotes(notes.map(note => note.id === noteId ? { ...note, deleted: true } : note));
    // If the deleted note was selected, select the next available note in My Notes
    if (selectedNote?.id === noteId) {
      const remainingMyNotes = notes.filter(n => n.id !== noteId && !n.deleted);
      setSelectedNote(remainingMyNotes.length > 0 ? remainingMyNotes[0] : null);
    }
    // Do NOT set viewingDeleted here
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsSearching(query.length > 0);
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  // Helper to get favorite for a note
  const getFavoriteForNote = (noteId: string) => favoriteNotes.find(fav => fav.id === noteId);

  // Restore a deleted note
  const handleRestoreNote = (noteId: string) => {
    setNotes(notes.map(note => note.id === noteId ? { ...note, deleted: false } : note));
  };

  // Permanently delete a note
  const handleDeletePermanently = (noteId: string) => {
    setNotes(notes.filter(note => note.id !== noteId));
    if (selectedNote?.id === noteId) {
      setSelectedNote(notes.length > 1 ? notes.find(n => n.id !== noteId) || null : null);
    }
  };

  useEffect(() => {
    if (!viewingDeleted) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewingDeleted(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [viewingDeleted]);

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: '#1c1c1c' }}>
      {/* Sidebar */}
      <Sidebar
        notes={notes}
        categories={categories}
        selectedNote={selectedNote}
        selectedCategory={selectedCategory}
        searchQuery={searchQuery}
        collapsed={sidebarCollapsed}
        isDark={isDark}
        onNoteSelect={note => {
          setSelectedNote(note);
          setViewingDeleted(false);
        }}
        onCategorySelect={setSelectedCategory}
        onSearch={handleSearch}
        onCreateNote={handleCreateNote}
        onDeleteNote={handleDeleteNote}
        onRestoreNote={handleRestoreNote}
        onDeletePermanently={handleDeletePermanently}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onRemoveFavorite={(noteId: string) => {
          setNotes(notes => {
            const updated = notes.map(note => note.id === noteId ? { ...note, isFavorite: false, favoriteEmoji: '' } : note);
            // If the current selectedNote is the one being updated, update selectedNote as well
            if (selectedNote && selectedNote.id === noteId) {
              const updatedNote = updated.find(n => n.id === noteId);
              setSelectedNote(updatedNote ? { ...updatedNote } : null);
            }
            return updated;
          });
        }}
        onDeletedClick={() => setViewingDeleted(true)}
        deletedCount={deletedNotes.length}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top tabs bar */}
        <div className="flex items-center px-6 py-2 justify-between" style={{ backgroundColor: '#1c1c1c' }}
          tabIndex={viewingDeleted ? 0 : undefined}
          onKeyDown={e => {
            if (viewingDeleted && e.key === 'Escape') {
              setViewingDeleted(false);
            }
          }}
        >
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
            {viewingDeleted ? (
              <span
                className="flex items-center px-4 py-1 rounded-xl bg-white/5 backdrop-blur-sm text-sm font-medium text-white truncate"
                style={{ minHeight: '2.25rem', maxWidth: '100%' }}
              >
                <Circle className="w-3 h-3 mr-2" style={{ color: '#ff3b3b', fill: '#ff3b3b' }} />
                Trashed Notes
              </span>
            ) : selectedNote && (
              <>
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
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  {(() => {
                    const words = (editorTitle || 'Untitled Note').trim().split(/\s+/);
                    if (words.length > 7) {
                      return words.slice(0, 7).join(' ') + '...';
                    }
                    return editorTitle || 'Untitled Note';
                  })()}
                </span>
                <span
                  className="ml-3 flex items-center px-3 py-1 rounded-xl bg-white/5 backdrop-blur-sm"
                  style={{ minHeight: '2.25rem' }}
                >
                  <Loader2 className={`w-4 h-4 ${saving ? 'animate-spin text-blue-400' : 'text-gray-500 opacity-40'}`} />
                </span>
              </>
            )}
          </div>
          {!viewingDeleted && selectedNote && (
            <div className="flex items-center gap-2">
              <Dialog open={favoriteDialogOpen} onOpenChange={setFavoriteDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-red-500 hover:bg-gray-700 border-none w-7 h-7 relative"
                    aria-label="Favorite"
                  >
                    {selectedNote && selectedNote.isFavorite && selectedNote.favoriteEmoji ? (
                      <img
                        src={`${TWEMOJI_BASE}${selectedNote.favoriteEmoji}.svg`}
                        alt="emoji"
                        className="w-4 h-4"
                        style={{ display: 'inline' }}
                      />
                    ) : (
                      <Heart className="w-4 h-4" />
                    )}
                  </Button>
                </DialogTrigger>
                {selectedNote && (
                  <DialogContent className="sm:max-w-[340px]" style={{ background: '#262626', color: '#fff' }}>
                    <DialogHeader>
                      <DialogTitle style={{ color: '#fff' }}>Favorite Note</DialogTitle>
                      <DialogDescription style={{ color: '#bbb' }}>
                        Add this note to your favorites and pick an emoji.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <div className="flex items-center gap-2">
                          <Label style={{ color: '#bbb', minWidth: 40 }}>Title:</Label>
                          <span
                            className="font-medium text-base"
                            style={{
                              color: '#fff',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: 180,
                              display: 'inline-block',
                            }}
                            title={selectedNote.title || 'Untitled Note'}
                          >
                            {selectedNote.title || 'Untitled Note'}
                          </span>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label style={{ color: '#bbb' }}>Pick an emoji</Label>
                        <div className="flex flex-wrap gap-2">
                          {EMOJI_LIST.map(code => (
                            <button
                              key={code}
                              type="button"
                              className={`rounded-md border ${favoriteEmoji === code ? 'border-orange-500' : 'border-transparent'} p-0.5 focus:outline-none transition`}
                              onClick={() => setFavoriteEmoji(code)}
                              style={{ background: 'none' }}
                            >
                              <img src={`${TWEMOJI_BASE}${code}.svg`} alt="emoji" style={{ width: 28, height: 28 }} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline" type="button" style={{ background: '#222', color: '#bbb', borderColor: '#444' }} onClick={() => setFavoriteEmoji('')}>Cancel</Button>
                      </DialogClose>
                      <Button
                        type="button"
                        disabled={!favoriteEmoji}
                        style={{ background: favoriteEmoji ? '#ff9800' : '#444', color: '#fff', border: 'none' }}
                        onClick={() => {
                          if (selectedNote) {
                            setNotes(notes => {
                              const updated = notes.map(note => note.id === selectedNote.id ? { ...note, isFavorite: true, favoriteEmoji } : note);
                              // Also update selectedNote to keep UI in sync
                              const updatedNote = updated.find(n => n.id === selectedNote.id);
                              setSelectedNote(updatedNote ? { ...updatedNote } : null);
                              return updated;
                            });
                          }
                          setFavoriteDialogOpen(false);
                          setFavoriteEmoji('');
                        }}
                      >
                        Save
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                )}
              </Dialog>
              <Button
                variant="outline"
                size="sm"
                className="bg-gray-200 text-black hover:bg-gray-300"
                onClick={() => {/* Export logic here */}}
              >
                Export
              </Button>
            </div>
          )}
        </div>
        {/* Scroll Progress Bar */}
        <ScrollProgressBar containerRef={mainContentRef} height={6} color="#fff" />
        {/* Main Editor Area */}
        <main ref={mainContentRef} className="flex-1 overflow-auto" style={{ backgroundColor: '#1c1c1c' }}>
          {viewingDeleted ? (
            <DeletedNotesGrid
              notes={deletedNotes}
              onRestore={handleRestoreNote}
              onDeletePermanently={handleDeletePermanently}
              onSelectNote={setSelectedNote}
            />
          ) : isSearching ? (
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
              onRestoreNote={selectedNote.deleted ? handleRestoreNote : undefined}
              onDeletePermanently={selectedNote.deleted ? handleDeletePermanently : undefined}
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
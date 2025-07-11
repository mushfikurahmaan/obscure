import { useState, useEffect } from 'react';
import {Plus, Edit, Heart, Loader2, Circle} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { NoteEditor } from '../components/NoteEditor';
import { Button } from '../components/ui/button';
import { DeletedNotesGrid } from '../components/DeletedNotesGrid';
import { ArchiveNotesGrid } from '../components/ArchiveNotesGrid';
import "../styles/scroll-thumb-only.css";
// ContextMenu import removed; only DropdownMenu is used for favorite button
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '../components/ui/dropdown-menu';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isFavorite: boolean;
  favoriteEmoji: string;
  deleted: boolean;
  archived: boolean;
}



// Add Twemoji CDN for rendering SVGs
const TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/';

const EMOJI_LIST = [
  // Work, Code, Notes, Important, Relevant
  '1f4dd', '1f4cb', '1f4c4', '1f4c3', '1f4d1', '1f4c8', '1f4c9', '1f4ca', '1f4bb',
  '1f5a5', '1f4f1', '1f4e2', '1f4cc', '1f4cd', '1f512', '1f513', '1f4ac', '1f4ad',
  '1f4a1', '1f4e3', '1f6e0', '2696', '1f4b8',

  // Smileys & Emotion
  '1f600', '1f603', '1f604', '1f601', '1f606', '1f605', '1f923', '1f602', '1f642', '1f643',
  '1f609', '1f60a', '1f607', '1f60d', '1f929', '1f618', '1f617', '263a', '1f61a', '1f619',
  '1f972', '1f60b', '1f61b', '1f61c', '1f92a', '1f61d', '1f911', '1f917', '1f92d', '1f92b',
  '1f914', '1f910', '1f928', '1f610', '1f611', '1f636', '1f60f', '1f612', '1f644', '1f62c',
  '1f925', '1f60c', '1f614', '1f62a', '1f924', '1f634', '1f637', '1f912', '1f915', '1f922',
  '1f92e', '1f927', '1f975', '1f976', '1f974', '1f635', '1f92f', '1f920', '1f973', '1f60e',
  '1f913',

  // Hearts & Love
  '1f970', '1f496', '1f495', '1f49e', '1f493', '1f497', '1f49f', '1f49c', '1f49b', '1f49a',
  '1f499', '1f49d', '1f494',

  // Gestures
  '1f44d', '1f44e', '1f44c', '1f44a', '1f91b', '1f91c', '1f91e', '1f91f', '1f918', '1f919',
  '1f590', '270b', '1f596', '1f44f',

  // Party & Fun
  '1f389', '1f973', '1f38a', '1f388', '1f381', '1f525', '1f4af', '1f4ab', '1f31f',

  // Animals
  '1f436', '1f431', '1f42d', '1f439', '1f430', '1f98a', '1f43b', '1f43c', '1f428',
  '1f42f', '1f981', '1f42e',

  // Food
  '1f354', '1f35f', '1f355', '1f32e', '1f32d', '1f37f', '1f36a', '1f382', '1f370',
  '1f36b', '1f36c', '1f36d',

  // Miscellaneous
  '1f680', '1f697', '1f3c1', '1f3c6', '1f947', '1f948', '1f949', '1f451', '1f48e',
  '1f4b0', '1f381', '1f384'
];



const Index = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const stored = localStorage.getItem('theme');
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  });

  // Listen for system theme changes if theme is 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const applySystemTheme = () => {
      if (mql.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    applySystemTheme();
    mql.addEventListener('change', applySystemTheme);
    return () => mql.removeEventListener('change', applySystemTheme);
  }, [theme]);

  // Apply theme class to <html>
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // handled by system effect above
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

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

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editorTitle, setEditorTitle] = useState(selectedNote ? selectedNote.title : '');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);

  const [] = useState(false);
  const [favoriteEmoji, setFavoriteEmoji] = useState('');
  const [] = useState<{ id: string; title: string; emoji: string }[]>([]);

  const [viewingDeleted, setViewingDeleted] = useState(false);
  const [viewingArchived, setViewingArchived] = useState(false);

  // Control open state for favorite dropdown menu
  const [favoriteMenuOpen, setFavoriteMenuOpen] = useState(false);

  // Sync editorTitle with selectedNote when switching notes
  useEffect(() => {
    setEditorTitle(selectedNote ? selectedNote.title : '');
  }, [selectedNote]);

  // Save notes to localStorage whenever notes change
  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes));
  }, [notes]);

  // Filter for My Notes (not deleted)
  // Filter for Deleted Notes
  const deletedNotes = notes.filter(note => note.deleted);
  const archivedNotes = notes.filter(note => note.archived);

  const handleCreateNote = () => {
    // Check for an existing blank note (title and content both empty and not deleted)
    const existingBlank = notes.find(note => !note.title && !note.content && !note.deleted);
    if (existingBlank) {
      setSelectedNote(existingBlank);
      if (viewingDeleted) setViewingDeleted(false);
      return;
    }
    const newNote: Note = {
      id: Date.now().toString(),
      title: '',
      content: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      isFavorite: false,
      favoriteEmoji: '',
      deleted: false,
      archived: false,
    };
    setNotes([newNote, ...notes]);
    setSelectedNote(newNote);
    if (viewingDeleted) setViewingDeleted(false);
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

  const handleArchiveNote = (noteId: string) => {
    setNotes(notes.map(note => note.id === noteId ? { ...note, archived: true } : note));
    if (selectedNote?.id === noteId) {
      const remainingMyNotes = notes.filter(n => n.id !== noteId && !n.deleted && !n.archived);
      setSelectedNote(remainingMyNotes.length > 0 ? remainingMyNotes[0] : null);
    }
  };

  // Helper to get favorite for a note

  // Restore a deleted note
  const handleRestoreNote = (noteId: string) => {
    setNotes(notes => {
      const updated = notes.map(note => note.id === noteId ? { ...note, deleted: false } : note);
      if (selectedNote && selectedNote.id === noteId) {
        const updatedNote = updated.find(n => n.id === noteId);
        setSelectedNote(updatedNote ? { ...updatedNote } : null);
      }
      return updated;
    });
  };

  // Permanently delete a note
  const handleDeletePermanently = (noteId: string) => {
    setNotes(notes.filter(note => note.id !== noteId));
    if (selectedNote?.id === noteId) {
      setSelectedNote(notes.length > 1 ? notes.find(n => n.id !== noteId) || null : null);
    }
  };

  const handleRemoveFromArchive = (noteId: string) => {
    setNotes(notes => {
      const updated = notes.map(note => note.id === noteId ? { ...note, archived: false } : note);
      if (selectedNote && selectedNote.id === noteId) {
        const updatedNote = updated.find(n => n.id === noteId);
        setSelectedNote(updatedNote ? { ...updatedNote } : null);
      }
      return updated;
    });
  };

  useEffect(() => {
    if (!viewingDeleted) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewingDeleted(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [viewingDeleted]);

  useEffect(() => {
    if (!viewingArchived) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewingArchived(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [viewingArchived]);

  return (
    <div className="h-screen flex bg-background text-[hsl(var(--foreground))]" data-theme={theme}>
      {/* Sidebar */}
      <Sidebar
        notes={notes}
        selectedNote={selectedNote}
        collapsed={sidebarCollapsed}
        isDark={theme === 'dark'}
        onNoteSelect={note => {
          setSelectedNote(note);
          setViewingDeleted(false);
          setViewingArchived(false);
        }}
        onCreateNote={handleCreateNote}
        onDeleteNote={handleDeleteNote}
        onRestoreNote={handleRestoreNote}
        onDeletePermanently={handleDeletePermanently}
        onArchiveNote={handleArchiveNote}
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
        onDeletedClick={() => {
          setViewingDeleted(true);
          setViewingArchived(false);
          setSelectedNote(null);
        }}
        onArchivedClick={() => {
          setViewingArchived(true);
          setViewingDeleted(false);
          setSelectedNote(null);
        }}
        deletedCount={deletedNotes.length}
        archivedCount={archivedNotes.length}
        theme={theme}
        setTheme={setTheme}
      />
      {/* Main Content Area */}
      <div className="flex-1 h-full flex flex-col bg-background text-[hsl(var(--foreground))]">
        {/* Top tabs bar (fixed, always visible) */}
        <div className="flex items-center px-6 py-2 justify-between bg-background text-[hsl(var(--foreground))]"
          tabIndex={viewingDeleted || viewingArchived ? 0 : undefined}
          onKeyDown={e => {
            if (viewingDeleted && e.key === 'Escape') {
              setViewingDeleted(false);
            }
            if (viewingArchived && e.key === 'Escape') {
              setViewingArchived(false);
            }
          }}
        >
          {/* Top bar content (favorite, spinner, note info) */}
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="mr-3 text-gray-400 hover:text-[hsl(var(--foreground))] hover:bg-gray-700 border-none w-7 h-7"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {/* Hamburger icon for expand/collapse */}
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
            {viewingArchived ? (
              <span className="flex items-center px-4 py-1 rounded-xl bg-[hsl(var(--topbar-background))] backdrop-blur-sm text-sm font-medium text-[hsl(var(--foreground))] truncate" style={{ minHeight: '2.25rem', maxWidth: '100%' }}>
                <Circle className="w-3 h-3 mr-2" style={{ color: 'hsl(35, 100%, 55%)', fill: 'hsl(35, 100%, 55%)' }} />
                Archived Notes
              </span>
            ) : viewingDeleted ? (
              <span className="flex items-center px-4 py-1 rounded-xl bg-[hsl(var(--topbar-background))] backdrop-blur-sm text-sm font-medium text-[hsl(var(--foreground))] truncate" style={{ minHeight: '2.25rem', maxWidth: '100%' }}>
                <Circle className="w-3 h-3 mr-2" style={{ color: 'hsl(0, 100%, 60%)', fill: 'hsl(0, 100%, 60%)' }} />
                Trashed Notes
              </span>
            ) : selectedNote && (
              <>
                <span
                  className="flex items-center px-4 py-1 rounded-xl bg-[hsl(var(--topbar-background))] backdrop-blur-sm text-sm font-medium text-[hsl(var(--foreground))] truncate cursor-pointer"
                  style={{ minHeight: '2.25rem', maxWidth: '100%' }}
                  title={editorTitle}
                >
                  <span
                    className="w-2 h-2 rounded-full mr-2"
                    style={{
                      backgroundColor: selectedNote.deleted
                        ? 'hsl(0, 100%, 60%)' // Trash
                        : selectedNote.archived
                        ? 'hsl(35, 100%, 55%)' // Archive
                        : 'rgb(34 197 94)', // Green for My Notes (tailwind green-500)
                    }}
                  ></span>
                  {(() => {
                    const words = (editorTitle || 'Untitled Note').trim().split(/\s+/);
                    if (words.length > 7) {
                      return words.slice(0, 7).join(' ') + '...';
                    }
                    return editorTitle || 'Untitled Note';
                  })()}
                </span>
                <span
                  className="ml-3 flex items-center px-3 py-1 rounded-xl bg-[hsl(var(--topbar-background))] backdrop-blur-sm"
                  style={{ minHeight: '2.25rem' }}
                >
                  <Loader2 className={`w-4 h-4 ${saving ? 'animate-spin text-blue-400' : 'text-gray-500 opacity-40'}`} />
                </span>
              </>
            )}
          </div>
          {/* Right side: favorite button card and stats card */}
          {!viewingArchived && !viewingDeleted && selectedNote && (
            <div className="flex items-center ml-4 gap-3">
              {/* Favorite Button with Dropdown Menu */}
              <DropdownMenu open={favoriteMenuOpen} onOpenChange={setFavoriteMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center px-2 py-1 rounded-xl bg-[hsl(var(--topbar-background))] backdrop-blur-sm text-sm font-medium text-[hsl(var(--foreground))] cursor-pointer" style={{ minHeight: '2.25rem' }}>
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
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[340px] bg-background text-[hsl(var(--foreground))] rounded-2xl">
                  <div className="px-4 py-2">
                    <div className="font-semibold text-base mb-1">Favorite Note</div>
                    <div className="text-[hsl(var(--muted-foreground))] mb-3">Add this note to your favorites and pick an emoji.</div>
                    {/* Title removed as requested */}
                    <div className="mb-3">
                      <div
                        className="flex flex-wrap gap-2"
                        style={{ maxHeight: 180, overflowY: 'auto', minHeight: 40 }}
                      >
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
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        type="button"
                        className="bg-background text-[hsl(var(--muted-foreground))] border border-border rounded px-3 py-1"
                        onClick={() => setFavoriteMenuOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!favoriteEmoji}
                        className={
                          favoriteEmoji
                            ? 'border-none rounded px-3 py-1 bg-white text-black dark:bg-[#18181b] dark:text-white'
                            : 'bg-muted text-[hsl(var(--muted-foreground))] border-none rounded px-3 py-1'
                        }
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
                          setFavoriteEmoji('');
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* End Favorite Button with Dropdown Menu */}
              <div className="flex items-center px-4 py-1 rounded-xl bg-[hsl(var(--topbar-background))] backdrop-blur-sm text-sm font-medium text-[hsl(var(--foreground))]" style={{ minHeight: '2.25rem' }}>
                <span className="mr-4">Words: {selectedNote.content ? selectedNote.content.trim().split(/\s+/).filter(Boolean).length : 0}</span>
                <span className="mr-4">Chars: {selectedNote.content ? selectedNote.content.length : 0}</span>
                <span>Lines: {selectedNote.content ? selectedNote.content.split(/\r?\n/).length : 0}</span>
              </div>
            </div>
          )}
        </div>
        {/* Main Editor Area (scrollable, with custom thumb) */}
        <div className="flex-1 overflow-auto custom-scroll-thumb bg-background text-[hsl(var(--foreground))]">
          {viewingArchived ? (
            <ArchiveNotesGrid
              notes={archivedNotes}
              onSelectNote={note => {
                setSelectedNote(note);
                setViewingArchived(false);
                setViewingDeleted(false);
              }}
              onRemoveFromArchive={handleRemoveFromArchive}
              onDeletePermanently={handleDeletePermanently}
            />
          ) : viewingDeleted ? (
            <DeletedNotesGrid
              notes={deletedNotes}
              onRestore={handleRestoreNote}
              onDeletePermanently={handleDeletePermanently}
              onSelectNote={note => {
                setSelectedNote(note);
                setViewingDeleted(false);
              }}
            />
          ) : selectedNote ? (
            <NoteEditor
              note={selectedNote}
              onUpdate={handleUpdateNote}
              isDark={theme === 'dark'}
              alignLeft={32}
              onTitleChange={handleTitleChange}
              onClose={() => setSelectedNote(null)}
              setSaving={setSaving}
              contextType={selectedNote.deleted ? 'trash' : selectedNote.archived ? 'archive' : undefined}
              onRemoveFromArchive={selectedNote.archived ? handleRemoveFromArchive : undefined}
              onRestore={selectedNote.deleted ? handleRestoreNote : undefined}
              onDeletePermanently={(selectedNote.archived || selectedNote.deleted) ? handleDeletePermanently : undefined}
            />
          ) : (
            <div className="h-full flex items-center justify-center" style={{ marginLeft: 31, marginRight: 31 }}>
              <div className="text-center max-w-md">
                <div className="w-24 h-24 bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <Edit className="w-12 h-12 text-gray-500" />
                </div>
                <h2 className="text-2xl font-medium text-[hsl(var(--foreground))] mb-3">Start writing</h2>
                <p className="text-[hsl(var(--muted-foreground))] mb-6 text-base">Select a note from the sidebar or create a new one</p>
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
        </div>
      </div>
    </div>
  );
};

export default Index;
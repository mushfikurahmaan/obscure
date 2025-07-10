import { useState, useEffect } from 'react';
import {Plus, Edit, Heart, Loader2, Circle} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { NoteEditor } from '../components/NoteEditor';
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
import { DeletedNotesGrid } from '../components/DeletedNotesGrid';
import { ArchiveNotesGrid } from '../components/ArchiveNotesGrid';
import "../styles/scroll-thumb-only.css";

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
  archived: boolean;
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

  const [favoriteDialogOpen, setFavoriteDialogOpen] = useState(false);
  const [favoriteEmoji, setFavoriteEmoji] = useState('');
  const [] = useState<{ id: string; title: string; emoji: string }[]>([]);

  const [viewingDeleted, setViewingDeleted] = useState(false);
  const [viewingArchived, setViewingArchived] = useState(false);

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
      category: 'Personal',
      tags: [],
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
    setNotes(notes.map(note => note.id === noteId ? { ...note, deleted: false } : note));
  };

  // Permanently delete a note
  const handleDeletePermanently = (noteId: string) => {
    setNotes(notes.filter(note => note.id !== noteId));
    if (selectedNote?.id === noteId) {
      setSelectedNote(notes.length > 1 ? notes.find(n => n.id !== noteId) || null : null);
    }
  };

  const handleRemoveFromArchive = (noteId: string) => {
    setNotes(notes.map(note => note.id === noteId ? { ...note, archived: false } : note));
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
        onDeletedClick={() => setViewingDeleted(true)}
        onArchivedClick={() => setViewingArchived(true)}
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
                  className="ml-3 flex items-center px-3 py-1 rounded-xl bg-[hsl(var(--topbar-background))] backdrop-blur-sm"
                  style={{ minHeight: '2.25rem' }}
                >
                  <Loader2 className={`w-4 h-4 ${saving ? 'animate-spin text-blue-400' : 'text-gray-500 opacity-40'}`} />
                </span>
              </>
            )}
          </div>
          {/* Right side: favorite button card and stats card */}
          {!viewingArchived && selectedNote && (
            <div className="flex items-center ml-4 gap-3">
              <Dialog open={favoriteDialogOpen} onOpenChange={setFavoriteDialogOpen}>
                <DialogTrigger asChild>
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
                </DialogTrigger>
                {selectedNote && (
                  <DialogContent className="sm:max-w-[340px] bg-background text-[hsl(var(--foreground))]"
                    data-theme={theme}
                  >
                    <DialogHeader>
                      <DialogTitle className="text-[hsl(var(--foreground))]">Favorite Note</DialogTitle>
                      <DialogDescription className="text-[hsl(var(--muted-foreground))]">
                        Add this note to your favorites and pick an emoji.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-[hsl(var(--muted-foreground))]" style={{ minWidth: 40 }}>Title:</Label>
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
                        <Button variant="outline" type="button" className="bg-background text-[hsl(var(--muted-foreground))] border border-border" onClick={() => setFavoriteEmoji('')}>Cancel</Button>
                      </DialogClose>
                      <Button
                        type="button"
                        disabled={!favoriteEmoji}
                        className={favoriteEmoji ? 'bg-orange-600 text-white border-none' : 'bg-muted text-[hsl(var(--muted-foreground))] border-none'}
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
              }}
              onRemoveFromArchive={handleRemoveFromArchive}
              onDeletePermanently={handleDeletePermanently}
            />
          ) : viewingDeleted ? (
            <DeletedNotesGrid
              notes={deletedNotes}
              onRestore={handleRestoreNote}
              onDeletePermanently={handleDeletePermanently}
              onSelectNote={setSelectedNote}
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
              onRestoreNote={selectedNote.deleted ? handleRestoreNote : undefined}
              onDeletePermanently={selectedNote.deleted ? handleDeletePermanently : undefined}
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
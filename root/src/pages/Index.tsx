import { useState, useEffect } from 'react';
import {Plus, Edit, Bookmark, Loader2, Circle, Trash2} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { NoteEditor } from '../components/NoteEditor';
import { Button } from '../components/ui/button';
import { DeletedNotesGrid } from '../components/DeletedNotesGrid';
import { ArchiveNotesGrid } from '../components/ArchiveNotesGrid';
import "../styles/scroll-thumb-only.css";
// ContextMenu import removed; only DropdownMenu is used for favorite button
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '../components/ui/dropdown-menu';
import { getCurrentWindow } from "@tauri-apps/api/window";
import { FixedSizeGrid as Grid } from 'react-window';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '../components/ui/alert-dialog';

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


const getLocalEmojiPath = (filename: string) => filename;

declare module "react" {
  interface CSSProperties {
    WebkitAppRegion?: "drag" | "no-drag";
  }
}


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

  // Add state for empty trash dialog
  const [emptyTrashDialogOpen, setEmptyTrashDialogOpen] = useState(false);

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

  let truncatedTitle = '';
  if (selectedNote) {
    const MAX_WORDS = 7;
    const MAX_WORD_LENGTH = 20;
    const MAX_TOTAL_LENGTH = 80;
    let title = (editorTitle || 'Untitled Note').trim();
    let words = title.split(/\s+/).map(word =>
      word.length > MAX_WORD_LENGTH ? word.slice(0, MAX_WORD_LENGTH) + '…' : word
    );
    if (words.length > MAX_WORDS) {
      words = words.slice(0, MAX_WORDS);
      truncatedTitle = words.join(' ') + '...';
    } else {
      const finalTitle = words.join(' ');
      truncatedTitle = finalTitle.length > MAX_TOTAL_LENGTH
        ? finalTitle.slice(0, MAX_TOTAL_LENGTH) + '...'
        : finalTitle;
    }
  }

  const [emojiList, setEmojiList] = useState<string[]>([]);
  useEffect(() => {
    fetch('/emoji-manifest.json')
      .then(res => res.json())
      .then((files: string[]) => setEmojiList(files.map(f => '/' + f)));
  }, []);

  // Add state for emoji search
  const [emojiSearch, setEmojiSearch] = useState('');

  // Filtered emoji list based on search
  const filteredEmojis = emojiList.filter(filename =>
    filename.toLowerCase().includes(emojiSearch.toLowerCase())
  );

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
        {/* Replace the top bar section with a relative wrapper and absolutely positioned window controls: */}
        <div className="relative w-full">
          {/* Window Controls: absolutely positioned at top right */}
          <div className="absolute top-0 right-0 flex items-center gap-1 z-10" style={{ WebkitAppRegion: 'no-drag', height: '2.5rem' }}>
            <button
              className="w-10 h-10 px-0 flex items-center justify-center hover:bg-windowlight dark:hover:bg-windowgray transition-colors select-none"
              title="Minimize"
              onClick={async () => { const window = getCurrentWindow(); await window.minimize(); }}
            >
              <svg width="12" height="2" viewBox="0 0 12 2" fill="none" style={{ display: 'block', margin: 'auto' }}><rect width="12" height="2" rx="1" fill="currentColor" /></svg>
            </button>
            <button
              className="w-10 h-10 px-0 flex items-center justify-center hover:bg-windowlight dark:hover:bg-windowgray transition-colors select-none"
              title="Maximize"
              onClick={async () => { const window = getCurrentWindow(); await window.toggleMaximize(); }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ display: 'block', margin: 'auto' }}><rect x="1" y="1" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
            </button>
            <button
              className="w-10 h-10 px-0 flex items-center justify-center hover:bg-windowred hover:text-white transition-colors select-none"
              title="Close"
              onClick={async () => { const window = getCurrentWindow(); await window.close(); }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ display: 'block', margin: 'auto' }}><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" /><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.5" /></svg>
            </button>
          </div>
          {/* Main Top Bar Content with pt-2 pb-2 */}
          <div className="flex items-center w-full pt-2 pb-2" style={{ WebkitAppRegion: 'drag' }}>
            {/* Left: Hamburger, Title, Spinner */}
            <div className="flex items-center flex-shrink-0">
              {/* Hamburger button (sidebar toggle) */}
              <Button
                variant="ghost"
                size="icon"
                className="ml-6 mr-3 text-gray-400 hover:text-[hsl(var(--foreground))] hover:bg-gray-700 border-none w-7 h-7"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                style={{ WebkitAppRegion: 'no-drag' }}
              >
                {/* Hamburger icon for expand/collapse */}
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
              {viewingArchived ? (
                <span className="flex items-center px-4 py-1 rounded-lg bg-[hsl(var(--topbar-background))] backdrop-blur-sm text-sm font-medium text-[hsl(var(--foreground))] truncate" style={{ minHeight: '2.25rem', maxWidth: '100%' }}>
                  <Circle className="w-3 h-3 mr-2" style={{ color: 'hsl(35, 100%, 55%)', fill: 'hsl(35, 100%, 55%)' }} />
                  Archived Notes
                </span>
              ) : viewingDeleted ? (
                <div className="flex items-center justify-between w-full px-0">
                  <span className="flex items-center px-4 py-1 rounded-lg bg-[hsl(var(--topbar-background))] backdrop-blur-sm text-sm font-medium text-[hsl(var(--foreground))] truncate" style={{ minHeight: '2.25rem', maxWidth: '100%' }}>
                    <Circle className="w-3 h-3 mr-2" style={{ color: 'hsl(0, 100%, 60%)', fill: 'hsl(0, 100%, 60%)' }} />
                    Trashed Notes
                  </span>
                  {/* Empty Trash Button */}
                  <AlertDialog open={emptyTrashDialogOpen} onOpenChange={setEmptyTrashDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <div className="px-2 py-1 rounded-lg bg-[hsl(var(--topbar-background))] backdrop-blur-sm flex items-center" style={{ minHeight: '2.25rem' }}>
                        <button
                          className="flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900 transition-colors p-1"
                          title="Empty Trash"
                          style={{ WebkitAppRegion: 'no-drag' }}
                          aria-label="Empty Trash"
                          disabled={deletedNotes.length === 0}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Empty Trash?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to empty your trash? This will permanently delete all notes in the trash. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => {
                            setNotes(notes.filter(note => !note.deleted));
                            setSelectedNote(null);
                            setEmptyTrashDialogOpen(false);
                          }}
                        >
                          Empty Trash
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : selectedNote && (
                <>
                  {/* Title and status dot */}
                  <span
                    className="flex items-center px-4 py-1 rounded-lg bg-[hsl(var(--topbar-background))] backdrop-blur-sm text-sm font-medium text-[hsl(var(--foreground))] truncate cursor-pointer"
                    style={{ minHeight: '2.25rem', maxWidth: '100%' }}
                    title={editorTitle}
                  >
                    <span
                      className="w-2 h-2 rounded-full mr-2"
                      style={{
                        backgroundColor: selectedNote?.deleted
                          ? 'hsl(0, 100%, 60%)' // Trash
                          : selectedNote?.archived
                          ? 'hsl(35, 100%, 55%)' // Archive
                          : 'rgb(34 197 94)', // Green for My Notes (tailwind green-500)
                      }}
                    ></span>
                    {truncatedTitle}
                  </span>
                  {/* Favorite Button with Dropdown Menu */}
                  <DropdownMenu open={favoriteMenuOpen} onOpenChange={setFavoriteMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <div className="flex items-center px-2 py-1 ml-3 rounded-lg bg-[hsl(var(--topbar-background))] backdrop-blur-sm text-sm font-medium text-[hsl(var(--foreground))] cursor-pointer" style={{ minHeight: '2.25rem', WebkitAppRegion: 'no-drag' }}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 hover:text-green-500 hover:bg-gray-700 border-none w-7 h-7 relative"
                          aria-label="Favorite"
                          style={{ WebkitAppRegion: 'no-drag' }}
                        >
                          {selectedNote && selectedNote.isFavorite && selectedNote.favoriteEmoji ? (
                            <img
                              src={getLocalEmojiPath(selectedNote.favoriteEmoji)}
                              alt="emoji"
                              className="w-6 h-6"
                              style={{ display: 'inline' }}
                            />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[340px] bg-background text-[hsl(var(--foreground))] rounded-lg">
                      <div className="px-4 py-2">
                        <div className="font-semibold text-base mb-1">Favorite Note</div>
                        <div className="text-[hsl(var(--muted-foreground))] mb-3">Add this note to your favorites and pick an emoji.</div>
                        <div className="mb-3">
                          <input
                            type="text"
                            value={emojiSearch}
                            onChange={e => setEmojiSearch(e.target.value)}
                            placeholder="Search emojis..."
                            className="w-full mb-2 px-3 py-1 rounded border border-border bg-background text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-blue-200"
                            style={{ fontSize: 14 }}
                          />
                          {filteredEmojis.length === 0 ? (
                            <div className="w-full text-center text-[hsl(var(--muted-foreground))] py-4">No emojis found</div>
                          ) : (
                            <Grid
                              columnCount={8}
                              columnWidth={36}
                              height={180}
                              rowCount={Math.ceil(filteredEmojis.length / 8)}
                              rowHeight={36}
                              width={304}
                            >
                              {({ columnIndex, rowIndex, style }) => {
                                const idx = rowIndex * 8 + columnIndex;
                                if (idx >= filteredEmojis.length) return null;
                                const filename = filteredEmojis[idx];
                                return (
                                  <button
                                    key={filename}
                                    type="button"
                                    className={`rounded-md border ${favoriteEmoji === filename ? 'border-orange-500' : 'border-transparent'} p-0.5 focus:outline-none transition`}
                                    onClick={() => setFavoriteEmoji(filename)}
                                    style={{ ...style, background: 'none', margin: 0 }}
                                  >
                                    <img src={getLocalEmojiPath(filename)} alt="emoji" style={{ width: 28, height: 28 }} loading="lazy" />
                                  </button>
                                );
                              }}
                            </Grid>
                          )}
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
                                ? 'border-none rounded px-3 py-1 bg-[hsl(var(--foreground))] text-[hsl(var(--background))]'
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
                  {/* Spinner */}
                  <span className="ml-3 flex items-center px-3 py-1 rounded-lg bg-[hsl(var(--topbar-background))] backdrop-blur-sm" style={{ minHeight: '2.25rem', WebkitAppRegion: 'no-drag' }}>
                    <Loader2 className={`w-4 h-4 ${saving ? 'animate-spin text-blue-400' : 'text-gray-500 opacity-40'}`} />
                  </span>
                </>
              )}
            </div>
            {/* Spacer to push window controls to the right */}
            <div className="flex-1" />
          </div>
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
import { useState, useEffect, useRef } from 'react';
import {Edit, Bookmark, Loader2, Circle, Trash2, SquareChevronLeft, SquareChevronRight} from 'lucide-react';
import MatrixText from '../components/MatrixText';
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
import { loadData, saveData } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../lib/theme';
import { Progress } from '../components/ui/progress';

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
  const { theme, setTheme } = useTheme();

  // --- Secure storage integration ---
  // Get master password from sessionStorage (set on login)
  const [masterPassword] = useState<string | null>(() => sessionStorage.getItem('masterPassword'));
  const navigate = useNavigate();
  // Debounced save state
  const [saving, setSaving] = useState(false);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoad = useRef(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notes, setNotes] = useState<Note[]>([]);

  // Load notes from secure storage
  useEffect(() => {
    if (!masterPassword) {
      navigate('/login');
      return;
    }
    setLoading(true);
    setProgress(0);
    // Animate progress bar up to 90% while loading
    let fakeProgress = 0;
    const interval = setInterval(() => {
      fakeProgress = Math.min(fakeProgress + Math.random() * 10, 90);
      setProgress(fakeProgress);
    }, 120);
    loadData(masterPassword)
      .then(data => {
        clearInterval(interval);
        setProgress(100);
        setTimeout(() => setLoading(false), 250); // brief pause at 100%
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed.notes)) {
            setNotes(parsed.notes.map((n: any) => ({
              ...n,
              createdAt: new Date(n.createdAt),
              updatedAt: new Date(n.updatedAt),
            })));
          } else {
            setNotes([]);
          }
        } catch {
          setNotes([]);
        }
        isFirstLoad.current = false;
      })
      .catch(() => {
        clearInterval(interval);
        setProgress(100);
        setTimeout(() => {
          setLoading(false);
          sessionStorage.removeItem('masterPassword');
          navigate('/login', { state: { error: 'Incorrect password.' } });
        }, 400);
      });
    return () => clearInterval(interval);
  }, [masterPassword, navigate]);

  // Debounced save to secure storage whenever notes change (but not on initial load)
  useEffect(() => {
    if (!masterPassword || isFirstLoad.current) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setSaving(true);
    saveTimeout.current = setTimeout(() => {
      saveData(masterPassword, JSON.stringify({ notes }))
        .catch(() => {/* Optionally show error */})
        .finally(() => setSaving(false));
    }, 500);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [notes, masterPassword]);

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editorTitle, setEditorTitle] = useState(selectedNote ? selectedNote.title : '');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [favoriteEmoji, setFavoriteEmoji] = useState('');

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

  const handleLock = () => {
    sessionStorage.removeItem('masterPassword');
    setNotes([]);
    setSelectedNote(null);
    navigate('/login');
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

  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let unlistenResize: (() => void) | undefined;
    let unlistenMax: (() => void) | undefined;
    let unlistenUnmax: (() => void) | undefined;
    const setup = async () => {
      const win = getCurrentWindow();
      setIsMaximized(await win.isMaximized());
      unlistenResize = await win.listen('tauri://resize', async () => {
        setIsMaximized(await win.isMaximized());
      });
      unlistenMax = await win.listen('tauri://maximize', () => setIsMaximized(true));
      unlistenUnmax = await win.listen('tauri://unmaximize', () => setIsMaximized(false));
    };
    setup();
    return () => {
      if (unlistenResize) unlistenResize();
      if (unlistenMax) unlistenMax();
      if (unlistenUnmax) unlistenUnmax();
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-[hsl(var(--foreground))]">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl font-semibold tracking-wide">
              <MatrixText text="Decrypting" /> your notes
            </span>
            <span className="text-lg text-muted-foreground">Your data is being securely unlocked</span>
          </div>
          <Progress value={progress} className="w-[320px] h-4 bg-secondary" />
          <span className="text-sm text-muted-foreground mt-2">{Math.round(progress)}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background text-[hsl(var(--foreground))]" data-theme={theme}>
      {/* Sidebar */}
      <Sidebar
        notes={notes}
        selectedNote={selectedNote}
        collapsed={sidebarCollapsed}
        isDark={theme === 'dark'}
        onNoteSelect={(note: Note) => {
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
        onLock={handleLock}
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
              className="w-10 h-10 px-0 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-windowgray transition-colors select-none"
              title="Minimize"
              onClick={async () => { const window = getCurrentWindow(); await window.minimize(); }}
            >
              <span style={{ fontFamily: 'Segoe MDL2 Assets', fontSize: 11 }}>&#xE921;</span>
            </button>
            {isMaximized ? (
              <button
                className="w-10 h-10 px-0 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-windowgray transition-colors select-none"
                title="Restore"
                onClick={async () => { const window = getCurrentWindow(); await window.toggleMaximize(); }}
              >
                <span style={{ fontFamily: 'Segoe MDL2 Assets', fontSize: 11 }}>&#xE923;</span>
              </button>
            ) : (
              <button
                className="w-10 h-10 px-0 flex items-center justify-center hover:bg-windowlight dark:hover:bg-windowgray transition-colors select-none"
                title="Maximize"
                onClick={async () => { const window = getCurrentWindow(); await window.toggleMaximize(); }}
              >
                <span style={{ fontFamily: 'Segoe MDL2 Assets', fontSize: 11 }}>&#xE922;</span>
              </button>
            )}
            <button
              className="w-10 h-10 px-0 flex items-center justify-center hover:bg-windowred hover:text-white transition-colors select-none"
              title="Close"
              onClick={async () => { const window = getCurrentWindow(); await window.close(); }}
            >
              <span style={{ fontFamily: 'Segoe MDL2 Assets', fontSize: 11 }}>&#xE8BB;</span>
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
                {sidebarCollapsed ? (
                  <SquareChevronRight className="w-6 h-6" />
                ) : (
                  <SquareChevronLeft className="w-6 h-6" />
                )}
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900 border-none w-7 h-7"
                    onClick={() => setEmptyTrashDialogOpen(true)}
                    title="Empty Trash"
                    aria-label="Empty Trash"
                    disabled={deletedNotes.length === 0}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
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
                          className="text-gray-400 hover:text-indigo-500 hover:bg-[hsl(var(--code-block-background))] border-none w-7 h-7 relative"
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
                <h2 className="text-2xl font-medium text-[hsl(var(--foreground))] mb-3">Open, Write and Close</h2>
                <p className="text-[hsl(var(--muted-foreground))] mb-6 text-base">This space is yours. Select or start a note</p>
                <Button
                  onClick={handleCreateNote}
                  className="bg-[hsl(var(--foreground))] text-[hsl(var(--background))] border-none"
                >
                  Create New Note
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Replace the AlertDialog for empty trash with a styled popup */}
      {emptyTrashDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center border border-[hsl(var(--border))] relative">
            <div className="text-2xl font-bold mb-2 text-center">Empty Trash?</div>
            <div className="text-sm text-muted-foreground mb-6 text-center">Are you sure you want to empty your trash? This will permanently delete all notes in the trash. This action cannot be undone.</div>
            <div className="flex flex-col w-full gap-3 mt-2">
              <button
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow border border-[hsl(var(--border))] bg-background text-foreground hover:bg-muted transition disabled:opacity-60"
                onClick={() => setEmptyTrashDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-base shadow hover:bg-red-700 transition disabled:opacity-60 bg-red-600 text-white"
                onClick={() => {
                  setNotes(notes.filter(note => !note.deleted));
                  setSelectedNote(null);
                  setEmptyTrashDialogOpen(false);
                }}
              >
                Empty Trash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
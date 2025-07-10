import { useState, useEffect, useRef } from 'react';
import type { Note } from '../pages/Index';
// import { saveNoteToFile } from '../lib/utils';
import { formatRelativeDate } from '../lib/utils';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from './ui/context-menu';
import { Box, Trash2, RotateCcw } from 'lucide-react';

interface NoteEditorProps {
  note: Note;
  onUpdate: (note: Note) => void;
  isDark: boolean;
  alignLeft?: number;
  onTitleChange?: (title: string) => void;
  onClose?: () => void;
  setSaving?: (saving: boolean) => void;
  // Context menu props
  contextType?: 'archive' | 'trash';
  onRemoveFromArchive?: (noteId: string) => void;
  onRestore?: (noteId: string) => void;
  onDeletePermanently?: (noteId: string) => void;
}

export const NoteEditor = ({ note, onUpdate, alignLeft = 0, onTitleChange, onClose, setSaving, contextType, onRemoveFromArchive, onRestore, onDeletePermanently }: NoteEditorProps) => {
  const [title, setTitle] = useState(note.title || '');
  const [content, setContent] = useState(note.content);
  const [] = useState('');
  const [, setContentRerender] = useState(false); // for placeholder
  const [isContentEmpty, setIsContentEmpty] = useState(true);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevNoteId = useRef(note.id);
  // Add a ref to store the caret position
  const caretPositionRef = useRef<{start: number, end: number} | null>(null);

  useEffect(() => {
    // Only update when switching to a different note or when note's archive/trash/content status changes
    setTitle(note.title || '');
    setContent(note.content);
    if (titleRef.current) {
      titleRef.current.innerText = note.title || '';
    }
    // Only update contentRef.current.innerText if the note ID has changed (i.e., a new note is loaded) or if the div is empty (initial mount)
    if (contentRef.current && (prevNoteId.current !== note.id || contentRef.current.innerText === '')) {
      contentRef.current.innerText = note.content || '';
      setIsContentEmpty(!note.content || note.content.trim() === '');
    }
    setContentRerender(r => !r); // force placeholder check
    prevNoteId.current = note.id;
  }, [note.id, note.archived, note.deleted, note.content]);

  // Helper to get caret position in contentEditable div
  function getCaretPosition(element: HTMLElement | null) {
    if (!element) return { start: 0, end: 0 };
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return { start: 0, end: 0 };
    const range = selection.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(element);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;
    return { start, end: start + range.toString().length };
  }

  // Helper to set caret position in contentEditable div
  function setCaretPosition(element: HTMLElement | null, position: number) {
    if (!element) return;
    const setPos = (el: Node, pos: number): boolean => {
      if (el.nodeType === 3) { // text node
        if (el.textContent) {
          if (pos <= el.textContent.length) {
            const range = document.createRange();
            const sel = window.getSelection();
            range.setStart(el, pos);
            range.collapse(true);
            sel?.removeAllRanges();
            sel?.addRange(range);
            return true;
          } else {
            pos -= el.textContent.length;
          }
        }
      } else {
        for (let i = 0; i < el.childNodes.length; i++) {
          const child = el.childNodes[i];
          const found = setPos(child, pos);
          if (found) return true;
          if (child.textContent) pos -= child.textContent.length;
        }
      }
      return false;
    };
    setPos(element, position);
  }

  const handleSave = () => {
    const updatedNote = {
      ...note,
      title,
      content, // Use React state, not contentRef.current.innerText
      updatedAt: new Date(),
    };
    onUpdate(updatedNote);
    // saveNoteToFile(title, content);
  };

  // Only update state and save on blur
  const handleContentBlur = () => {
    const newContent = contentRef.current ? contentRef.current.innerText : '';
    setContent(newContent);
    handleSave();
    setContentRerender(r => !r); // update placeholder
  };




  // Auto-save functionality (debounced)
  useEffect(() => {
    if (setSaving) setSaving(true);
    // Save caret position before content changes
    if (contentRef.current && document.activeElement === contentRef.current) {
      caretPositionRef.current = getCaretPosition(contentRef.current);
    }
    const timeoutId = setTimeout(() => {
      if (title !== note.title || content !== note.content) {
        handleSave();
      }
      if (setSaving) setSaving(false);
    }, 800); // 800ms debounce

    return () => clearTimeout(timeoutId);
  }, [title, content]);

  // Restore caret position after content changes
  useEffect(() => {
    if (contentRef.current && caretPositionRef.current && document.activeElement === contentRef.current) {
      setCaretPosition(contentRef.current, caretPositionRef.current.start);
      caretPositionRef.current = null;
    }
  }, [content]);

  return (
    contextType ? (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="h-full flex flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Escape' && typeof onClose === 'function') {
                e.stopPropagation();
                handleSave(); // Force save before closing
                onClose();
              }
            }}
          >
            {/* Editor Content */}
            <div
              className="flex-1 p-8 w-full"
              style={{ paddingLeft: alignLeft, paddingRight: alignLeft }}
            >
              {/* Editable Title */}
              <div className="relative mb-2">
                <h1
                  ref={titleRef}
                  className="text-4xl font-bold leading-tight outline-none bg-transparent text-[hsl(var(--foreground))] min-h-[48px]"
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck={false}
                  dir="ltr"
                  onBlur={() => {
                    const newTitle = titleRef.current ? titleRef.current.innerText : '';
                    setTitle(newTitle);
                    if (typeof onTitleChange === 'function') onTitleChange(newTitle);
                    handleSave();
                  }}
                  onInput={() => {
                    const newTitle = titleRef.current ? titleRef.current.innerText : '';
                    setTitle(newTitle);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      (e.target as HTMLElement).blur();
                    }
                  }}
                />
                {(!title || title.trim() === '') && (
                  <span
                    className="absolute left-0 top-0 text-4xl font-bold leading-tight text-[hsl(var(--muted-foreground))] pointer-events-none select-none"
                    style={{ userSelect: 'none' }}
                  >
                    Untitled Note
                  </span>
                )}
              </div>
              {/* Metadata */}
              <div className="flex items-center space-x-4 mb-4 text-sm text-[hsl(var(--muted-foreground))">
                <span>Created {formatRelativeDate(note.createdAt)}</span>
                <span className="text-[hsl(var(--muted-foreground))]">•</span>
                <span>Last modified {formatRelativeDate(note.updatedAt)}</span>
              </div>
              {/* Editable Content */}
              <div className="relative min-h-[300px]">
                <div
                  ref={contentRef}
                  className="flex-1 text-base text-[hsl(var(--foreground))] bg-transparent outline-none focus:outline-none min-h-[300px]"
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck={true}
                  style={{ whiteSpace: 'pre-wrap' }}
                  onBlur={handleContentBlur}
                  onInput={e => {
                    const newContent = (e.currentTarget as HTMLElement).innerText;
                    setContent(newContent);
                    setIsContentEmpty(!newContent || newContent.trim() === '');
                  }}
                ></div>
                {isContentEmpty && (
                  <span
                    className="absolute left-0 top-0 text-base text-[hsl(var(--muted-foreground))] pointer-events-none select-none mt-1"
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    Start writing your note...
                  </span>
                )}
              </div>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {contextType === 'archive' && (
            <>
              <ContextMenuItem onClick={e => {
                e.preventDefault();
                e.stopPropagation(); // ✅ Prevents blur-triggered autosave
                onRemoveFromArchive && onRemoveFromArchive(note.id);
              }}>
                <Box className="w-4 h-4 mr-2" />
                Remove from Archive
              </ContextMenuItem>
              <ContextMenuItem onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                onDeletePermanently && onDeletePermanently(note.id);
              }} variant="destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Permanently
              </ContextMenuItem>
            </>
          )}
          {contextType === 'trash' && (
            <>
              <ContextMenuItem onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                onRestore && onRestore(note.id);
              }}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Restore
              </ContextMenuItem>
              <ContextMenuItem onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                onDeletePermanently && onDeletePermanently(note.id);
              }} variant="destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Permanently
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    ) : (
      <div className="h-full flex flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Escape' && typeof onClose === 'function') {
            e.stopPropagation();
            handleSave(); // Force save before closing
            onClose();
          }
        }}
      >
        {/* Editor Content */}
        <div
          className="flex-1 p-8 w-full"
          style={{ paddingLeft: alignLeft, paddingRight: alignLeft }}
        >
          {/* Editable Title */}
          <div className="relative mb-2">
            <h1
              ref={titleRef}
              className="text-4xl font-bold leading-tight outline-none bg-transparent text-[hsl(var(--foreground))] min-h-[48px]"
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              dir="ltr"
              onBlur={() => {
                const newTitle = titleRef.current ? titleRef.current.innerText : '';
                setTitle(newTitle);
                if (typeof onTitleChange === 'function') onTitleChange(newTitle);
                handleSave();
              }}
              onInput={() => {
                const newTitle = titleRef.current ? titleRef.current.innerText : '';
                setTitle(newTitle);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (e.target as HTMLElement).blur();
                }
              }}
            />
            {(!title || title.trim() === '') && (
              <span
                className="absolute left-0 top-0 text-4xl font-bold leading-tight text-[hsl(var(--muted-foreground))] pointer-events-none select-none"
                style={{ userSelect: 'none' }}
              >
                Untitled Note
              </span>
            )}
          </div>
          {/* Metadata */}
          <div className="flex items-center space-x-4 mb-4 text-sm text-[hsl(var(--muted-foreground))">
            <span>Created {formatRelativeDate(note.createdAt)}</span>
            <span className="text-[hsl(var(--muted-foreground))]">•</span>
            <span>Last modified {formatRelativeDate(note.updatedAt)}</span>
          </div>
          {/* Editable Content */}
          <div className="relative min-h-[300px]">
            <div
              ref={contentRef}
              className="flex-1 text-base text-[hsl(var(--foreground))] bg-transparent outline-none focus:outline-none min-h-[300px]"
              contentEditable
              suppressContentEditableWarning
              spellCheck={true}
              style={{ whiteSpace: 'pre-wrap' }}
              onBlur={handleContentBlur}
              onInput={e => {
                const newContent = (e.currentTarget as HTMLElement).innerText;
                setContent(newContent);
                setIsContentEmpty(!newContent || newContent.trim() === '');
              }}
            ></div>
            {isContentEmpty && (
              <span
                className="absolute left-0 top-0 text-base text-[hsl(var(--muted-foreground))] pointer-events-none select-none mt-1"
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >
                Start writing your note...
              </span>
            )}
          </div>
        </div>
      </div>
    )
  );
};
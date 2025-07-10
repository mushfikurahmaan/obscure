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
  const [tags, setTags] = useState<string[]>(note.tags);
  const [] = useState('');
  const [category, setCategory] = useState(note.category);
  const [, setContentRerender] = useState(false); // for placeholder
  const [isContentEmpty, setIsContentEmpty] = useState(true);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevNoteId = useRef(note.id);

  useEffect(() => {
    // Only update when switching to a different note
    setTitle(note.title || '');
    setContent(note.content);
    setTags(note.tags);
    setCategory(note.category);
    if (titleRef.current) {
      titleRef.current.innerText = note.title || '';
    }
    if (contentRef.current) {
      contentRef.current.innerText = note.content || '';
      setIsContentEmpty(!note.content || note.content.trim() === '');
    }
    setContentRerender(r => !r); // force placeholder check
    prevNoteId.current = note.id;
  }, [note.id]);

  const handleSave = () => {
    const updatedNote = {
      ...note,
      title,
      content: contentRef.current ? contentRef.current.innerText : '',
      tags,
      category,
      updatedAt: new Date(),
    };
    onUpdate(updatedNote);
    // saveNoteToFile(title, contentRef.current ? contentRef.current.innerText : '');
  };

  // Only update state and save on blur
  const handleContentBlur = () => {
    const newContent = contentRef.current ? contentRef.current.innerText : '';
    setContent(newContent);
    handleSave();
    setContentRerender(r => !r); // update placeholder
  };




  // Auto-save functionality
  useEffect(() => {
    if (setSaving) setSaving(true);
    const timeoutId = setTimeout(() => {
      if (title !== note.title || content !== note.content || tags !== note.tags || category !== note.category) {
        handleSave();
      }
      if (setSaving) setSaving(false);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [title, content, tags, category]);

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
              <ContextMenuItem onClick={() => onRemoveFromArchive && onRemoveFromArchive(note.id)}>
                <Box className="w-4 h-4 mr-2" />
                Remove from Archive
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onDeletePermanently && onDeletePermanently(note.id)} variant="destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Permanently
              </ContextMenuItem>
            </>
          )}
          {contextType === 'trash' && (
            <>
              <ContextMenuItem onClick={() => onRestore && onRestore(note.id)}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Restore
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onDeletePermanently && onDeletePermanently(note.id)} variant="destructive">
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
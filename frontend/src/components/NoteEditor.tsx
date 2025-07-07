import { useState, useEffect, useRef } from 'react';
import { Tag, Plus, X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Note } from '../pages/Index';
import { saveNoteToFile } from '../lib/utils';
import { formatRelativeDate } from '../lib/utils';

interface NoteEditorProps {
  note: Note;
  onUpdate: (note: Note) => void;
  isDark: boolean;
  alignLeft?: number;
  onTitleChange?: (title: string) => void;
  onClose?: () => void;
  setSaving?: (saving: boolean) => void;
}

export const NoteEditor = ({ note, onUpdate, isDark, alignLeft = 0, onTitleChange, onClose, setSaving }: NoteEditorProps) => {
  const [title, setTitle] = useState(note.title || '');
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState<string[]>(note.tags);
  const [newTag, setNewTag] = useState('');
  const [category, setCategory] = useState(note.category);
  const [contentRerender, setContentRerender] = useState(false); // for placeholder
  const [isContentEmpty, setIsContentEmpty] = useState(true);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevNoteId = useRef(note.id);

  useEffect(() => {
    // Only update DOM content if switching to a different note
    if (note.id !== prevNoteId.current) {
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
    }
  }, [note]);

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
    saveNoteToFile(title, contentRef.current ? contentRef.current.innerText : '');
  };

  // Only update state and save on blur
  const handleContentBlur = () => {
    const newContent = contentRef.current ? contentRef.current.innerText : '';
    setContent(newContent);
    handleSave();
    setContentRerender(r => !r); // update placeholder
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
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
    <div className="h-full flex flex-col" style={{ backgroundColor: '#1c1c1c' }}
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Escape' && typeof onClose === 'function') {
          e.stopPropagation();
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
            className="text-4xl font-bold leading-tight outline-none bg-transparent text-white min-h-[48px]"
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            dir="ltr"
            onBlur={e => {
              const newTitle = titleRef.current ? titleRef.current.innerText : '';
              setTitle(newTitle);
              if (typeof onTitleChange === 'function') onTitleChange(newTitle);
              handleSave();
            }}
            onInput={e => {
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
              className="absolute left-0 top-0 text-4xl font-bold leading-tight text-gray-500 pointer-events-none select-none"
              style={{ userSelect: 'none' }}
            >
              Untitled Note
            </span>
          )}
        </div>
        {/* Metadata */}
        <div className="flex items-center space-x-4 mb-4 text-sm text-gray-400">
          <span>Created {formatRelativeDate(note.createdAt)}</span>
          <span className="text-gray-600">•</span>
          <span>Last modified {formatRelativeDate(note.updatedAt)}</span>
        </div>
        {/* Editable Content */}
        <div className="relative min-h-[300px]">
          <div
            ref={contentRef}
            className="flex-1 text-base text-gray-200 bg-transparent outline-none focus:outline-none min-h-[300px]"
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
              className="absolute left-0 top-0 text-base text-gray-500 pointer-events-none select-none mt-1"
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              Start writing your note...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
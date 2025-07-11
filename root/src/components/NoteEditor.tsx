import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createEditor, type Descendant, Editor, Transforms, Range, Element as SlateElement } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import { withHistory } from 'slate-history';
import type { Note } from '../pages/Index';
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

// Custom types for Slate
type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: 'small' | 'medium' | 'large' | 'h1' | 'h2' | 'h3';
  color?: string;
  highlight?: boolean;
  highlightColor?: string;
  code?: boolean;
}

type CustomElement = {
  type: 'paragraph' | 'code-block';
  children: CustomText[];
}

declare module 'slate' {
  interface CustomTypes {
    Editor: ReactEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

// Helper functions for Slate
const isMarkActive = (editor: Editor, format: string) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format as keyof Omit<CustomText, "text">] === true : false;
};

const toggleMark = (editor: Editor, format: string, value?: any) => {
  const isActive = isMarkActive(editor, format);
  
  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, value || true);
  }
};

const isBlockActive = (editor: Editor, format: string) => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === format,
    })
  );

  return !!match;
};

const toggleBlock = (editor: Editor, format: string) => {
  const isActive = isBlockActive(editor, format);
  
  Transforms.setNodes(
    editor,
    { type: isActive ? 'paragraph' : format as 'paragraph' | 'code-block' },
    { match: n => !Editor.isEditor(n) && SlateElement.isElement(n) }
  );
};

// Convert content to Slate value - handles both plain text and rich text JSON
const contentToSlateValue = (content: string): Descendant[] => {
  if (!content || content.trim() === '') {
    return [{ type: 'paragraph', children: [{ text: '' }] }];
  }
  
  // Try to parse as JSON first (rich text data)
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as Descendant[];
    }
  } catch (e) {
    // If JSON parsing fails, treat as plain text
  }
  
  // Convert plain text to Slate value
  const lines = content.split('\n');
  return lines.map(line => ({
    type: 'paragraph' as const,
    children: [{ text: line }]
  }));
};

// Convert Slate value to plain text (for display/search purposes)
const slateValueToText = (value: Descendant[]): string => {
  return value.map(node => {
    if ('children' in node) {
      return node.children.map(child => ('text' in child ? child.text : '')).join('');
    }
    return '';
  }).join('\n');
};

// Convert Slate value to JSON string (for storage)
const slateValueToJSON = (value: Descendant[]): string => {
  return JSON.stringify(value);
};

// Highlighter colors
const HIGHLIGHTER_COLORS = [
  { name: 'Yellow', color: '#FFFF00', darkColor: '#FFD700' },
  { name: 'Green', color: '#00FF7F', darkColor: '#32CD32' },
  { name: 'Pink', color: '#FF69B4', darkColor: '#FF1493' },
  { name: 'Orange', color: '#FF8C00', darkColor: '#FF6347' },
  { name: 'Blue', color: '#87CEEB', darkColor: '#00BFFF' },
  { name: 'Purple', color: '#DDA0DD', darkColor: '#BA55D3' },
];

// Rich text context menu component
const RichTextContextMenu = ({ 
  editor, 
  isVisible, 
  position, 
  onClose 
}: {
  editor: ReactEditor;
  isVisible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
}) => {
  const [showHighlighterPalette, setShowHighlighterPalette] = useState(false);
  const [selectedHighlightColor, setSelectedHighlightColor] = useState(HIGHLIGHTER_COLORS[0].color);
  const highlighterRef = useRef<HTMLDivElement>(null);

  // Fix: Always call useEffect, but handle the conditional logic inside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (highlighterRef.current && !highlighterRef.current.contains(e.target as Node)) {
        setShowHighlighterPalette(false);
      }
    };

    if (showHighlighterPalette) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showHighlighterPalette]);

  if (!isVisible) return null;

  // Icon SVGs (inline for simplicity)
  const icons = {
    bold: (
      <svg width="16" height="16" fill="none" viewBox="0 0 20 20" className="w-4 h-4"><path stroke="currentColor" strokeWidth="2" d="M7 4h4a3 3 0 0 1 0 6H7zm0 6h5a3 3 0 1 1 0 6H7z"/></svg>
    ),
    italic: (
      <svg width="16" height="16" fill="none" viewBox="0 0 20 20" className="w-4 h-4"><path stroke="currentColor" strokeWidth="2" d="M10 4h4M6 16h4m2-12-4 12"/></svg>
    ),
    underline: (
      <svg width="16" height="16" fill="none" viewBox="0 0 20 20" className="w-4 h-4"><path stroke="currentColor" strokeWidth="2" d="M6 4v5a4 4 0 0 0 8 0V4M5 16h10"/></svg>
    ),
    code: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-code-icon w-4 h-4"><path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/></svg>
    ),
    highlight: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-highlighter-icon w-4 h-4"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>
    ),
  };

  // Handlers for formatting
  const handleMark = (format: string) => {
    toggleMark(editor, format);
    ReactEditor.focus(editor);
    onClose();
  };

  const handleCodeBlock = () => {
    toggleMark(editor, 'code');
    ReactEditor.focus(editor);
    onClose();
  };

  const handleHighlight = (color?: string) => {
    const colorToUse = color || selectedHighlightColor;
    
    // Check if already highlighted
    const marks = Editor.marks(editor);
    const isHighlighted = marks?.highlight;
    
    if (isHighlighted) {
      // Remove highlight
      Editor.removeMark(editor, 'highlight');
      Editor.removeMark(editor, 'highlightColor');
    } else {
      // Add highlight with color
      Editor.addMark(editor, 'highlight', true);
      Editor.addMark(editor, 'highlightColor', colorToUse);
    }
    
    ReactEditor.focus(editor);
    if (!color) { // Only close if not selecting a color
    onClose();
    }
  };

  const handleHighlighterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowHighlighterPalette(!showHighlighterPalette);
  };

  const handleColorSelect = (color: string) => {
    setSelectedHighlightColor(color);
    handleHighlight(color);
    setShowHighlighterPalette(false);
  };

  // Modern floating toolbar with arrow
  return (
    <div
      className="fixed z-50"
      style={{ left: position.x, top: position.y }}
      onMouseDown={e => e.preventDefault()}
    >
      {/* Arrow */}
      <div style={{
        position: 'absolute',
        top: -8,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 16,
        height: 8,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        <svg width="16" height="8"><polygon points="8,0 16,8 0,8" fill="#222"/></svg>
      </div>
      
      {/* Main Toolbar */}
      <div
        className="flex items-center gap-1 rounded-lg shadow-xl px-2 py-1 relative"
        style={{
          background: 'rgba(34,34,34,0.98)',
          borderRadius: 8,
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        }}
      >
        
        {/* Text Size Buttons */}
        <button
          className="px-1 py-1 text-base text-gray-200 hover:bg-gray-700 rounded transition w-8 h-8 flex items-center justify-center"
          title="Heading 1"
          onClick={() => { toggleMark(editor, 'fontSize', 'h1'); ReactEditor.focus(editor); onClose(); }}
          style={{lineHeight: 1}}
        >
          H1
      </button>
      <button
          className="px-1 py-1 text-base text-gray-200 hover:bg-gray-700 rounded transition w-8 h-8 flex items-center justify-center"
          title="Heading 2"
          onClick={() => { toggleMark(editor, 'fontSize', 'h2'); ReactEditor.focus(editor); onClose(); }}
          style={{lineHeight: 1}}
        >
          H2
      </button>
      <button
          className="px-1 py-1 text-base text-gray-200 hover:bg-gray-700 rounded transition w-8 h-8 flex items-center justify-center"
          title="Heading 3"
          onClick={() => { toggleMark(editor, 'fontSize', 'h3'); ReactEditor.focus(editor); onClose(); }}
          style={{lineHeight: 1}}
        >
          H3
      </button>
      
      <button
            className="p-1 text-gray-200 hover:bg-gray-700 rounded transition"
            title="Bold"
            onClick={() => handleMark('bold')}
      >
            {icons.bold}
      </button>
      <button
            className="p-1 text-gray-200 hover:bg-gray-700 rounded transition"
            title="Italic"
            onClick={() => handleMark('italic')}
      >
            {icons.italic}
      </button>
      <button
            className="p-1 text-gray-200 hover:bg-gray-700 rounded transition"
            title="Underline"
            onClick={() => handleMark('underline')}
      >
            {icons.underline}
      </button>
      <button
            className="p-1 text-gray-200 hover:bg-gray-700 rounded transition"
            title="Code Block"
            onClick={handleCodeBlock}
      >
            {icons.code}
      </button>
        
        {/* Highlighter with Color Palette */}
        <div ref={highlighterRef} className="relative">
      <button
              className="p-1 text-gray-200 hover:bg-gray-700 rounded transition relative"
              title="Highlight"
              onClick={handleHighlighterClick}
          >
              {icons.highlight}
              {/* Color indicator */}
              <div 
                className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-1 rounded-full"
                style={{ backgroundColor: selectedHighlightColor }}
              />
      </button>
      
          {/* Sliding Color Palette */}
          <div
            className="absolute left-full top-0 ml-2 overflow-hidden transition-all duration-300 ease-out"
            style={{
              width: showHighlighterPalette ? '200px' : '0px',
              opacity: showHighlighterPalette ? 1 : 0,
            }}
          >
            <div
              className="flex items-center gap-2 rounded-lg shadow-xl px-3 py-2 whitespace-nowrap"
              style={{
                background: 'rgba(34,34,34,0.98)',
                borderRadius: 8,
                boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                minWidth: '200px',
              }}
            >
              {HIGHLIGHTER_COLORS.map((highlighter, index) => (
      <button
                  key={index}
                  className="w-6 h-6 rounded-full border-2 border-gray-600 hover:border-gray-400 transition-colors flex-shrink-0"
                  style={{ backgroundColor: highlighter.color }}
                  title={highlighter.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleColorSelect(highlighter.color);
                  }}
                >
                  {selectedHighlightColor === highlighter.color && (
                    <div className="w-full h-full rounded-full border-2 border-white" />
                  )}
      </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const NoteEditor = ({ note, onUpdate, alignLeft = 0, onTitleChange, onClose, setSaving, contextType, onRemoveFromArchive, onRestore, onDeletePermanently }: NoteEditorProps) => {
  const [title, setTitle] = useState(note.title || '');
  const [content, setContent] = useState(note.content);
  const [isContentEmpty, setIsContentEmpty] = useState(true);
  
  // Rich text context menu state
  const [showRichTextMenu, setShowRichTextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const titleRef = useRef<HTMLHeadingElement>(null);
  const prevNoteId = useRef(note.id);
  const editorRef = useRef<ReactEditor | null>(null);
  
  // Slate editor setup - create new editor for each note
  const editor = useMemo(() => {
    const newEditor = withHistory(withReact(createEditor()));
    editorRef.current = newEditor;
    return newEditor;
  }, [note.id]);
  const [slateValue, setSlateValue] = useState<Descendant[]>(() => contentToSlateValue(note.content));

  // Custom render functions for Slate
  const renderElement = useCallback((props: any) => {
    switch (props.element.type) {
      case 'code-block':
        return (
          <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md font-mono text-sm my-2" {...props.attributes}>
            <code>{props.children}</code>
          </pre>
        );
      default:
        return <p {...props.attributes}>{props.children}</p>;
    }
  }, []);

  const renderLeaf = useCallback((props: any) => {
    let { attributes, children, leaf } = props;
    
    if (leaf.bold) {
      children = <strong>{children}</strong>;
    }
    
    if (leaf.italic) {
      children = <em>{children}</em>;
    }
    
    if (leaf.underline) {
      children = <u>{children}</u>;
    }
    
    // Inline code styling
    if (leaf.code) {
      children = <code style={{
        background: '#f4f4f5',
        color: '#d7263d',
        borderRadius: 4,
        padding: '2px 6px',
        fontFamily: 'monospace',
        fontSize: '0.95em',
      }}>{children}</code>;
    }
    
    const style: React.CSSProperties = {};
    
    if (leaf.fontSize) {
      switch (leaf.fontSize) {
        case 'h1':
          style.fontSize = '2.5rem'; // 40px (text-4xl to text-6xl)
          style.fontWeight = 700;
          break;
        case 'h2':
          style.fontSize = '2rem'; // 32px (text-2xl to text-4xl)
          style.fontWeight = 700;
          break;
        case 'h3':
          style.fontSize = '1.5rem'; // 24px (text-xl to text-2xl)
          style.fontWeight = 700;
          break;
      }
    }
    
    if (leaf.color) {
      style.color = leaf.color;
    }
    
    if (leaf.highlight) {
      // Use the custom highlight color if available, otherwise fall back to default
      style.backgroundColor = leaf.highlightColor || '#FFFF00';
      style.color = "#000";
    }
    
    return (
      <span {...attributes} style={style}>
        {children}
      </span>
    );
  }, []);

  useEffect(() => {
    // Only update when switching to a different note
    setTitle(note.title || '');
    
    if (titleRef.current) {
      titleRef.current.innerText = note.title || '';
    }
    
    // Update Slate value when note changes - always reset for note changes
    if (prevNoteId.current !== note.id) {
      const newSlateValue = contentToSlateValue(note.content);
      setSlateValue(newSlateValue);
      
      // Update plain text content state
      const plainTextContent = slateValueToText(newSlateValue);
      setContent(plainTextContent);
      setIsContentEmpty(!plainTextContent || plainTextContent.trim() === '');
      
      // Reset editor selection and content only when switching notes
      editor.selection = null;
      editor.children = newSlateValue;
      editor.onChange();
    }
    
    prevNoteId.current = note.id;
  }, [note.id, note.archived, note.deleted, note.content, editor]);

  const handleSave = () => {
    // Save rich text data as JSON, but also maintain plain text for backward compatibility
    const richTextContent = slateValueToJSON(slateValue);
    
    const updatedNote = {
      ...note,
      title,
      content: richTextContent, // Store rich text JSON
      updatedAt: new Date(),
    };
    onUpdate(updatedNote);
  };

  const handleSlateChange = (newValue: Descendant[]) => {
    setSlateValue(newValue);
    const plainTextContent = slateValueToText(newValue);
    setContent(plainTextContent); // Keep plain text in state for empty check
    setIsContentEmpty(!plainTextContent || plainTextContent.trim() === '');
  };

  const handleSlateBlur = () => {
    // Only save on blur, not on every change
    handleSave();
  };

  // Handle right-click context menu for rich text
  const handleContextMenu = (e: React.MouseEvent) => {
    const { selection } = editor;
    
    // Only show rich text menu if there's a selection
    if (selection && !Range.isCollapsed(selection)) {
      e.preventDefault();
      setMenuPosition({ x: e.clientX, y: e.clientY });
      setShowRichTextMenu(true);
    }
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setShowRichTextMenu(false);
    if (showRichTextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [showRichTextMenu]);

  // Auto-save functionality (debounced)
  useEffect(() => {
    if (setSaving) setSaving(true);
    const timeoutId = setTimeout(() => {
      const currentRichTextContent = slateValueToJSON(slateValue);
      if (title !== note.title || currentRichTextContent !== note.content) {
        handleSave();
      }
      if (setSaving) setSaving(false);
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [title, slateValue, note.title, note.content]);

  const editorContent = (
    <div className="h-full flex flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Escape' && typeof onClose === 'function') {
          e.stopPropagation();
          handleSave();
          onClose();
        }
      }}
    >
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

        {/* Rich Text Editor Content */}
        <div className="relative min-h-[300px]">
          <Slate
            editor={editor}
            initialValue={slateValue}
            onChange={handleSlateChange}
          >
            <Editable
              className="flex-1 text-base text-[hsl(var(--foreground))] bg-transparent outline-none focus:outline-none min-h-[300px]"
              style={{ whiteSpace: 'pre-wrap' }}
              renderElement={renderElement}
              renderLeaf={renderLeaf}
              placeholder="Start writing your note..."
              spellCheck={true}
              onContextMenu={handleContextMenu}
              onBlur={handleSlateBlur}
            />
          </Slate>
          
          {/* Rich text context menu */}
          <RichTextContextMenu
            editor={editor}
            isVisible={showRichTextMenu}
            position={menuPosition}
            onClose={() => setShowRichTextMenu(false)}
          />
        </div>
      </div>
    </div>
  );

  return (
    contextType ? (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {editorContent}
        </ContextMenuTrigger>
        <ContextMenuContent>
          {contextType === 'archive' && (
            <>
              <ContextMenuItem onClick={e => {
                e.preventDefault();
                e.stopPropagation();
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
      editorContent
    )
  );
};
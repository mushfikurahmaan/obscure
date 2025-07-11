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
  fontSize?: 'h1' | 'h2' | 'h3';
  color?: string;
  highlight?: boolean;
  highlightColor?: string;
  code?: boolean;
}

type CustomElement =
  | { type: 'paragraph' | 'code-block'; children: CustomText[] }
  | { type: 'link'; url: string; children: CustomText[] }
  | { type: 'image'; url: string; children: CustomText[] };

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

// Text colors
const TEXT_COLORS = [
  { name: 'Black', color: '#000000' },
  { name: 'Blue', color: '#0000FF' },
  { name: 'Red', color: '#FF0000' },
  { name: 'Green', color: '#008000' },
  { name: 'Purple', color: '#800080' },
  { name: 'Orange', color: '#FFA500' },
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
  const [showTextColorPalette, setShowTextColorPalette] = useState(false);
  const [selectedHighlightColor, setSelectedHighlightColor] = useState(HIGHLIGHTER_COLORS[0].color);
  const [selectedTextColor, setSelectedTextColor] = useState(TEXT_COLORS[0].color);
  const highlighterRef = useRef<HTMLDivElement>(null);
  const textColorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // --- NEW: Track menu and palette positions ---
  const [menuStyle, setMenuStyle] = useState<{ left: number; top: number } | null>(null);
  const [paletteDirection, setPaletteDirection] = useState<'right' | 'left'>('right');

  // Handle clicks outside the menu to close it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
      if (highlighterRef.current && !highlighterRef.current.contains(e.target as Node)) {
        setShowHighlighterPalette(false);
      }
      if (textColorRef.current && !textColorRef.current.contains(e.target as Node)) {
        setShowTextColorPalette(false);
      }
    };
    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onClose]);

  // --- NEW: Reposition menu and palettes to stay in viewport ---
  useEffect(() => {
    if (!isVisible) return;
    const reposition = () => {
      if (!menuRef.current) return;
      const menuRect = menuRef.current.getBoundingClientRect();
      let left = position.x;
      let top = position.y;
      // Shift left if overflowing right
      if (left + menuRect.width > window.innerWidth) {
        left = Math.max(8, window.innerWidth - menuRect.width - 8);
      }
      // Shift up if overflowing bottom
      if (top + menuRect.height > window.innerHeight) {
        top = Math.max(8, window.innerHeight - menuRect.height - 8);
      }
      setMenuStyle({ left, top });
      // Decide palette direction (right or left)
      // Assume palette width is 200px
      const paletteWidth = 200;
      if (left + menuRect.width + paletteWidth > window.innerWidth) {
        setPaletteDirection('left');
      } else {
        setPaletteDirection('right');
      }
    };
    // Timeout to allow menu to render and get dimensions
    setTimeout(reposition, 0);
  }, [isVisible, position.x, position.y]);

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
    textColor: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-type-icon w-4 h-4"><polyline points="4,7 4,4 20,4 20,7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
    ),
    link: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
    ),
    image: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image-icon w-4 h-4"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
    ),
  };

  // Handlers for formatting - REMOVED onClose() calls
  const handleMark = (format: string) => {
    toggleMark(editor, format);
    ReactEditor.focus(editor);
    // DON'T close the menu - let user apply multiple formats
  };

  const handleCodeBlock = () => {
    toggleMark(editor, 'code');
    ReactEditor.focus(editor);
    // DON'T close the menu
  };

  const handleFontSize = (size: string) => {
    if (size === 'default') {
      Editor.removeMark(editor, 'fontSize');
    } else {
      toggleMark(editor, 'fontSize', size);
    }
    ReactEditor.focus(editor);
    // DON'T close the menu
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
    // DON'T close the menu when applying highlight
  };

  const handleTextColor = (color?: string) => {
    const colorToUse = color || selectedTextColor;
    
    // Check if text already has this color
    const marks = Editor.marks(editor);
    const currentColor = marks?.color;
    
    if (currentColor === colorToUse) {
      // Remove color (reset to default)
      Editor.removeMark(editor, 'color');
    } else {
      // Set new color
      Editor.addMark(editor, 'color', colorToUse);
    }
    
    ReactEditor.focus(editor);
    // DON'T close the menu when applying color
  };

  const handleHighlighterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowHighlighterPalette(!showHighlighterPalette);
    setShowTextColorPalette(false); // Close text color palette
  };

  const handleTextColorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTextColorPalette(!showTextColorPalette);
    setShowHighlighterPalette(false); // Close highlighter palette
  };

  const handleHighlightColorSelect = (color: string) => {
    setSelectedHighlightColor(color);
    handleHighlight(color);
    setShowHighlighterPalette(false);
  };

  const handleTextColorSelect = (color: string) => {
    setSelectedTextColor(color);
    handleTextColor(color);
    setShowTextColorPalette(false);
  };

  const insertLink = () => {
    const url = window.prompt('Enter the URL for the link:');
    if (!url) return;
    if (editor.selection && !Range.isCollapsed(editor.selection)) {
      Transforms.wrapNodes(
        editor,
        { type: 'link', url, children: [] },
        { split: true, at: editor.selection }
      );
    }
    ReactEditor.focus(editor);
  };
  const removeLink = () => {
    Transforms.unwrapNodes(editor, { match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'link' });
    ReactEditor.focus(editor);
  };
  const isLinkActive = () => {
    const [match] = Editor.nodes(editor, { match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'link' });
    return !!match;
  };
  const insertImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = () => {
          const url = reader.result as string;
          Transforms.insertNodes(editor, { type: 'image', url, children: [{ text: '' }] });
          ReactEditor.focus(editor);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  // Modern floating toolbar with arrow
  return (
    <div
      ref={menuRef}
      className="fixed z-50"
      style={menuStyle ? { left: menuStyle.left, top: menuStyle.top } : { left: position.x, top: position.y }}
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
        <svg width="16" height="8"><polygon points="8,0 16,8 0,8" fill="#111113"/></svg>
      </div>
      
      {/* Main Toolbar */}
      <div
        className="flex items-center gap-1 rounded-lg shadow-xl px-2 py-1 relative"
        style={{
          background: '#111113',
          borderRadius: 8,
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        }}
      >
        
        {/* Text Size Buttons */}
        <button
          className="px-1 py-1 text-base text-gray-200 hover:bg-gray-700 rounded transition w-8 h-8 flex items-center justify-center"
          title="Heading 1"
          onClick={() => handleFontSize('h1')}
          style={{lineHeight: 1}}
        >
          H1
        </button>
        <button
          className="px-1 py-1 text-base text-gray-200 hover:bg-gray-700 rounded transition w-8 h-8 flex items-center justify-center"
          title="Heading 2"
          onClick={() => handleFontSize('h2')}
          style={{lineHeight: 1}}
        >
          H2
        </button>
        <button
          className="px-1 py-1 text-base text-gray-200 hover:bg-gray-700 rounded transition w-8 h-8 flex items-center justify-center"
          title="Heading 3"
          onClick={() => handleFontSize('h3')}
          style={{lineHeight: 1}}
        >
          H3
        </button>
        {/* Default button to revert to normal text */}
        <button
          className="px-1 py-1 text-base text-gray-200 hover:bg-gray-700 rounded transition w-8 h-8 flex items-center justify-center"
          title="Default"
          onClick={() => handleFontSize('default')}
          style={{lineHeight: 1}}
        >
          D
        </button>
        
        <button
          className="px-1 py-1 text-base text-gray-200 hover:bg-gray-700 rounded transition w-8 h-8 flex items-center justify-center"
          title="Bold"
          onClick={() => handleMark('bold')}
        >
          {icons.bold}
        </button>
        <button
          className="px-1 py-1 text-base text-gray-200 hover:bg-gray-700 rounded transition w-8 h-8 flex items-center justify-center"
          title="Italic"
          onClick={() => handleMark('italic')}
        >
          {icons.italic}
        </button>
        <button
          className="px-1 py-1 text-base text-gray-200 hover:bg-gray-700 rounded transition w-8 h-8 flex items-center justify-center"
          title="Underline"
          onClick={() => handleMark('underline')}
        >
          {icons.underline}
        </button>
        <button
          className="px-1 py-1 text-base text-gray-200 hover:bg-gray-700 rounded transition w-8 h-8 flex items-center justify-center"
          title="Code Block"
          onClick={handleCodeBlock}
        >
          {icons.code}
        </button>
        
        {/* Text Color with Color Palette */}
        <div ref={textColorRef} className="relative">
          <button
            className="px-1 py-1 text-base text-gray-200 hover:bg-gray-700 rounded transition relative"
            title="Text Color"
            onClick={handleTextColorClick}
          >
            {icons.textColor}
            {/* Color indicator */}
            <div 
              className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-1 rounded-full"
              style={{ backgroundColor: selectedTextColor }}
            />
          </button>
          
          {/* Sliding Color Palette */}
          <div
            className="absolute transition-all duration-300 ease-out"
            style={{
              left: paletteDirection === 'right' ? '100%' : undefined,
              right: paletteDirection === 'left' ? '100%' : undefined,
              marginLeft: paletteDirection === 'right' ? '8px' : undefined,
              marginRight: paletteDirection === 'left' ? '8px' : undefined,
              width: showTextColorPalette ? '200px' : '0px',
              opacity: showTextColorPalette ? 1 : 0,
              background: '#111113',
              borderRadius: 8,
              minWidth: showTextColorPalette ? '200px' : '0px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
              zIndex: 100,
              alignItems: 'center',
              display: showTextColorPalette ? 'flex' : 'none',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
            <div
              className="flex items-center gap-2 px-3 py-2 whitespace-nowrap w-full"
              style={{
                background: 'transparent',
                borderRadius: 8,
                minWidth: '200px',
                height: '40px',
              }}
            >
              {TEXT_COLORS.map((textColor, index) => (
                <button
                  key={index}
                  className="w-6 h-6 rounded-full border-2 border-gray-600 hover:border-gray-400 transition-colors flex-shrink-0"
                  style={{ backgroundColor: textColor.color }}
                  title={textColor.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTextColorSelect(textColor.color);
                  }}
                >
                  {selectedTextColor === textColor.color && (
                    <div className="w-full h-full rounded-full border-2 border-white" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Highlighter with Color Palette */}
        <div ref={highlighterRef} className="relative">
          <button
            className="px-1 py-1 text-base text-gray-200 hover:bg-gray-700 rounded transition relative"
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
            className="absolute transition-all duration-300 ease-out"
            style={{
              left: paletteDirection === 'right' ? '100%' : undefined,
              right: paletteDirection === 'left' ? '100%' : undefined,
              marginLeft: paletteDirection === 'right' ? '8px' : undefined,
              marginRight: paletteDirection === 'left' ? '8px' : undefined,
              width: showHighlighterPalette ? '200px' : '0px',
              opacity: showHighlighterPalette ? 1 : 0,
              background: '#111113',
              borderRadius: 8,
              minWidth: showHighlighterPalette ? '200px' : '0px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
              zIndex: 100,
              alignItems: 'center',
              display: showHighlighterPalette ? 'flex' : 'none',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
            <div
              className="flex items-center gap-2 px-3 py-2 whitespace-nowrap w-full"
              style={{
                background: 'transparent',
                borderRadius: 8,
                minWidth: '200px',
                height: '40px',
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
                    handleHighlightColorSelect(highlighter.color);
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

        {/* Link and Image Buttons */}
        <button
          className="px-1 py-1 text-base text-gray-200 hover:bg-gray-700 rounded transition w-8 h-8 flex items-center justify-center"
          title="Link"
          onClick={() => (isLinkActive() ? removeLink() : insertLink())}
        >
          {icons.link}
        </button>
        <button
          className="px-1 py-1 text-base text-gray-200 hover:bg-gray-700 rounded transition w-8 h-8 flex items-center justify-center"
          title="Image"
          onClick={insertImage}
        >
          {icons.image}
        </button>
      </div>
    </div>
  );
};

// Add withLinks plugin to treat 'link' as inline
const withLinks = (editor: ReactEditor) => {
  const { isInline } = editor;
  editor.isInline = element => element.type === 'link' ? true : isInline(element);
  return editor;
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
    const e = withLinks(withHistory(withReact(createEditor())));
    editorRef.current = e;
    return e;
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
      case 'link':
        return (
          <a
            {...props.attributes}
            href={props.element.url}
            style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
            onClick={e => {
              e.preventDefault();
              open(props.element.url);
            }}
          >
            {props.children}
          </a>
        );
      case 'image':
        return (
          <div {...props.attributes}>
            <img src={props.element.url} alt="" style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 8, margin: '12px 0' }} />
            {props.children}
          </div>
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
        background: 'hsl(var(--code-block-background))',
        color: 'hsl(var(--code-block-text))',
        borderRadius: 2,
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
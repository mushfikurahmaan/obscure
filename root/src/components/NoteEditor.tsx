// =========================
// Imports
// =========================
import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { createEditor, type Descendant, Editor, Transforms, Range, Element as SlateElement } from 'slate';
import { Slate, Editable, withReact, ReactEditor} from 'slate-react';
import { withHistory } from 'slate-history';
import type { Note } from '../pages/Index';
import { formatRelativeDate } from '../lib/utils';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from './ui/context-menu';
import {ArchiveRestore, Trash2, RotateCcw, Smile } from 'lucide-react';
import data from '@emoji-mart/data';
import EmojiMartPicker from '@emoji-mart/react';
import { useTheme } from '../lib/theme';
import React from 'react';

// =========================
// Props and Custom Types
// =========================

// Props for NoteEditor component
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

// Custom Slate text node type
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
  strikethrough?: boolean;
  fontFamily?: string;
};

type CustomElement =
  | { type: 'paragraph' | 'code-block'; alignment?: 'left' | 'center' | 'right' | 'justify'; children: CustomText[] }
  | { type: 'link'; url: string; children: CustomText[] }
  | { type: 'bulleted-list'; children: CustomElement[] }
  | { type: 'numbered-list'; children: CustomElement[] }
  | { type: 'list-item'; checked?: boolean; children: CustomText[] }
  | { type: 'divider'; children: CustomText[] }
  | { type: 'emoji'; character: string; children: CustomText[] };

declare module 'slate' {
  interface CustomTypes {
    Editor: ReactEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

// =========================
// Helper Functions
// =========================

// Check if a mark is active in the current selection
const isMarkActive = (editor: Editor, format: string) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format as keyof Omit<CustomText, "text">] === true : false;
};

// Toggle a mark (bold, italic, etc.) on/off
const toggleMark = (editor: Editor, format: string, value?: any) => {
  const isActive = isMarkActive(editor, format);
  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, value || true);
  }
};

// Convert content string to Slate value (handles both plain text and rich text JSON)
export const contentToSlateValue = (content: string): Descendant[] => {
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

// Map common hex codes to color names
const hexToColorName = (hex: string) => {
  const map: Record<string,string> = {
    // Basic / CSS core (16)
    '#FFFFFF':'White','#000000':'Black','#FF0000':'Red','#00FF00':'Lime',
    '#0000FF':'Blue','#FFFF00':'Yellow','#00FFFF':'Aqua/Cyan','#FF00FF':'Fuchsia/Magenta',
    '#C0C0C0':'Silver','#808080':'Gray','#800000':'Maroon','#808000':'Olive',
    '#008000':'Green','#800080':'Purple','#000080':'Navy','#008080':'Teal',
  
    // Extended CSS names (~130 more)
    '#F0F8FF':'AliceBlue','#FAEBD7':'AntiqueWhite','#7FFFD4':'Aquamarine','#F0FFFF':'Azure',
    '#F5F5DC':'Beige','#FFE4C4':'Bisque','#FFEBCD':'BlanchedAlmond','#6495ED':'CornflowerBlue',
    '#DC143C':'Crimson','#00BFFF':'DeepSkyBlue','#FF1493':'DeepPink','#00CED1':'DarkTurquoise',
    '#B8860B':'DarkGoldenrod','#A9A9A9':'DarkGray','#006400':'DarkGreen','#8B008B':'DarkMagenta',
    '#FF8C00':'DarkOrange','#E9967A':'DarkSalmon','#8FBC8F':'DarkSeaGreen','#483D8B':'DarkSlateBlue',
    '#2F4F4F':'DarkSlateGray','#9400D3':'DarkViolet','#ADFF2F':'GreenYellow',
    '#7FFF00':'Chartreuse','#7CFC00':'LawnGreen','#32CD32':'LimeGreen','#98FB98':'PaleGreen',
    '#00FA9A':'MediumSpringGreen','#00FF7F':'SpringGreen','#3CB371':'MediumSeaGreen',
    '#2E8B57':'SeaGreen','#FFF8DC':'Cornsilk','#FFEFD5':'PapayaWhip',
    '#FFE4B5':'Moccasin','#FFDAB9':'PeachPuff','#EEE8AA':'PaleGoldenrod','#F0E68C':'Khaki',
    '#BDB76B':'DarkKhaki','#D8BFD8':'Thistle','#DDA0DD':'Plum','#EE82EE':'Violet',
    '#DA70D6':'Orchid','#BA55D3':'MediumOrchid','#9370DB':'MediumPurple','#663399':'RebeccaPurple',
    '#8A2BE2':'BlueViolet','#FFB6C1':'LightPink','#FF69B4':'HotPink',
    '#C71585':'MediumVioletRed','#DB7093':'PaleVioletRed','#F08080':'LightCoral',
    '#FA8072':'Salmon','#FFA07A':'LightSalmon','#FF6347':'Tomato',
    '#FF7F50':'Coral','#D2691E':'Chocolate','#CD5C5C':'IndianRed','#B22222':'FireBrick',
    '#8B0000':'DarkRed','#F0FFF0':'Honeydew','#F5FFFA':'MintCream','#FFF0F5':'LavenderBlush',
    '#FFFACD':'LemonChiffon','#E6E6FA':'Lavender',
    '#7B68EE':'MediumSlateBlue','#6A5ACD':'SlateBlue','#6B8E23':'OliveDrab',
    '#556B2F':'DarkOliveGreen','#66CDAA':'MediumAquaMarine',
    '#20B2AA':'LightSeaGreen','#008B8B':'DarkCyan','#40E0D0':'Turquoise',
    '#48D1CC':'MediumTurquoise','#AFEEEE':'PaleTurquoise','#E0FFFF':'LightCyan',
    '#00008B':'DarkBlue','#0000CD':'MediumBlue','#4169E1':'RoyalBlue','#4682B4':'SteelBlue',
    '#1E90FF':'DodgerBlue','#87CEEB':'SkyBlue','#87CEFA':'LightSkyBlue',
    '#ADD8E6':'LightBlue','#B0C4DE':'LightSteelBlue','#778899':'LightSlateGray','#708090':'SlateGray',
    '#191970':'MidnightBlue','#B0E0E6':'PowderBlue','#FFDEAD':'NavajoWhite',
    '#FDF5E6':'OldLace','#FFFAF0':'FloralWhite','#F5F5F5':'WhiteSmoke',
    '#FFF5EE':'Seashell','#FFFAFA':'Snow','#F0EAD6':'Eggshell',
    '#FAF0E6':'Linen','#FFFFF0':'Ivory',
    '#FFE4E1':'MistyRose',
  
    // Highlight / extra popular shades (~40)
    '#FF3131':'Neon Red','#FF3B29':'Mango Tango','#FE6F5E':'Bittersweet',
    '#FFEB3B':'Vivid Yellow','#FFC107':'Amber','#FF5722':'Deep Orange',
    '#4CAF50':'Green (Material)','#2196F3':'Blue (Material)','#9C27B0':'Purple (Material)',
    '#E91E63':'Pink (Material)','#00E676':'Neon Green','#18FFFF':'Neon Cyan','#FFEA00':'Bright Yellow',
    '#FF4081':'Pink Accent','#7C4DFF':'Deep Purple Accent','#536DFE':'Indigo Accent',
    '#00E5FF':'Cyan Accent','#FFD740':'Yellow Accent','#D50000':'Red A700','#2962FF':'Blue A700',
    '#00C853':'Green A700','#FFAB00':'Orange A700','#AA00FF':'Purple A700','#00B8D4':'Cyan A700',
    '#64DD17':'Lime A700','#AEEA00':'Lime A400','#FF6D00':'Orange A400','#F50057':'Pink A400',
  
    // Add more if needed.
  };
  return map[hex.toUpperCase()] || hex.toUpperCase();
};

// Add to the top: font options
const FONT_FAMILIES = [
  { label: 'Space Grotesk', value: 'Space Grotesk, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Caveat', value: 'Caveat, cursive' },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Lora', value: 'Lora, serif' },
  { label: 'Open Sans', value: 'Open Sans, sans-serif' },
  { label: 'Source Code Pro', value: 'Source Code Pro, monospace' },
  { label: 'Fira Code', value: 'Fira Code, monospace' },
  { label: 'Poppins', value: 'Poppins, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Consolas', value: 'Consolas, monospace' },
  { label: 'Courier New', value: 'Courier New, monospace' },
];

// =========================
// UI Subcomponents
// =========================

// Rich text context menu for formatting selected text
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
  // --- ALL HOOKS AT THE TOP ---
  const [showHighlighterPalette, setShowHighlighterPalette] = useState(false);
  const [showTextColorPalette, setShowTextColorPalette] = useState(false);
  const [selectedHighlightColor, setSelectedHighlightColor] = useState('#FFFF00');
  const [selectedTextColor, setSelectedTextColor] = useState('#2E2E2E');
  const highlighterRef = useRef<HTMLDivElement>(null);
  const textColorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
  // Add state for font family dropdown
  const [showFontFamilyDropdown, setShowFontFamilyDropdown] = useState(false);
  const [fontFamilyDropdownDirection, setFontFamilyDropdownDirection] = useState<'down' | 'up'>('down');
  const fontFamilyDropdownButtonRef = useRef<HTMLButtonElement>(null);
  // --- NEW: Track menu and palette positions ---
  const [menuStyle, setMenuStyle] = useState<{ left: number; top: number } | null>(null);
  const [paletteDirection, setPaletteDirection] = useState<'right' | 'left'>('right');
  // Add state for dropdown direction
  const [fontSizeDropdownDirection, setFontSizeDropdownDirection] = useState<'down' | 'up'>('down');
  const textDropdownButtonRef = useRef<HTMLButtonElement>(null);
  // In RichTextContextMenu, replace the color palette for text color and highlighter with a hex input, preview, and apply button
  // Add state for hex input for both text color and highlighter
  const [textColorInput, setTextColorInput] = useState(selectedTextColor);
  const [highlightColorInput, setHighlightColorInput] = useState(selectedHighlightColor);
  // Helper to validate hex
  const isValidHex = (hex: string) => /^#([0-9A-Fa-f]{6})$/.test(hex);
  // --- NEW: State for Link Panel ---
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const linkPanelRef = useRef<HTMLDivElement>(null);
  const linkButtonRef = useRef<HTMLButtonElement>(null);
  // --- NEW: Helper to get current link (if any) ---
  const getCurrentLink = () => {
    const { selection } = editor;
    if (!selection) return '';
    const [match] = Editor.nodes(editor, {
      at: selection,
      match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'link',
    });
    return match && SlateElement.isElement(match[0]) ? (match[0] as any).url || '' : '';
  };
  const [showTextColorHexInput, setShowTextColorHexInput] = useState(false);
  const [showHighlighterHexInput, setShowHighlighterHexInput] = useState(false);
  // --- NEW: Close Link Panel on outside click ---
  useEffect(() => {
    if (!showLinkPanel) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        (linkPanelRef.current && linkPanelRef.current.contains(e.target as Node)) ||
        (linkButtonRef.current && linkButtonRef.current.contains(e.target as Node))
      ) {
        return;
      }
      setShowLinkPanel(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLinkPanel]);
  // --- END HOOKS ---

  // --- NEW: Reposition menu and palettes to stay in viewport ---
  useEffect(() => {
    if (!isVisible) return;
    const reposition = () => {
      if (!menuRef.current) return;
      const menuRect = menuRef.current.getBoundingClientRect();
      let left = position.x;
      let top = position.y;
      const margin = 8;
      // Try to show above selection if enough space
      if (top - menuRect.height - margin > 0) {
        top = top - menuRect.height - margin;
      } else if (top + menuRect.height + margin < window.innerHeight) {
        // Otherwise, show below (with margin)
        top = top + margin;
      }
      // Shift left if overflowing right
      if (left + menuRect.width > window.innerWidth) {
        left = Math.max(8, window.innerWidth - menuRect.width - 8);
      }
      setMenuStyle({ left, top });
      // Decide palette direction (right or left)
      const paletteWidth = 200;
      if (left + menuRect.width + paletteWidth > window.innerWidth) {
        setPaletteDirection('left');
      } else {
        setPaletteDirection('right');
      }
    };
    setTimeout(reposition, 0);
  }, [isVisible, position.x, position.y]);

  // --- Restore: Close context menu and palettes on outside click ---
  useEffect(() => {
    if (!isVisible) return;
    const handleClickOutside = (e: MouseEvent) => {
      // If click is inside the main menu, do nothing
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
      // If click is inside the highlighter palette, do nothing
      if (highlighterRef.current && highlighterRef.current.contains(e.target as Node)) {
        return;
      }
      // If click is inside the text color palette, do nothing
      if (textColorRef.current && textColorRef.current.contains(e.target as Node)) {
        return;
      }
      // If click is inside the link panel, do nothing
      if (linkPanelRef.current && linkPanelRef.current.contains(e.target as Node)) {
        return;
      }
      // If click is inside the link button, do nothing
      if (linkButtonRef.current && linkButtonRef.current.contains(e.target as Node)) {
        return;
      }
      // Otherwise, close everything
      onClose();
      setShowHighlighterPalette(false);
      setShowTextColorPalette(false);
      setShowFontSizeDropdown(false);
      setShowFontFamilyDropdown(false);
      setShowLinkPanel(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible, onClose]);

  // --- New: Set link slider direction based on available space ---
  useEffect(() => {
    if (!showLinkPanel) return;
    if (!linkButtonRef.current) return;
    const rect = linkButtonRef.current.getBoundingClientRect();
    const sliderWidth = 240;
    // Check if there's enough space to the right
    if (rect.right + sliderWidth > window.innerWidth) {
      setPaletteDirection('left');
    } else {
      setPaletteDirection('right');
    }
  }, [showLinkPanel]);

  if (!isVisible) return null;

  // All toolbar buttons now use direct SVG or Lucide components with className="w-5 h-5"
  // Handlers for formatting - REMOVED onClose() calls
  const handleMark = (format: string) => {
    toggleMark(editor, format);
    ReactEditor.focus(editor);
    // DON'T close the menu - let user apply multiple formats
  };

  const handleCodeBlock = () => {
    const { selection } = editor;
    if (!selection) return;

    // Check if selection is already inside a code-block
    const [match] = Editor.nodes(editor, {
      at: selection,
      match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'code-block',
    });

    if (match) {
      // If already in a code-block, unwrap it
      Transforms.unwrapNodes(editor, {
        match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'code-block',
        split: true,
        at: selection,
      });
    } else {
      // Otherwise, wrap the selected blocks in a single code-block
      Transforms.wrapNodes(
        editor,
        { type: 'code-block', children: [] },
        { split: true, at: selection }
      );
      // Optionally, set all selected nodes to be type 'paragraph' (or leave as is)
      Transforms.setNodes(
        editor,
        { type: 'paragraph' },
        {
          at: selection,
          match: n =>
            !Editor.isEditor(n) &&
            SlateElement.isElement(n) &&
            n.type !== 'code-block',
        }
      );
    }
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

  // --- NEW: Open Link Panel ---
  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowLinkPanel(v => {
      const next = !v;
      if (next) {
        setLinkInput(getCurrentLink());
        setShowHighlighterPalette(false);
        setShowTextColorPalette(false);
        setShowFontSizeDropdown(false);
        setShowFontFamilyDropdown(false);
      }
      return next;
    });
  };

  // --- NEW: Apply Link ---
  const handleApplyLink = () => {
    if (!linkInput.trim()) return;
    if (editor.selection && !Range.isCollapsed(editor.selection)) {
      // Remove existing link first
      Transforms.unwrapNodes(editor, {
        match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'link',
        split: true,
        at: editor.selection,
      });
      // Wrap selection with new link
      Transforms.wrapNodes(
        editor,
        { type: 'link', url: linkInput.trim(), children: [] },
        { split: true, at: editor.selection }
      );
    }
    ReactEditor.focus(editor);
    setShowLinkPanel(false);
  };

  // --- NEW: Remove Link ---
  const handleRemoveLink = () => {
    if (editor.selection) {
      Transforms.unwrapNodes(editor, {
        match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'link',
        split: true,
        at: editor.selection,
      });
    }
    ReactEditor.focus(editor);
    setShowLinkPanel(false);
  };

  const getActiveAlignment = () => {
    const { selection } = editor;
    if (!selection) return 'left';
    const [match] = Editor.nodes(editor, {
      at: selection,
      match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && 'alignment' in n,
    });
    const node = match ? match[0] : null;
    return node && 'alignment' in node && node.alignment ? node.alignment : 'left';
  };
  const setAlignment = (alignment: 'left' | 'center' | 'right' | 'justify') => {
    Transforms.setNodes(
      editor,
      { alignment },
      { match: n => !Editor.isEditor(n) && SlateElement.isElement(n) }
    );
    ReactEditor.focus(editor);
  };

// --- New block/inline handlers ---
const isBlockActive = (type: string) => {
  const { selection } = editor;
  if (!selection) return false;
  const [match] = Editor.nodes(editor, {
    at: selection,
    match: n => SlateElement.isElement(n) && n.type === type,
  });
  return !!match;
};

// Helper function to check if we're in a checklist (bulleted-list with checked items)
const isInChecklist = () => {
  const { selection } = editor;
  if (!selection) return false;
  
  // Check if we're in a bulleted-list
  const [listMatch] = Editor.nodes(editor, {
    at: selection,
    match: n => SlateElement.isElement(n) && n.type === 'bulleted-list',
  });
  
  if (!listMatch) return false;
  
  // Check if any list-item has a checked property
  const [itemMatch] = Editor.nodes(editor, {
    at: selection,
    match: n => SlateElement.isElement(n) && n.type === 'list-item' && typeof n.checked === 'boolean',
  });
  
  return !!itemMatch;
};

const handleInsertList = (type: 'numbered-list' | 'bulleted-list') => {
  const { selection } = editor;
  if (!selection) return;
  
  // Toggle: if already in this list type, unwrap to paragraph
  if (isBlockActive(type)) {
    // Store the current selection range
    const currentSelection = editor.selection;
    if (!currentSelection) return; // Add null check
    
    // First, convert all list-items to paragraphs and remove any checked properties
    // Do this BEFORE unwrapping to maintain proper node references
    Transforms.setNodes(
      editor,
      { type: 'paragraph', checked: undefined } as Partial<SlateElement>,
      { 
        match: n => SlateElement.isElement(n) && n.type === 'list-item',
        at: currentSelection
      }
    );
    
    // Then unwrap the list container
    Transforms.unwrapNodes(editor, {
      match: n => SlateElement.isElement(n) && (n.type === 'numbered-list' || n.type === 'bulleted-list'),
      split: true,
      at: currentSelection,
    });
    
    // Ensure we maintain focus and selection
    Transforms.select(editor, currentSelection);
    ReactEditor.focus(editor);
    return;
  }
  
  // If we're in a different list type, first unwrap the existing list
  if (isBlockActive('numbered-list') || isBlockActive('bulleted-list')) {
    const currentSelection = editor.selection;
    if (!currentSelection) return; // Add null check
    
    // Convert list-items to paragraphs first
    Transforms.setNodes(
      editor,
      { type: 'paragraph', checked: undefined } as Partial<SlateElement>,
      { 
        match: n => SlateElement.isElement(n) && n.type === 'list-item',
        at: currentSelection
      }
    );
    
    // Then unwrap the existing list
    Transforms.unwrapNodes(editor, {
      match: n => SlateElement.isElement(n) && (n.type === 'numbered-list' || n.type === 'bulleted-list'),
      split: true,
      at: currentSelection,
    });
  }
  
  // Convert paragraphs to list-items (removing checked property)
  Transforms.setNodes(
    editor,
    { type: 'list-item', checked: undefined } as Partial<SlateElement>,
    { 
      match: n => SlateElement.isElement(n) && n.type === 'paragraph',
      at: selection
    }
  );
  
  // Wrap in the new list type
  Transforms.wrapNodes(
    editor,
    { type, children: [] },
    { 
      match: n => SlateElement.isElement(n) && n.type === 'list-item',
      split: true,
      at: selection
    }
  );
  
  ReactEditor.focus(editor);
};

const handleInsertChecklist = () => {
  const { selection } = editor;
  if (!selection) return;
  
  // Toggle: if already in checklist, unwrap to paragraph
  if (isInChecklist()) {
    // Store the current selection range
    const currentSelection = editor.selection;
    if (!currentSelection) return; // Add null check
    
    // First, convert all list-items to paragraphs and remove checked properties
    // Do this BEFORE unwrapping to maintain proper node references
    Transforms.setNodes(
      editor,
      { type: 'paragraph', checked: undefined } as Partial<SlateElement>,
      { 
        match: n => SlateElement.isElement(n) && n.type === 'list-item',
        at: currentSelection
      }
    );
    
    // Then unwrap the bulleted-list container
    Transforms.unwrapNodes(editor, {
      match: n => SlateElement.isElement(n) && n.type === 'bulleted-list',
      split: true,
      at: currentSelection,
    });
    
    // Ensure we maintain focus and selection
    Transforms.select(editor, currentSelection);
    ReactEditor.focus(editor);
    return;
  }
  
  // If we're in a different list type, first unwrap the existing list
  if (isBlockActive('numbered-list') || isBlockActive('bulleted-list')) {
    const currentSelection = editor.selection;
    if (!currentSelection) return; // Add null check
    
    // Convert list-items to paragraphs first
    Transforms.setNodes(
      editor,
      { type: 'paragraph', checked: undefined } as Partial<SlateElement>,
      { 
        match: n => SlateElement.isElement(n) && n.type === 'list-item',
        at: currentSelection
      }
    );
    
    // Then unwrap the existing list
    Transforms.unwrapNodes(editor, {
      match: n => SlateElement.isElement(n) && (n.type === 'numbered-list' || n.type === 'bulleted-list'),
      split: true,
      at: currentSelection,
    });
  }
  
  // Convert paragraphs to checklist items
  Transforms.setNodes(
    editor,
    { type: 'list-item', checked: false } as Partial<SlateElement>,
    { 
      match: n => SlateElement.isElement(n) && n.type === 'paragraph',
      at: selection
    }
  );
  
  // Wrap in bulleted-list
  Transforms.wrapNodes(
    editor,
    { type: 'bulleted-list', children: [] },
    { 
      match: n => SlateElement.isElement(n) && n.type === 'list-item',
      split: true,
      at: selection
    }
  );
  
  ReactEditor.focus(editor);
};



  // Add handler for font family
  const handleFontFamily = (font: string) => {
    if (font === 'default') {
      Editor.removeMark(editor, 'fontFamily');
    } else {
      Editor.addMark(editor, 'fontFamily', font);
    }
    ReactEditor.focus(editor);
  };

  // Modern floating toolbar with arrow
  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white text-black rounded-lg shadow-lg border border-gray-200"
      style={menuStyle ? { left: menuStyle.left, top: menuStyle.top } : { left: position.x, top: position.y }}
    >
      {/* Main Toolbar - all buttons in a single row */}
      <div
        className="flex items-center gap-0.5 rounded-xl px-2 py-0.5 relative"
        style={{ minHeight: 40 }}
      >
        {/* Font Family Dropdown Button */}
        <div className="relative" style={{ marginRight: 4 }}>
          <button
            className="px-2 py-1 text-base hover:bg-[hsl(var(--context-menu-hover))] rounded transition flex items-center justify-center gap-1"
            title="Font family"
            onClick={e => {
              e.stopPropagation();
              setShowFontFamilyDropdown(v => {
                const next = !v;
                if (next && fontFamilyDropdownButtonRef.current) {
                  const rect = fontFamilyDropdownButtonRef.current.getBoundingClientRect();
                  const dropdownHeight = 220; // 6 options * ~36px each
                  const spaceBelow = window.innerHeight - rect.bottom;
                  const spaceAbove = rect.top;
                  if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
                    setFontFamilyDropdownDirection('up');
                  } else {
                    setFontFamilyDropdownDirection('down');
                  }
                }
                setShowFontSizeDropdown(false);
                setShowHighlighterPalette(false);
                setShowTextColorPalette(false);
                return next;
              });
            }}
            ref={fontFamilyDropdownButtonRef}
            style={{ lineHeight: 1 }}
          >
            {/* Font icon SVG only, no text */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 15 4-8 4 8"/><path d="M4 13h6"/><circle cx="18" cy="12" r="3"/><path d="M21 9v6"/></svg>
          </button>
          {/* Dropdown menu */}
          {showFontFamilyDropdown && (
            <div
              className="absolute w-44 bg-[hsl(var(--context-menu-bg))] text-[hsl(var(--foreground))] rounded-lg shadow-xl z-50 border border-[hsl(var(--popover-border))] overflow-y-auto"
              style={{
                minWidth: 160,
                maxHeight: 220, // Show about 6 items, rest scroll
                left: 0,
                marginTop: fontFamilyDropdownDirection === 'down' ? '0.25rem' : undefined,
                bottom: fontFamilyDropdownDirection === 'up' ? '100%' : undefined,
                marginBottom: fontFamilyDropdownDirection === 'up' ? '0.25rem' : undefined
              }}
            >
              {FONT_FAMILIES.map(f => (
                <button
                  key={f.value}
                  className="block w-full text-left px-4 py-2 hover:bg-[hsl(var(--context-menu-hover))] text-sm"
                  style={{ fontFamily: f.value }}
                  onClick={() => { handleFontFamily(f.value); setShowFontFamilyDropdown(false); }}
                >
                  {f.label}
                </button>
              ))}
              <button
                className="block w-full text-left px-4 py-2 hover:bg-[hsl(var(--context-menu-hover))] rounded-b-lg text-sm"
                onClick={() => { handleFontFamily('default'); setShowFontFamilyDropdown(false); }}
              >
                Default
              </button>
            </div>
          )}
        </div>
        {/* End of Font Family Dropdown */}
        
        {/* Text Size Buttons (replace with dropdown) */}
        <div className="relative" style={{ marginRight: 4 }}>
          <button
            className="px-2 py-1 text-base hover:bg-[hsl(var(--context-menu-hover))] rounded transition flex items-center justify-center gap-1"
            title="Font Size"
            onClick={e => {
              e.stopPropagation();
              setShowFontSizeDropdown(v => {
                const next = !v;
                if (next && textDropdownButtonRef.current) {
                  const rect = textDropdownButtonRef.current.getBoundingClientRect();
                  const dropdownHeight = 176; // 4 options * 44px each (approx)
                  const spaceBelow = window.innerHeight - rect.bottom;
                  const spaceAbove = rect.top;
                  if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
                    setFontSizeDropdownDirection('up');
                  } else {
                    setFontSizeDropdownDirection('down');
                  }
                }
                setShowHighlighterPalette(false);
                setShowTextColorPalette(false);
                return next;
              });
            }}
            ref={textDropdownButtonRef}
            style={{ lineHeight: 1 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 12h6"/><path d="M15 6h6"/><path d="m3 13 3.553-7.724a.5.5 0 0 1 .894 0L11 13"/><path d="M3 18h18"/><path d="M3.92 11h6.16"/></svg>
          </button>
          {/* Dropdown menu */}
          {showFontSizeDropdown && (
            <div
              className="absolute w-32 bg-[hsl(var(--context-menu-bg))] text-[hsl(var(--foreground))] rounded-lg shadow-xl z-50 border border-[hsl(var(--popover-border))]"
              style={{
                minWidth: 120,
                left: 0,
                marginTop: fontSizeDropdownDirection === 'down' ? '0.25rem' : undefined,
                bottom: fontSizeDropdownDirection === 'up' ? '100%' : undefined,
                marginBottom: fontSizeDropdownDirection === 'up' ? '0.25rem' : undefined
              }}
            >
              <button
                className="block w-full text-left px-4 py-2 hover:bg-[hsl(var(--context-menu-hover))] rounded-t-lg text-sm"
                onClick={() => { handleFontSize('h1'); setShowFontSizeDropdown(false); }}
              >Heading 1</button>
              <button
                className="block w-full text-left px-4 py-2 hover:bg-[hsl(var(--context-menu-hover))] text-sm"
                onClick={() => { handleFontSize('h2'); setShowFontSizeDropdown(false); }}
              >Heading 2</button>
              <button
                className="block w-full text-left px-4 py-2 hover:bg-[hsl(var(--context-menu-hover))] text-sm"
                onClick={() => { handleFontSize('h3'); setShowFontSizeDropdown(false); }}
              >Heading 3</button>
              <button
                className="block w-full text-left px-4 py-2 hover:bg-[hsl(var(--context-menu-hover))] text-sm"
                onClick={() => { handleFontSize('default'); setShowFontSizeDropdown(false); }}
              >Normal</button>
            </div>
          )}
        </div>
        {/* End of Text Size Dropdown */}
        <div className="w-px bg-gray-300 self-stretch max-h-10 mx-2"></div>
        <button
          className="px-1 py-1 text-base hover:bg-[hsl(var(--context-menu-hover))] rounded transition w-8 h-8 flex items-center justify-center"
          title="Bold"
          onClick={() => handleMark('bold')}
        >
        <svg width="20" height="20" fill="none" viewBox="0 0 20 20" className="w-5 h-5"><path stroke="currentColor" strokeWidth="2" d="M7 4h4a3 3 0 0 1 0 6H7zm0 6h5a3 3 0 1 1 0 6H7z"/></svg>
        </button>
        <button
          className="px-1 py-1 text-base hover:bg-[hsl(var(--context-menu-hover))] rounded transition w-8 h-8 flex items-center justify-center"
          title="Italic"
          onClick={() => handleMark('italic')}
        >
        <svg width="20" height="20" fill="none" viewBox="0 0 20 20" className="w-5 h-5"><path stroke="currentColor" strokeWidth="2" d="M10 4h4M6 16h4m2-12-4 12"/></svg>
        </button>
        <button
          className="px-1 py-1 text-base hover:bg-[hsl(var(--context-menu-hover))] rounded transition w-8 h-8 flex items-center justify-center"
          title="Underline"
          onClick={() => handleMark('underline')}
        >
        <svg width="20" height="20" fill="none" viewBox="0 0 20 20" className="w-5 h-5"><path stroke="currentColor" strokeWidth="2" d="M6 4v5a4 4 0 0 0 8 0V4M5 16h10"/></svg>
        </button>
        <div className="w-px bg-gray-300 self-stretch max-h-10 mx-2"></div>
        <button
          className={`px-1 py-1 text-base hover:bg-[hsl(var(--context-menu-hover))] rounded transition w-8 h-8 flex items-center justify-center${getActiveAlignment() === 'left' ? ' bg-[hsl(var(--context-menu-hover))]' : ''}`}
          title="Align Left"
          onClick={() => setAlignment('left')}
        >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="w-5 h-5"><rect x="3" y="5" width="14" height="2" rx="1" fill="currentColor"/><rect x="3" y="9" width="10" height="2" rx="1" fill="currentColor"/><rect x="3" y="13" width="14" height="2" rx="1" fill="currentColor"/></svg>
        </button>
        <button
          className={`px-1 py-1 text-base hover:bg-[hsl(var(--context-menu-hover))] rounded transition w-8 h-8 flex items-center justify-center${getActiveAlignment() === 'center' ? ' bg-[hsl(var(--context-menu-hover))]' : ''}`}
          title="Align Center"
          onClick={() => setAlignment('center')}
        >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="w-5 h-5"><rect x="5" y="5" width="10" height="2" rx="1" fill="currentColor"/><rect x="3" y="9" width="14" height="2" rx="1" fill="currentColor"/><rect x="5" y="13" width="10" height="2" rx="1" fill="currentColor"/></svg>
        </button>
        <button
          className={`px-1 py-1 text-base hover:bg-[hsl(var(--context-menu-hover))] rounded transition w-8 h-8 flex items-center justify-center${getActiveAlignment() === 'right' ? ' bg-[hsl(var(--context-menu-hover))]' : ''}`}
          title="Align Right"
          onClick={() => setAlignment('right')}
        >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="w-5 h-5"><rect x="3" y="5" width="14" height="2" rx="1" fill="currentColor"/><rect x="7" y="9" width="10" height="2" rx="1" fill="currentColor"/><rect x="3" y="13" width="14" height="2" rx="1" fill="currentColor"/></svg>
        </button>
        <div className="w-px bg-gray-300 self-stretch max-h-10 mx-2"></div>
        <button
        className="px-1 py-1 hover:bg-[hsl(var(--context-menu-hover))] rounded transition w-8 h-8 flex items-center justify-center"
        title="Numbered List"
        onClick={() => handleInsertList('numbered-list')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 12h11"/><path d="M10 18h11"/><path d="M10 6h11"/><path d="M4 10h2"/><path d="M4 6h1v4"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
        </button>
      <button
        className="px-1 py-1 hover:bg-[hsl(var(--context-menu-hover))] rounded transition w-8 h-8 flex items-center justify-center"
        title="Bullet List"
        onClick={() => handleInsertList('bulleted-list')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/></svg>
      </button>
      <button
        className="px-1 py-1 hover:bg-[hsl(var(--context-menu-hover))] rounded transition w-8 h-8 flex items-center justify-center"
        title="Checklist"
        onClick={handleInsertChecklist}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>
      </button>
      <div className="w-px bg-gray-300 self-stretch max-h-10 mx-2"></div>
        {/* Text Color with Color Palette */}
        <div ref={textColorRef} className="relative">
          <button
            className="px-1 py-1 text-base hover:bg-[hsl(var(--context-menu-hover))] transition relative"
            title="Text Color"
            onClick={handleTextColorClick}
          >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="4,7 4,4 20,4 20,7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
            {/* Color indicator */}
            <div 
              className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-1 rounded-full"
              style={{ backgroundColor: selectedTextColor }}
            />
          </button>
          {/* Redesigned Color Popover */}
          <div
            className="absolute flex flex-col items-center bg-white text-black border border-gray-200 shadow-xl rounded-lg"
            style={{
              left: '50%',
              transform: 'translateX(-50%)',
              bottom: 'calc(100% + 12px)',
              minWidth: 160,
              width: 180,
              zIndex: 100,
              opacity: showTextColorPalette ? 1 : 0,
              pointerEvents: showTextColorPalette ? 'auto' : 'none',
              transition: 'opacity 0.2s',
              boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
              padding: '16px 12px 8px 12px',
              display: showTextColorPalette ? 'flex' : 'none',
            }}
          >
            {/* Arrow/pointer at the bottom */}
            <div style={{
              position: 'absolute',
              left: '50%',
              bottom: -10,
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: '10px solid white',
              filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.08))',
              zIndex: 101,
            }} />
            {/* Swatch grid or hex input, in place */}
            {!showTextColorHexInput ? (
              <>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {TEXT_COLOR_SWATCHES.map(color => (
                    <button
                      key={color}
                      className="w-7 h-7 rounded-full border flex items-center justify-center focus:outline-none"
                      style={{
                        background: color,
                        borderWidth: selectedTextColor === color ? 1 : 1,
                        borderColor: selectedTextColor === color ? '#222' : '#fff',
                        boxShadow: selectedTextColor === color ? '0 0 0 1px #222' : 'none',
                        outline: 'none',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                      }}
                      onClick={() => {
                        setSelectedTextColor(color);
                        // Apply text color but do NOT close the popover
                        const marks = Editor.marks(editor);
                        if (!marks?.color || marks?.color !== color) {
                          Editor.addMark(editor, 'color', color);
                        }
                      }}
                    >
                      {/* No checkmark/tickmark inside the selected color */}
                    </button>
                  ))}
                </div>
                <button
                  className="text-sm text-black font-medium py-1 px-2 rounded hover:bg-gray-100 transition"
                  style={{ marginBottom: 2 }}
                  onClick={() => setShowTextColorHexInput(true)}
                >
                  More colors
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center w-full">
                <div className="flex items-center gap-2 mb-2 w-full justify-center">
            <input
              type="text"
              value={textColorInput}
              onChange={e => {
                setTextColorInput(e.target.value);
                if (isValidHex(e.target.value)) {
                  setSelectedTextColor(e.target.value);
                  // Apply text color but do NOT close the popover
                  const marks = Editor.marks(editor);
                  if (!marks?.color || marks?.color !== e.target.value) {
                    Editor.addMark(editor, 'color', e.target.value);
                  }
                }
              }}
              placeholder="hex code"
              maxLength={7}
              className="px-2 py-1 text-base outline-none border border-gray-300 rounded flex-grow w-full"
              style={{ fontSize: 14 }}
              autoFocus
            />
            <span
              title={isValidHex(textColorInput) ? hexToColorName(textColorInput) : 'Invalid color'}
              style={{
                display: 'inline-block',
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: isValidHex(textColorInput) ? textColorInput : '#e5e5e5',
                border: isValidHex(textColorInput) ? '1px solid #bbb' : '1px dashed #bbb',
                boxShadow: isValidHex(textColorInput) ? '0 0 0 1px #222' : 'none',
                transition: 'background 0.2s, border 0.2s',
                flexShrink: 0,
              }}
            />
                </div>
            <button
                  onClick={() => setShowTextColorHexInput(false)}
                  className="w-full text-sm text-gray-700 font-medium py-1 px-2 rounded hover:bg-gray-100 transition"
                  title="Back to swatches"
                >
                  Back
            </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Highlighter with Color Palette */}
        <div ref={highlighterRef} className="relative">
          <button
            className="px-1 py-1 text-base hover:bg-[hsl(var(--context-menu-hover))] rounded transition relative"
            title="Highlight"
            onClick={handleHighlighterClick}
          >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>
            {/* Color indicator */}
            <div 
              className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-1 rounded-full"
              style={{ backgroundColor: selectedHighlightColor }}
            />
          </button>
          {/* Redesigned Highlighter Color Popover */}
          <div
            className="absolute flex flex-col items-center bg-white text-black border border-gray-200 shadow-xl rounded-lg"
            style={{
              left: '50%',
              transform: 'translateX(-50%)',
              bottom: 'calc(100% + 12px)',
              minWidth: 160,
              width: 180,
              zIndex: 100,
              opacity: showHighlighterPalette ? 1 : 0,
              pointerEvents: showHighlighterPalette ? 'auto' : 'none',
              transition: 'opacity 0.2s',
              boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
              padding: '16px 12px 8px 12px',
              display: showHighlighterPalette ? 'flex' : 'none',
            }}
          >
            {/* Arrow/pointer at the bottom */}
            <div style={{
              position: 'absolute',
              left: '50%',
              bottom: -10,
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: '10px solid white',
              filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.08))',
              zIndex: 101,
            }} />
            {/* Swatch grid or hex input, in place */}
            {!showHighlighterHexInput ? (
              <>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {HIGHLIGHTER_COLOR_SWATCHES.map(color => (
                    <button
                      key={color}
                      className="w-7 h-7 rounded-full border flex items-center justify-center focus:outline-none"
                      style={{
                        background: color,
                        borderWidth: selectedHighlightColor === color ? 1 : 1,
                        borderColor: selectedHighlightColor === color ? '#222' : '#fff',
                        boxShadow: selectedHighlightColor === color ? '0 0 0 1px #222' : 'none',
                        outline: 'none',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                      }}
                      onClick={() => {
                        setSelectedHighlightColor(color);
                        // Apply highlight color but do NOT close the popover
                        const marks = Editor.marks(editor);
                        if (!marks?.highlight || marks?.highlightColor !== color) {
                          Editor.addMark(editor, 'highlight', true);
                          Editor.addMark(editor, 'highlightColor', color);
                        }
                      }}
                    >
                      {/* No checkmark/tickmark inside the selected color */}
                    </button>
                  ))}
                </div>
                <button
                  className="text-sm text-black font-medium py-1 px-2 rounded hover:bg-gray-100 transition"
                  style={{ marginBottom: 2 }}
                  onClick={() => setShowHighlighterHexInput(true)}
                >
                  More colors
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center w-full">
                <div className="flex items-center gap-2 mb-2 w-full justify-center">
                  <input
                    type="text"
                    value={highlightColorInput}
                    onChange={e => {
                      setHighlightColorInput(e.target.value);
                      if (isValidHex(e.target.value)) {
                        setSelectedHighlightColor(e.target.value);
                        // Apply highlight color but do NOT close the popover
                        const marks = Editor.marks(editor);
                        if (!marks?.highlight || marks?.highlightColor !== e.target.value) {
                          Editor.addMark(editor, 'highlight', true);
                          Editor.addMark(editor, 'highlightColor', e.target.value);
                        }
                      }
                    }}
                    placeholder="hex code"
                    maxLength={7}
                    className="px-2 py-1 text-base outline-none border border-gray-300 rounded flex-grow w-full"
                    style={{ fontSize: 14 }}
                    autoFocus
                  />
                  <span
                    title={isValidHex(highlightColorInput) ? hexToColorName(highlightColorInput) : 'Invalid color'}
                    style={{
                      display: 'inline-block',
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: isValidHex(highlightColorInput) ? highlightColorInput : '#e5e5e5',
                      border: isValidHex(highlightColorInput) ? '1px solid #bbb' : '1px dashed #bbb',
                      boxShadow: isValidHex(highlightColorInput) ? '0 0 0 1px #222' : 'none',
                      transition: 'background 0.2s, border 0.2s',
                      flexShrink: 0,
                    }}
                  />
                </div>
                <button
                  onClick={() => setShowHighlighterHexInput(false)}
                  className="w-full text-sm text-gray-700 font-medium py-1 px-2 rounded hover:bg-gray-100 transition"
                  title="Back to swatches"
                >
                  Back
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="w-px bg-gray-300 self-stretch max-h-10 mx-2"></div>
    {/* Code block */}
    <button
          className="px-1 py-1 text-base hover:bg-[hsl(var(--context-menu-hover))] transition w-8 h-8 flex items-center justify-center"
          title="Code Block"
          onClick={handleCodeBlock}
        >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
        </button>
      {/* Link Button */}
      <div className="relative">
        <button
          className="px-1 py-1 text-base hover:bg-[hsl(var(--context-menu-hover))] rounded transition w-8 h-8 flex items-center justify-center"
          title="Link"
          onClick={handleLinkClick}
          ref={linkButtonRef}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/></svg>
        </button>
        {/* Link Panel Slider */}
          {/* ...existing link panel code... */}
      </div>
      <button
        className="px-1 py-1 hover:bg-[hsl(var(--context-menu-hover))] rounded transition w-8 h-8 flex items-center justify-center"
        title="Strikethrough"
        onClick={() => handleMark('strikethrough')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" x2="20" y1="12" y2="12"/></svg>
      </button>
      <button
        className="px-1 py-1 hover:bg-[hsl(var(--context-menu-hover))] rounded transition w-8 h-8 flex items-center justify-center"
        title="Clear Formatting"
        onClick={() => {
          const { selection } = editor;
          if (!selection) return;
          // Remove all known marks
          const marksToRemove = ['bold', 'italic', 'underline', 'strikethrough', 'fontSize', 'color', 'highlight', 'highlightColor', 'code', 'fontFamily'];
          marksToRemove.forEach(mark => {
            Editor.removeMark(editor, mark);
          });
          // Unwrap links
          Transforms.unwrapNodes(editor, {
            at: selection,
            match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'link',
            split: true,
          });
          // Unwrap code-blocks
          Transforms.unwrapNodes(editor, {
            at: selection,
            match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'code-block',
            split: true,
          });
          // Reset block types to paragraph
          Transforms.setNodes(
            editor,
            { type: 'paragraph', alignment: undefined },
            {
              at: selection,
              match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type !== 'paragraph',
            }
          );
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 22-1-4"/><path d="M19 13.99a1 1 0 0 0 1-1V12a2 2 0 0 0-2-2h-3a1 1 0 0 1-1-1V4a2 2 0 0 0-4 0v5a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2v.99a1 1 0 0 0 1 1"/><path d="M5 14h14l1.973 6.767A1 1 0 0 1 20 22H4a1 1 0 0 1-.973-1.233z"/><path d="m8 22 1-4"/></svg>
        </button>
      </div>
    </div>
  );
};

// =========================
// Main NoteEditor Component
// =========================

// The main note editor component with rich text editing, context menus, and metadata
export const NoteEditor = ({ note, onUpdate, alignLeft = 0, onTitleChange, onClose, setSaving, contextType, onRemoveFromArchive, onRestore, onDeletePermanently }: NoteEditorProps) => {
  // -------------------------
  // State and Refs
  // -------------------------
  const [title, setTitle] = useState(note.title || '');
  const [, setContent] = useState(note.content);
  const [, setIsContentEmpty] = useState(true);
  // Rich text context menu state
  const [showRichTextMenu, setShowRichTextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  // General context menu state
  const [showGeneralMenu, setShowGeneralMenu] = useState(false);
  const [generalMenuPosition, setGeneralMenuPosition] = useState({ x: 0, y: 0 });
  const titleRef = useRef<HTMLHeadingElement>(null);
  const prevNoteId = useRef(note.id);
  const editorRef = useRef<ReactEditor | null>(null);

  // -------------------------
  // Slate Editor Setup
  // -------------------------
  // Create a new editor instance for each note
  const editor = useMemo(() => {
    const e = withTrailingParagraph(
      withDividers(
        withLinks(
          withHistory(
            withReact(createEditor())
          )
        )
      )
    );
    editorRef.current = e;
    return e;
  }, [note.id]);
  const [slateValue, setSlateValue] = useState<Descendant[]>(() => contentToSlateValue(note.content));

  // -------------------------
  // Slate Render Functions
  // -------------------------
  const renderElement = useCallback((props: any) => {
    const alignment = props.element.alignment || 'left';
    switch (props.element.type) {
      case 'code-block':
        return (
          <pre
            className="p-3 rounded-md font-mono text-sm my-2"
            {...props.attributes}
            style={{
              textAlign: alignment,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflowX: 'auto',
              background: 'hsl(var(--code-block-background))',
              color: 'hsl(var(--code-block-text))',
            }}
          >
            <code>{props.children}</code>
          </pre>
        );
      case 'link':
        return (
          <a {...props.attributes} href={props.element.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer', textAlign: alignment }}>
            {props.children}
          </a>
        );
      case 'bulleted-list':
        return <ul {...props.attributes} className="list-disc list-outside" style={{ textAlign: alignment, paddingLeft: 24, margin: '8px 0' }}>{props.children}</ul>;
      case 'numbered-list':
        return <ol {...props.attributes} className="list-decimal list-outside" style={{ textAlign: alignment, paddingLeft: 24, margin: '8px 0' }}>{props.children}</ol>;
      case 'list-item':
        return <li {...props.attributes} style={{ textAlign: alignment }}>{props.children}</li>;
      case 'divider':
        return (
          <div {...props.attributes} contentEditable={false} style={{ display: 'flex' }}>
            <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '16px 0', width: '100%' }} />
            {props.children}
          </div>
        );
      case 'emoji':
        return <span {...props.attributes} role="img" aria-label="emoji" style={{ fontSize: '1.5em', lineHeight: 1 }}>{props.element.character}{props.children}</span>;
      default:
        return <p {...props.attributes} style={{ textAlign: alignment }}>{props.children}</p>;
    }
  }, [editor]);
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
    
    if (leaf.strikethrough) {
      children = <span style={{ textDecoration: 'line-through' }}>{children}</span>;
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
    
    if (leaf.fontFamily) {
      style.fontFamily = leaf.fontFamily;
    }
    
    return (
      <span {...attributes} style={style}>
        {children}
      </span>
    );
  }, []);

  // -------------------------
  // Effects: Sync note changes and auto-save
  // -------------------------
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

  // -------------------------
  // Handlers: Save, Slate change, blur, context menus, etc.
  // -------------------------
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
  const handleContextMenu = (e: React.MouseEvent) => {
    const { selection } = editor;
    // Only show rich text menu if there's a selection
    if (selection && !Range.isCollapsed(selection)) {
      e.preventDefault();
      setMenuPosition({ x: e.clientX, y: e.clientY });
      setShowRichTextMenu(true);
      setShowGeneralMenu(false);
    } else {
      e.preventDefault();
      setGeneralMenuPosition({ x: e.clientX, y: e.clientY });
      setShowGeneralMenu(true);
      setShowRichTextMenu(false);
    }
  };
  // General menu actions
  const handleInsertEmoji = (emoji: string) => {
    const { selection } = editor;
    if (!selection) {
      Transforms.insertText(editor, emoji);
    } else {
      Transforms.insertText(editor, emoji, { at: selection });
    }
    ReactEditor.focus(editor);
  };
  const handleInsertDivider = () => {
    const { selection } = editor;
    let insertPath = null;
    if (!selection) {
      // Insert at end if no selection
      Transforms.insertNodes(editor, { type: 'divider', children: [{ text: '' }] });
      // Find the path of the last node (divider just inserted)
      const lastIndex = editor.children.length - 1;
      insertPath = [lastIndex];
    } else {
      // Insert at selection
      Transforms.insertNodes(editor, { type: 'divider', children: [{ text: '' }] }, { at: selection });
      // Get the path where the divider was inserted
      insertPath = Editor.path(editor, selection);
    }

    // Always insert a new empty paragraph after the divider
    const nextPath = [insertPath[0] + 1];
    Transforms.insertNodes(
      editor,
      { type: 'paragraph', children: [{ text: '' }] },
      { at: nextPath }
    );
    // Move selection to the start of the new paragraph
    Transforms.select(editor, Editor.start(editor, nextPath));
    ReactEditor.focus(editor);
  };

  // -------------------------
  // Editor Content Rendering
  // -------------------------
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
      <div className="relative mb-2 w-full max-w-full overflow-hidden">
          <h1
            ref={titleRef}
            className="text-4xl font-bold leading-tight outline-none bg-transparent text-[hsl(var(--foreground))] min-h-[48px] w-full max-w-full"
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            dir="ltr"
            style={{ 
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap',
              maxWidth: '100%',
              width: '100%'
            }}
            onPaste={e => {
              e.preventDefault();
              const text = e.clipboardData.getData('text/plain');
              // Insert plain text at the caret position
              if (document.queryCommandSupported && document.queryCommandSupported('insertText')) {
                document.execCommand('insertText', false, text);
              } else {
                // Fallback for very old browsers
                document.execCommand('paste', false, text);
              }
            }}
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
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                (e.target as HTMLElement).blur();
              }
              // If Shift+Enter, do nothing (allow default: insert new line)
            }}
          />
          {(!title || title.trim() === '') && (
            <span
              className="absolute left-0 top-0 text-4xl font-bold leading-tight text-[hsl(var(--muted-foreground))] pointer-events-none select-none w-full max-w-full break-words"
              style={{ 
                userSelect: 'none',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'pre-wrap',
                maxWidth: '100%',
                width: '100%'
              }}
            >
              Untitled Note
            </span>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center space-x-2 mb-4 text-sm text-[hsl(var(--muted-foreground))]">
          <span>Created {formatRelativeDate(note.createdAt)}</span>
          <span className="text-[hsl(var(--muted-foreground))]">•</span>
          <span>Last modified {formatRelativeDate(note.updatedAt)}</span>
          <span className="text-[hsl(var(--muted-foreground))]">•</span>
          <span>{slateValueToText(slateValue).split(/\s+/).filter(Boolean).length} word{slateValueToText(slateValue).split(/\s+/).filter(Boolean).length !== 1 ? 's' : ''}</span>
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
              onKeyDown={event => {
                if (event.key === 'Enter' && event.shiftKey) {
                  const { selection } = editor;
                  if (selection) {
                    // Check if selection is inside a code-block
                    const [codeBlockNode, codeBlockPath] = Editor.nodes(editor, {
                      at: selection,
                      match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'code-block',
                    }).next().value || [];
                    if (codeBlockNode && codeBlockPath) {
                      event.preventDefault();
                      // Insert a new paragraph after the code block
                      const newPath = [...codeBlockPath.slice(0, -1), codeBlockPath[codeBlockPath.length - 1] + 1];
                      Transforms.insertNodes(
                        editor,
                        { type: 'paragraph', children: [{ text: '' }] },
                        { at: newPath, select: true }
                      );
                      return;
                    }
                  }
                }
              }}
            />
          </Slate>
          
          {/* Rich text context menu */}
          <RichTextContextMenu
            editor={editor}
            isVisible={showRichTextMenu}
            position={menuPosition}
            onClose={() => setShowRichTextMenu(false)}
          />
          {/* General context menu for no selection */}
          <GeneralContextMenu
            isVisible={showGeneralMenu}
            position={generalMenuPosition}
            onClose={() => setShowGeneralMenu(false)}
            onInsertEmoji={handleInsertEmoji}
            onInsertDivider={handleInsertDivider}
          />
        </div>
      </div>
    </div>
  );

  // -------------------------
  // Context Menu Wrapping (archive/trash)
  // -------------------------
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
                <ArchiveRestore className="w-4 h-4 mr-2" />
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

// =========================
// Slate Editor Plugins
// =========================

// Plugin: Treat 'link' elements as inline
const withLinks = (editor: ReactEditor) => {
  const { isInline } = editor;
  editor.isInline = element => element.type === 'link' ? true : isInline(element);
  return editor;
};

// Plugin: Treat 'divider' elements as void
const withDividers = (editor: ReactEditor) => {
  const { isVoid } = editor;
  editor.isVoid = element => element.type === 'divider' ? true : isVoid(element);
  return editor;
};

// Plugin: Always ensure a trailing paragraph at the end of the document
const withTrailingParagraph = (editor: ReactEditor) => {
  const { normalizeNode } = editor;
  editor.normalizeNode = entry => {
    const [, path] = entry;
    // Only check the root node
    if (path.length === 0) {
      const lastNode = editor.children[editor.children.length - 1];
      if (!lastNode || !SlateElement.isElement(lastNode) || lastNode.type !== 'paragraph') {
        // Insert a trailing empty paragraph
        Transforms.insertNodes(
          editor,
          { type: 'paragraph', children: [{ text: '' }] },
          { at: [editor.children.length] }
        );
        return;
      }
    }
    normalizeNode(entry);
  };
  return editor;
};

// --- Add: New context menu for no selection ---
const GeneralContextMenu = ({
  isVisible,
  position,
  onClose,
  onInsertEmoji,
  onInsertDivider,
}: {
  isVisible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onInsertEmoji: (emoji: string) => void;
  onInsertDivider: () => void;
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<{ left: number; top: number } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerDirection, setEmojiPickerDirection] = useState<'down' | 'up'>('down');
  const { theme } = useTheme();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        (menuRef.current && menuRef.current.contains(e.target as Node)) ||
        (emojiPickerRef.current && emojiPickerRef.current.contains(e.target as Node))
      ) {
        return; // Click inside menu or emoji picker, do nothing
      }
      onClose();
      setShowEmojiPicker(false);
    };
    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onClose, showEmojiPicker]);

  useEffect(() => {
    if (!isVisible) return;
    const reposition = () => {
      if (!menuRef.current) return;
      const menuRect = menuRef.current.getBoundingClientRect();
      let left = position.x;
      let top = position.y;
      if (left + menuRect.width > window.innerWidth) {
        left = Math.max(8, window.innerWidth - menuRect.width - 8);
      }
      if (top + menuRect.height > window.innerHeight) {
        top = Math.max(8, window.innerHeight - menuRect.height - 8);
      }
      setMenuStyle({ left, top });
    };
    setTimeout(reposition, 0);
  }, [isVisible, position.x, position.y]);

  if (!isVisible) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-[hsl(var(--context-menu-bg))] text-[hsl(var(--popover-foreground))] rounded-lg shadow-xl border border-[hsl(var(--context-menu-border))]"
      style={menuStyle ? { left: menuStyle.left, top: menuStyle.top } : { left: position.x, top: position.y }}
    >
      <div className="flex flex-row items-center gap-1 px-2 py-1 min-w-[0] relative">
        <button
          className="px-1 py-1 hover:bg-[hsl(var(--context-menu-hover))] rounded transition w-8 h-8 flex items-center justify-center"
          title="Emoji"
          onClick={e => {
            e.stopPropagation();
            if (!showEmojiPicker && menuRef.current) {
              const menuRect = menuRef.current.getBoundingClientRect();
              const pickerHeight = 400; // Approximate height of emoji picker
              const spaceBelow = window.innerHeight - menuRect.bottom;
              const spaceAbove = menuRect.top;
              if (spaceBelow < pickerHeight && spaceAbove > pickerHeight) {
                setEmojiPickerDirection('up');
              } else {
                setEmojiPickerDirection('down');
              }
            }
            setShowEmojiPicker(v => !v);
          }}
        >
          <Smile className="w-5 h-5" />
        </button>
        {showEmojiPicker && (
          <div
            ref={emojiPickerRef}
            style={{
              position: 'absolute',
              zIndex: 100,
              left: 0,
              top: emojiPickerDirection === 'down' ? '110%' : undefined,
              bottom: emojiPickerDirection === 'up' ? '110%' : undefined,
            }}
            onClick={e => e.stopPropagation()}
          >
            <Suspense fallback={<div className="p-4 text-center">Loading…</div>}>
              <EmojiMartPicker
                data={data}
                theme={theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : (theme === 'dark' ? 'dark' : 'light')}
                onEmojiSelect={(emoji: any) => {
                  onInsertEmoji(emoji.native || '');
                  setShowEmojiPicker(false);
                }}
                previewPosition="none"
                skinTonePosition="search"
                autoFocus={false}
                style={{
                  width: 320,
                  maxHeight: 380,
                  minHeight: 200,
                  overflowY: 'auto',
                }}
              />
            </Suspense>
          </div>
        )}
        <button
          className="px-1 py-1 hover:bg-[hsl(var(--context-menu-hover))] rounded transition w-8 h-8 flex items-center justify-center"
          title="Horizontal Line"
          onClick={() => { onInsertDivider(); onClose(); }}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 20 20" className="w-5 h-5"><rect x="3" y="9" width="14" height="2" rx="1" fill="currentColor"/></svg>
        </button>
      </div>
    </div>
  );
};

// Add preset color swatches for the text color popover
const TEXT_COLOR_SWATCHES = [
  '#FF4081', '#FF9800', '#795548', '#222222',
  '#F8BBD0', '#7C4DFF', '#4CAF50', '#2196F3',
];

// Add preset color swatches for the highlighter color popover
const HIGHLIGHTER_COLOR_SWATCHES = [
  '#FFFF00', '#FFEB3B', '#FFD740', '#FFAB00',
  '#FF4081', '#00E676', '#18FFFF', '#FF6D00',
];



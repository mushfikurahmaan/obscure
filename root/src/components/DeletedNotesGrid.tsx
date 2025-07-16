import React from 'react';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from './ui/context-menu';
import type { Note } from '../pages/Index';
import { RotateCcw, Trash2 } from 'lucide-react';

interface DeletedNotesGridProps {
  notes: Note[];
  onRestore: (noteId: string) => void;
  onDeletePermanently: (noteId: string) => void;
  onSelectNote: (note: Note) => void;
}

// Helper to extract plain text from Slate JSON or fallback to string
function getNotePreviewText(content: string): string {
  if (!content) return '';
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      // Minimal slateValueToText logic
      return parsed.map((node: any) =>
        node.children ? node.children.map((child: any) => child.text || '').join('') : ''
      ).join('\n');
    }
  } catch {}
  return content;
}

// Helper to format date as per requirements
function formatNoteDate(date: Date | string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const time = pad(d.getHours()) + ':' + pad(d.getMinutes());
  if (isToday) return `Today ${time}`;
  if (isYesterday) return `Yesterday ${time}`;
  const month = d.toLocaleString('default', { month: 'long' });
  return `${month} ${d.getDate()} ${time}`;
}

export const DeletedNotesGrid: React.FC<DeletedNotesGridProps> = ({ notes, onRestore, onDeletePermanently, onSelectNote }) => {
  return (
    <div className="p-8 w-full h-full flex flex-col">
      {notes.length === 0 ? (
        <div className="text-[hsl(var(--muted-foreground))] text-center mt-16">No deleted notes.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map(note => (
            <ContextMenu key={note.id}>
              <ContextMenuTrigger asChild>
                <div
                  className="relative flex flex-col gap-2 px-5 py-4 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-md hover:shadow-xl transition-all cursor-pointer select-none group min-h-[120px]"
                  onClick={() => onSelectNote(note)}
                  tabIndex={0}
                >
                  {/* Title and Favorite Emoji in one row */}
                  <div className="flex items-center mb-1">
                    <div className="font-semibold text-lg text-[hsl(var(--foreground))] truncate" style={{width: note.isFavorite && note.favoriteEmoji ? '90%' : '100%'}}>{note.title || 'Untitled Note'}</div>
                    {note.isFavorite && note.favoriteEmoji && (
                      <div className="flex justify-end items-center ml-2" style={{width: '10%'}}>
                        <span className="w-7 h-7 text-2xl drop-shadow" title="Favorite" role="img" aria-label="favorite emoji">
                          {note.favoriteEmoji}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-2 mb-2">
                    {getNotePreviewText(note.content)}
                  </div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] mt-auto flex gap-2">
                    <span>Created: {formatNoteDate(note.createdAt)}</span>
                    <span>•</span>
                    <span>Last Modified: {formatNoteDate(note.updatedAt)}</span>
                  </div>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => onRestore(note.id)} variant="default">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onDeletePermanently(note.id)} variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Permanently
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
      )}
    </div>
  );
}; 
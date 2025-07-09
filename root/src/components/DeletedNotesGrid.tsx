import React from 'react';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from './ui/context-menu';
import type { Note } from '../pages/Index';

interface DeletedNotesGridProps {
  notes: Note[];
  onRestore: (noteId: string) => void;
  onDeletePermanently: (noteId: string) => void;
  onSelectNote: (note: Note) => void;
}

export const DeletedNotesGrid: React.FC<DeletedNotesGridProps> = ({ notes, onRestore, onDeletePermanently, onSelectNote }) => {
  return (
    <div className="p-8 w-full h-full flex flex-col">
      {notes.length === 0 ? (
        <div className="text-[hsl(var(--muted-foreground))] text-center mt-16">No deleted notes.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map(note => (
            <ContextMenu key={note.id}>
              <ContextMenuTrigger asChild>
                <div
                  className="flex items-center gap-4 px-4 py-3 rounded-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] hover:border-blue-500 transition cursor-pointer select-none"
                  onClick={() => onSelectNote(note)}
                  tabIndex={0}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[hsl(var(--foreground))] truncate">{note.title || 'Untitled Note'}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))] truncate">Created: {note.createdAt ? new Date(note.createdAt).toLocaleString() : ''}</div>
                  </div>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => onRestore(note.id)} variant="default">
                  Restore
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onDeletePermanently(note.id)} variant="destructive">
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
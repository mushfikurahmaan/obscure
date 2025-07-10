import React from 'react';
import type { Note } from '../pages/Index';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem
} from './ui/context-menu';
import { Box, Trash2 } from 'lucide-react';

interface ArchiveNotesGridProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
  onRemoveFromArchive: (noteId: string) => void;
  onDeletePermanently: (noteId: string) => void;
}

export const ArchiveNotesGrid: React.FC<ArchiveNotesGridProps> = ({ notes, onSelectNote, onRemoveFromArchive, onDeletePermanently }) => {
  return (
    <div className="p-8 w-full h-full flex flex-col">
      {notes.length === 0 ? (
        <div className="text-[hsl(var(--muted-foreground))] text-center mt-16">No archived notes.</div>
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
                <ContextMenuItem onClick={() => onRemoveFromArchive(note.id)}>
                  <Box className="w-4 h-4 mr-2" />
                  Remove from Archive
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
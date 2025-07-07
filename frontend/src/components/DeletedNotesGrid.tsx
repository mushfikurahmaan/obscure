import React from 'react';
import { Button } from './ui/button';
import type { Note } from '../pages/Index';

interface DeletedNotesGridProps {
  notes: Note[];
  onRestore: (noteId: string) => void;
  onDeletePermanently: (noteId: string) => void;
  onSelectNote: (note: Note) => void;
  onBack: () => void;
}

export const DeletedNotesGrid: React.FC<DeletedNotesGridProps> = ({ notes, onRestore, onDeletePermanently, onSelectNote, onBack }) => {
  return (
    <div className="p-8 w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Deleted Notes</h2>
        <Button onClick={onBack} className="bg-gray-700 text-white hover:bg-gray-600">Back</Button>
      </div>
      {notes.length === 0 ? (
        <div className="text-gray-400 text-center mt-16">No deleted notes.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map(note => (
            <div key={note.id} className="bg-[#232323] rounded-lg shadow p-5 flex flex-col gap-3 border border-gray-700 hover:border-blue-500 transition cursor-pointer group" onClick={() => onSelectNote(note)}>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white truncate mb-1">{note.title || 'Untitled Note'}</h3>
                <p className="text-sm text-gray-400 truncate">{note.content?.slice(0, 60) || 'No content'}</p>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">Deleted: {note.updatedAt ? new Date(note.updatedAt).toLocaleString() : ''}</span>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-600 text-white hover:bg-green-700" onClick={e => { e.stopPropagation(); onRestore(note.id); }}>Restore</Button>
                  <Button size="sm" className="bg-red-600 text-white hover:bg-red-700" onClick={e => { e.stopPropagation(); onDeletePermanently(note.id); }}>Delete Permanently</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 
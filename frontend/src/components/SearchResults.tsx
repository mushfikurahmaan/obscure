
import { Search} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import type { Note } from '../pages/Index';

interface SearchResultsProps {
  query: string;
  results: Note[];
  onSelectNote: (note: Note) => void;
  isDark: boolean;
}

export const SearchResults = ({ query, results, onSelectNote, isDark }: SearchResultsProps) => {
  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className={`${isDark ? 'bg-yellow-600/30 text-yellow-200' : 'bg-yellow-200 text-yellow-800'} px-1 rounded`}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <div className="flex items-center space-x-4 mb-8">
        <div className={`w-12 h-12 ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg flex items-center justify-center`}>
          <Search className={`w-6 h-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
        </div>
        <div>
          <h2 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-black'}`}>Search Results</h2>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Found {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
          </p>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-12">
          <div className={`w-16 h-16 ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg flex items-center justify-center mx-auto mb-4`}>
            <Search className={`w-8 h-8 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
          </div>
          <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-black'} mb-2`}>No results found</h3>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Try adjusting your search terms</p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((note) => (
            <Button
              key={note.id}
              variant="ghost"
              onClick={() => onSelectNote(note)}
              className={`w-full p-6 h-auto text-left justify-start ${isDark ? 'hover:bg-gray-800 border border-gray-800' : 'hover:bg-gray-50 border border-gray-200'} rounded-lg`}
            >
              <div className="w-full">
                <div className="flex items-start justify-between mb-3">
                  <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-black'}`}>
                    {highlightText(note.title, query)}
                  </h3>
                  <Badge variant="secondary" className={`${isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-200 text-gray-700 border-gray-300'}`}>
                    {note.category}
                  </Badge>
                </div>
                
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-4 leading-relaxed`}>
                  {highlightText(truncateContent(note.content), query)}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {note.tags.slice(0, 3).map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className={`text-xs ${isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-200 text-gray-700 border-gray-300'}`}
                      >
                        {highlightText(tag, query)}
                      </Badge>
                    ))}
                    {note.tags.length > 3 && (
                      <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>+{note.tags.length - 3}</span>
                    )}
                  </div>
                  <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    {new Intl.DateTimeFormat('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }).format(note.updatedAt)}
                  </span>
                </div>
              </div>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};
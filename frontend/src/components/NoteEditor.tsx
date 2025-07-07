import { useState, useEffect } from 'react';
import { Tag, Plus, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Note } from '../pages/Index';

interface NoteEditorProps {
  note: Note;
  onUpdate: (note: Note) => void;
  isDark: boolean;
  alignLeft?: number;
}

export const NoteEditor = ({ note, onUpdate, isDark, alignLeft = 0 }: NoteEditorProps) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState<string[]>(note.tags);
  const [newTag, setNewTag] = useState('');
  const [category, setCategory] = useState(note.category);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags);
    setCategory(note.category);
  }, [note]);

  const handleSave = () => {
    onUpdate({
      ...note,
      title,
      content,
      tags,
      category
    });
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
    const timeoutId = setTimeout(() => {
      if (title !== note.title || content !== note.content || tags !== note.tags || category !== note.category) {
        handleSave();
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [title, content, tags, category]);

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#1c1c1c' }}>
      {/* Editor Content */}
      <div
        className="flex-1 p-8 w-full"
        style={{ paddingLeft: alignLeft, paddingRight: alignLeft }}
      >
        {/* Tags */}
        <div className="flex items-center space-x-2 mb-6">
          <Badge
            variant="secondary"
            className="px-4 py-1 text-sm font-medium bg-white/5 backdrop-blur-sm text-green-400 border border-green-700 rounded-xl"
            style={{ minHeight: '2.25rem' }}
          >
            Design Thinking
          </Badge>
          <Badge
            variant="secondary"
            className="px-4 py-1 text-sm font-medium bg-white/5 backdrop-blur-sm text-blue-400 border border-blue-700 rounded-xl"
            style={{ minHeight: '2.25rem' }}
          >
            UI/UX Design
          </Badge>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
          The Essentials of Navigation Architecture.
        </h1>

        {/* Metadata */}
        <div className="flex items-center space-x-4 mb-8 text-sm">
          <span className="text-gray-400">
            Created 2 days ago
          </span>
          <span className="text-gray-600">•</span>
          <span className="text-gray-400">
            Last modified 12 hours ago
          </span>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              What is Navigation Architecture?
            </h2>
            <p className="text-gray-300 leading-relaxed text-base">
              Navigation architecture refers to the structure and organization of a website or application's navigation system. It encompasses the hierarchy of content, the placement of navigational elements, and the pathways that users take to access different sections of the digital product. Effective navigation architecture is crucial for enhancing usability and improving the overall user experience.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              Why is Navigation Architecture Important?
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-white mb-2">
                  <span className="text-gray-400">1.</span> User Experience:
                </h3>
                <p className="text-gray-300 leading-relaxed text-base ml-6">
                  Good navigation architecture ensures that users can find what they are looking for without frustration. It reduces the <span className="text-yellow-400 underline">cognitive load</span> and makes the interaction with the digital product intuitive and enjoyable.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-2">
                  <span className="text-gray-400">2.</span> Engagement and Retention:
                </h3>
                <p className="text-gray-300 leading-relaxed text-base ml-6">
                  When users can navigate easily, they are more likely to stay longer, explore more content, and return in the future. Poor navigation, on the other hand, can lead to higher bounce rates and lower user retention.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Visual Example</h2>
            <div className="flex justify-center mb-6">
              <img src="https://via.placeholder.com/600x200?text=Navigation+Diagram" alt="Navigation Example" className="rounded-lg shadow-lg" />
            </div>
            <p className="text-gray-300 leading-relaxed text-base">
              Here is a visual representation of a navigation architecture. Notice how the main sections are clearly defined and the pathways between them are intuitive. This helps users find what they need quickly and efficiently.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Best Practices</h2>
            <ul className="list-disc ml-8 text-gray-300 text-base space-y-2">
              <li>Keep navigation simple and consistent across all pages.</li>
              <li>Use clear labels for navigation items.</li>
              <li>Group related content together.</li>
              <li>Provide a search function for large sites or apps.</li>
              <li>Test navigation with real users and iterate based on feedback.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Further Reading</h2>
            <p className="text-gray-300 leading-relaxed text-base mb-2">
              If you want to learn more about navigation architecture, check out these resources:
            </p>
            <ul className="list-disc ml-8 text-blue-400 text-base space-y-2">
              <li><a href="https://www.nngroup.com/articles/information-architecture-ia/" target="_blank" rel="noopener noreferrer" className="underline">Nielsen Norman Group: Information Architecture</a></li>
              <li><a href="https://uxdesign.cc/information-architecture-for-designers-8d73a8b4b8a7" target="_blank" rel="noopener noreferrer" className="underline">UX Design: Information Architecture for Designers</a></li>
              <li><a href="https://www.smashingmagazine.com/2018/01/information-architecture-design-principles/" target="_blank" rel="noopener noreferrer" className="underline">Smashing Magazine: Information Architecture Design Principles</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Long Example Content</h2>
            <p className="text-gray-300 leading-relaxed text-base mb-2">
              {`Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque euismod, urna eu tincidunt consectetur, nisi nisl aliquam enim, eget consequat massa enim nec dui. `.repeat(20)}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Extra Long Example Content</h2>
            <p className="text-gray-300 leading-relaxed text-base mb-2">
              {`This is extra content to ensure the main section is scrollable. `.repeat(100)}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
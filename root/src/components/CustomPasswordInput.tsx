import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface CustomPasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string; // Add id as an optional prop
}

const mask = (value: string) => '•'.repeat(value.length);

const CustomPasswordInput: React.FC<CustomPasswordInputProps> = ({
  value,
  onChange,
  placeholder = 'Enter password',
  disabled = false,
  autoFocus = false,
  id, // Accept id prop
}) => {
  const [showPassword, setShowPassword] = useState(false);

  // Handle input so that when masked, user can still type naturally
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (showPassword) {
      onChange(e.target.value);
    } else {
      // Only allow appending or deleting from the end
      const prevLength = value.length;
      const newLength = e.target.value.length;
      if (newLength < prevLength) {
        // Deleting
        onChange(value.slice(0, newLength));
      } else if (newLength > prevLength) {
        // Adding
        const added = e.target.value.slice(-1);
        onChange(value + added);
      }
      // If same length, do nothing
    }
  };

  return (
    <div className="relative w-full">
      <input
        id={id} // Only set id if provided
        type="text"
        inputMode="text"
        className="w-full border rounded-lg px-3 py-2 text-base pr-10 focus:ring-2 focus:ring-primary focus:border-primary transition bg-[hsl(var(--background))]"
        placeholder={placeholder}
        value={showPassword ? value : mask(value)}
        onChange={handleChange}
        autoFocus={autoFocus}
        disabled={disabled}
        aria-label="Password"
        autoComplete="off"
        spellCheck={false}
        onCopy={e => { if (!showPassword) e.preventDefault(); }}
        onPaste={e => { if (!showPassword) e.preventDefault(); }}
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
        onClick={() => setShowPassword(v => !v)}
        disabled={disabled}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  );
};

export default CustomPasswordInput; 
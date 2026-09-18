import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Badge } from './Badge';

export const TagInput = ({
  tags = [],
  onChange,
  placeholder = 'Add a skill and press Enter...',
  maxTags = 25,
}) => {
  const [inputVal, setInputVal] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputVal && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const addTag = () => {
    const trimmed = inputVal.trim().replace(/^,+|,+$/g, '');
    if (trimmed && !tags.includes(trimmed) && tags.length < maxTags) {
      onChange([...tags, trimmed]);
      setInputVal('');
    }
  };

  const removeTag = (indexToRemove) => {
    onChange(tags.filter((_, i) => i !== indexToRemove));
  };

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-md)',
        minHeight: '42px',
      }}
    >
      {tags.map((tag, idx) => (
        <Badge
          key={idx}
          variant="accent"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
          }}
        >
          <span>{tag}</span>
          <button
            type="button"
            onClick={() => removeTag(idx)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 0,
              opacity: 0.8,
            }}
          >
            <X size={12} />
          </button>
        </Badge>
      ))}

      {tags.length < maxTags && (
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? placeholder : ''}
          style={{
            flex: 1,
            minWidth: '120px',
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            padding: '4px',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-sm)',
            outline: 'none',
          }}
        />
      )}
    </div>
  );
};

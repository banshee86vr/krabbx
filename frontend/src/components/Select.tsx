import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function Select({ options, value, onChange, placeholder, className }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption?.label || placeholder || 'Select...';

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
          'text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'dark:border-secondary-500/30 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500',
          'dark:focus:ring-primary-500 dark:focus:border-primary-500/50 dark:shadow-lg dark:shadow-primary-500/10',
          'transition-colors'
        )}
      >
        <span>{displayLabel}</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={cn(
          'absolute top-full left-0 right-0 mt-2 z-50',
          'rounded-md border border-gray-200 bg-white shadow-lg',
          'dark:border-secondary-500/30 dark:bg-slate-800 dark:shadow-lg dark:shadow-secondary-500/10'
        )}>
          <ul className="py-1">
            {options.map((option) => (
              <li key={option.value}>
                <button
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm transition-colors',
                    value === option.value
                      ? 'bg-primary-500 text-white dark:bg-primary-600 dark:text-slate-100'
                      : 'text-gray-900 hover:bg-gray-100 dark:text-slate-100 dark:hover:bg-slate-700'
                  )}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

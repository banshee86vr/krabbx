import { cn } from '../lib/utils';

interface AvatarProps {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ src, alt, size = 'md', className }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        'rounded-full object-cover border border-neutral-200',
        sizeClasses[size],
        className
      )}
    />
  );
}

interface AvatarGroupProps {
  contributors: Array<{ login: string; avatarUrl: string; profileUrl: string }>;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarGroup({ contributors, max = 4, size = 'md' }: AvatarGroupProps) {
  const displayed = contributors.slice(0, max);
  const remaining = contributors.length - max;

  return (
    <div className="flex items-center -space-x-2">
      {displayed.map((contributor) => (
        <a
          key={contributor.login}
          href={contributor.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={contributor.login}
          className="inline-block hover:z-10 transition-transform hover:scale-110"
        >
          <Avatar
            src={contributor.avatarUrl}
            alt={contributor.login}
            size={size}
            className="ring-2 ring-white hover:ring-action-300"
          />
        </a>
      ))}
      {remaining > 0 && (
        <div className={cn(
          'rounded-full bg-neutral-100 text-neutral-500 font-semibold flex items-center justify-center border border-neutral-200 ring-2 ring-white',
          {
            'w-6 h-6 text-xs': size === 'sm',
            'w-8 h-8 text-xs': size === 'md',
            'w-10 h-10 text-sm': size === 'lg',
          }
        )}>
          +{remaining}
        </div>
      )}
    </div>
  );
}

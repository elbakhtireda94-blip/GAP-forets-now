import React from 'react';
import { TreePine } from 'lucide-react';

interface AnefLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AnefLogo: React.FC<AnefLogoProps> = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: { icon: 24, text: 'text-lg' },
    md: { icon: 36, text: 'text-2xl' },
    lg: { icon: 48, text: 'text-3xl' },
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <div className="absolute inset-0 bg-primary-foreground/20 blur-lg rounded-full" />
        <div className="relative bg-primary-foreground/10 backdrop-blur-sm rounded-full p-2 border border-primary-foreground/30">
          <TreePine size={sizes[size].icon} className="text-primary-foreground" strokeWidth={1.5} />
        </div>
      </div>
      <div className="flex flex-col">
        <span className={`${sizes[size].text} font-bold text-primary-foreground tracking-tight`}>
          ANEF
        </span>
        <span className="text-xs text-primary-foreground/80 font-medium">
          Agence Nationale des Eaux et Forêts
        </span>
      </div>
    </div>
  );
};

export default AnefLogo;

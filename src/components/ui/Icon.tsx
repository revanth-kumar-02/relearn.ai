import React from 'react';

interface IconProps {
  name: string;
  className?: string;
  filled?: boolean;
}

const Icon: React.FC<IconProps> = ({ name, className = '', filled = false }) => {
  return (
    <span 
      className={`material-symbols-outlined transition-all ${filled ? 'filled' : ''} ${className}`}
      aria-hidden="true"
    >
      {name}
    </span>
  );
};

export default Icon;

import React from 'react';
import type { HttpMethod } from '../../types/request';

interface MethodBadgeProps {
  method: HttpMethod;
  className?: string;
}

export const MethodBadge: React.FC<MethodBadgeProps> = ({ method, className = '' }) => {
  return (
    <span className={`method-badge method-${method.toLowerCase()} ${className}`}>
      {method}
    </span>
  );
};

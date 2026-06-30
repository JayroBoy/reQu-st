import React from 'react';
import type { HttpMethod } from '../../types/request';

interface MethodBadgeProps {
  method: HttpMethod;
  className?: string;
  small?: boolean;
}

export const MethodBadge: React.FC<MethodBadgeProps> = ({ method, className = '', small = false }) => {
  return (
    <span className={`method-badge method-${method.toLowerCase()} ${small ? 'small' : ''} ${className}`}>
      {method}
    </span>
  );
};

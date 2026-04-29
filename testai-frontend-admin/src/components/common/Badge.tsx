
import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'gray' | 'method' | 'default';
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'gray', method }) => {
  const methodColors = {
    GET: 'bg-green-100 text-green-700 border-green-200',
    POST: 'bg-blue-100 text-blue-700 border-blue-200',
    PUT: 'bg-orange-100 text-orange-700 border-orange-200',
    DELETE: 'bg-red-100 text-red-700 border-red-200',
    PATCH: 'bg-purple-100 text-purple-700 border-purple-200',
  };

  const variants = {
    success: 'bg-green-100 text-green-700 border-green-200',
    danger: 'bg-red-100 text-red-700 border-red-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    info: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    default: 'bg-blue-100 text-blue-700 border-blue-200',
    method: method ? methodColors[method] : 'bg-gray-100 text-gray-700',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${variants[variant]}`}>
      {children}
    </span>
  );
};

export default Badge;

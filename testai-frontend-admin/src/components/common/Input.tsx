import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  type?: string; // optional override
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  onBlur,
  disabled = false,
  className = '',
  type = 'text', // 👈 default type
  ...props
}) => {
  return (
    <div className="w-full mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {icon}
          </div>
        )}

        <input
          type={type} // 👈 explicitly set here
          className={`
            block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 outline-none
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-danger focus:ring-danger' : 'border-gray-300'}
            ${className}
          `}
          disabled={disabled}
          onBlur={onBlur}
          {...props}
        />
      </div>

      {error && (
        <p className="mt-1 text-xs text-danger font-medium">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
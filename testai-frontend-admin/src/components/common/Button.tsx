
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  icon,
  className = '',
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-bold rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95";
  
  const variants = {
    primary: "bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary-dark hover:shadow-primary/40 focus:ring-primary/30",
    secondary: "bg-secondary text-white shadow-lg shadow-secondary/20 hover:bg-slate-800 focus:ring-secondary/30",
    danger: "bg-danger text-white shadow-lg shadow-danger/20 hover:bg-red-600 focus:ring-danger/30",
    outline: "bg-transparent border-2 border-slate-200 text-slate-700 hover:border-primary hover:text-primary hover:bg-primary/5 focus:ring-primary/20",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-200"
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-10 py-4 text-lg"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;

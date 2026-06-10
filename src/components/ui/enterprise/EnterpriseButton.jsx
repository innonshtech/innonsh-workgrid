import React from 'react';
import { Loader2 } from 'lucide-react';

export function EnterpriseButton({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  disabled = false,
  className = '',
  iconClassName = '',
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-semibold transition-all active:scale-[0.98]';
  
  const sizeClasses = {
    sm: 'h-10 px-4 text-xs rounded-lg',
    md: 'h-11 px-5 text-sm rounded-xl',
    lg: 'h-12 px-6 text-sm rounded-xl'
  };

  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm hover:border-slate-300 rounded-xl px-5 py-2.5',
    danger: 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 shadow-sm rounded-xl px-5 py-2.5',
    success: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 shadow-sm rounded-xl px-5 py-2.5',
    outline: 'bg-transparent border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl px-5 py-2.5',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 border border-transparent rounded-xl px-5 py-2.5',
  };

  const disabledClasses = (disabled || loading) ? 'opacity-60 cursor-not-allowed active:scale-100' : '';

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${disabledClasses} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : Icon ? (
        <Icon className={`w-4 h-4 ${iconClassName}`} />
      ) : null}
      {children}
    </button>
  );
}

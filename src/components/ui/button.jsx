export function Button({ children, className = '', variant = 'default', ...props }) {
  const baseClasses = 'inline-flex items-center justify-center text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none';
  
  const variants = {
    default: 'btn-primary',
    outline: 'border border-gray-300 bg-white hover:bg-gray-100 text-gray-900 rounded-xl px-5 py-2.5 active:scale-[0.98]',
    ghost: 'hover:bg-gray-100 text-gray-900 rounded-xl px-5 py-2.5 active:scale-[0.98]',
  };

  return (
    <button className={`${variant === 'default' ? '' : baseClasses} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
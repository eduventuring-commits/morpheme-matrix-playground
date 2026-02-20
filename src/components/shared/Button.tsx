import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
type Size    = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-primary-600 hover:bg-primary-700 text-white shadow-sm active:scale-95',
  secondary: 'bg-white border-2 border-primary-200 text-primary-700 hover:border-primary-400 hover:bg-primary-50 active:scale-95',
  danger:    'bg-danger-500 hover:bg-danger-700 text-white shadow-sm active:scale-95',
  ghost:     'text-primary-700 hover:bg-primary-50 active:scale-95',
  success:   'bg-success-500 hover:bg-success-700 text-white shadow-sm active:scale-95',
};

const sizeClasses: Record<Size, string> = {
  sm:  'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md:  'px-4 py-2 text-base rounded-xl gap-2',
  lg:  'px-6 py-3 text-lg rounded-xl gap-2',
  xl:  'px-8 py-4 text-xl rounded-2xl gap-3',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}) => (
  <button
    {...props}
    disabled={disabled || loading}
    className={[
      'inline-flex items-center justify-center font-bold transition-all duration-150 select-none',
      variantClasses[variant],
      sizeClasses[size],
      fullWidth ? 'w-full' : '',
      disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      className,
    ].join(' ')}
  >
    {loading ? (
      <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
    ) : (
      icon
    )}
    {children}
    {iconRight && !loading && iconRight}
  </button>
);

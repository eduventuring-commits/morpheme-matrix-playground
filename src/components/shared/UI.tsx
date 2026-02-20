import React from 'react';
import type { Morpheme } from '../../types';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'xl';
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: Size; icon?: React.ReactNode; iconRight?: React.ReactNode;
  loading?: boolean; fullWidth?: boolean;
}
const variantClasses: Record<Variant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-95',
  secondary: 'bg-white border-2 border-blue-200 text-blue-700 hover:border-blue-400 hover:bg-blue-50 active:scale-95',
  danger: 'bg-red-500 hover:bg-red-700 text-white shadow-sm active:scale-95',
  ghost: 'text-blue-700 hover:bg-blue-50 active:scale-95',
  success: 'bg-green-500 hover:bg-green-700 text-white shadow-sm active:scale-95',
};
const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5', md: 'px-4 py-2 text-base rounded-xl gap-2',
  lg: 'px-6 py-3 text-lg rounded-xl gap-2', xl: 'px-8 py-4 text-xl rounded-2xl gap-3',
};
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary', size = 'md', icon, iconRight, loading = false,
  fullWidth = false, children, className = '', disabled, ...props
}) => (
  <button {...props} disabled={disabled || loading} className={[
    'inline-flex items-center justify-center font-bold transition-all duration-150 select-none',
    variantClasses[variant], sizeClasses[size],
    fullWidth ? 'w-full' : '',
    disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer', className,
  ].join(' ')}>
    {loading ? <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> : icon}
    {children}
    {iconRight && !loading && iconRight}
  </button>
);

export const Card: React.FC<{children: React.ReactNode; className?: string; onClick?: () => void; hover?: boolean; padding?: 'none'|'sm'|'md'|'lg';}> = ({
  children, className = '', onClick, hover = false, padding = 'md',
}) => (
  <div onClick={onClick} className={['bg-white rounded-2xl shadow border border-gray-100',
    hover ? 'hover:shadow-lg transition-shadow cursor-pointer' : '',
    {none:'',sm:'p-3',md:'p-5',lg:'p-7'}[padding], className].join(' ')}>
    {children}
  </div>
);

export const MorphemeChip: React.FC<{morpheme: Morpheme; selected?: boolean; onClick?: () => void; showMeaning?: boolean; size?: 'sm'|'md'|'lg';}> = ({
  morpheme, selected = false, onClick, showMeaning = false, size = 'md',
}) => {
  const colors = {
    prefix: { base: 'bg-sky-100 text-sky-800 border-sky-200', selected: 'bg-sky-500 text-white border-sky-600 shadow-lg scale-105' },
    base:   { base: 'bg-emerald-100 text-emerald-800 border-emerald-200', selected: 'bg-emerald-500 text-white border-emerald-600 shadow-lg scale-105' },
    suffix: { base: 'bg-amber-100 text-amber-800 border-amber-200', selected: 'bg-amber-500 text-white border-amber-600 shadow-lg scale-105' },
  }[morpheme.type];
  const sz = { sm: 'text-sm px-3 py-1.5 rounded-lg', md: 'text-base px-4 py-2 rounded-xl', lg: 'text-xl px-6 py-3 rounded-2xl' }[size];
  return (
    <button onClick={onClick} title={`${morpheme.text}: ${morpheme.meaning}`}
      className={['border-2 font-bold transition-all duration-150 inline-flex flex-col items-center',
        selected ? colors.selected : colors.base, sz,
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'].join(' ')}>
      <span>{morpheme.text}</span>
      {showMeaning && <span className={`text-xs font-normal mt-0.5 ${selected ? 'text-white/80' : 'text-gray-500'}`}>{morpheme.meaning}</span>}
    </button>
  );
};

export const Badge: React.FC<{children: React.ReactNode; color?: 'blue'|'green'|'orange'|'red'|'purple'|'gray';}> = ({
  children, color = 'blue',
}) => (
  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${{
    blue:'bg-blue-100 text-blue-700', green:'bg-green-100 text-green-700',
    orange:'bg-orange-100 text-orange-700', red:'bg-red-100 text-red-700',
    purple:'bg-purple-100 text-purple-700', gray:'bg-gray-100 text-gray-600',
  }[color]}`}>{children}</span>
);

export const EmptyState: React.FC<{icon?: string; title: string; message: string}> = ({
  icon = '🔍', title, message,
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-5xl mb-4">{icon}</div>
    <h3 className="text-xl font-bold text-gray-700 mb-2">{title}</h3>
    <p className="text-gray-500 max-w-sm">{message}</p>
  </div>
);

export const SectionHeader: React.FC<{title: string; subtitle?: string; icon?: string; action?: React.ReactNode;}> = ({
  title, subtitle, icon, action,
}) => (
  <div className="flex items-center justify-between mb-6">
    <div>
      <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
        {icon && <span>{icon}</span>}{title}
      </h2>
      {subtitle && <p className="text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

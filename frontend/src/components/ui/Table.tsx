import { cn } from '@/lib/utils';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full', className)}>{children}</table>
    </div>
  );
}

export function TableHeader({ children, className }: TableProps) {
  return <thead className={cn('bg-gray-50', className)}>{children}</thead>;
}

export function TableBody({ children, className }: TableProps) {
  return <tbody className={cn('divide-y divide-gray-100', className)}>{children}</tbody>;
}

export function TableRow({ children, className }: TableProps) {
  return <tr className={cn('hover:bg-gray-50', className)}>{children}</tr>;
}

export function TableHead({ children, className }: TableProps) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider',
        className
      )}
    >
      {children}
    </th>
  );
}

export function TableCell({ children, className }: TableProps) {
  return <td className={cn('px-4 py-3 text-sm text-gray-700', className)}>{children}</td>;
}

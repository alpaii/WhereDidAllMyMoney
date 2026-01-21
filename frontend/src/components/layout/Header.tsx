'use client';

interface HeaderProps {
  title: string;
  action?: React.ReactNode;
}

export default function Header({ title, action }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 lg:px-6 flex items-center justify-between">
      {/* Title - hidden on mobile due to hamburger menu */}
      <div className="ml-12 lg:ml-0">
        <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      </div>
      {/* Action button */}
      {action && <div>{action}</div>}
    </header>
  );
}

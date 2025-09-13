import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DashboardPageProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

/**
 * Reusable dashboard page layout component
 * Ensures consistent spacing and layout across all dashboard pages
 */
export function DashboardPage({
  title,
  description,
  children,
  className,
  actions,
}: DashboardPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 leading-normal">
                {title}
              </h1>
              {description && (
                <p className="mt-1 text-sm text-gray-500">{description}</p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-3">{actions}</div>
            )}
          </div>
        </div>

        {/* Page Content */}
        <div className={cn(className)}>{children}</div>
      </div>
    </div>
  );
}

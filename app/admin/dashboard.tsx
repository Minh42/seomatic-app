'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { rootDomain, protocol } from '@/lib/utils';

type Tenant = {
  subdomain: string;
  emoji: string;
  createdAt: number;
};

function DashboardHeader() {
  // TODO: You can add authentication here with your preferred auth provider

  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-3xl font-bold">Subdomain Management</h1>
      <div className="flex items-center gap-4">
        <Link
          href={`${protocol}://${rootDomain}`}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          {rootDomain}
        </Link>
      </div>
    </div>
  );
}

function TenantGrid({
  tenants,
  onDelete,
  deletingSubdomain,
}: {
  tenants: Tenant[];
  onDelete: (subdomain: string) => void;
  deletingSubdomain: string | null;
}) {
  if (tenants.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">No subdomains have been created yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tenants.map(tenant => (
        <Card key={tenant.subdomain}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{tenant.subdomain}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(tenant.subdomain)}
                disabled={deletingSubdomain === tenant.subdomain}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              >
                {deletingSubdomain === tenant.subdomain ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-4xl">{tenant.emoji}</div>
              <div className="text-sm text-gray-500">
                Created: {new Date(tenant.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="mt-4">
              <a
                href={`${protocol}://${tenant.subdomain}.${rootDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-sm"
              >
                Visit subdomain →
              </a>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminDashboard({
  tenants: initialTenants,
}: {
  tenants: Tenant[];
}) {
  const [tenants, setTenants] = useState(initialTenants);
  const [deletingSubdomain, setDeletingSubdomain] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // const router = useRouter();

  const handleDelete = async (subdomain: string) => {
    setDeletingSubdomain(subdomain);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/subdomain?subdomain=${subdomain}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to delete subdomain');
        return;
      }

      // Remove from local state
      setTenants(prev => prev.filter(t => t.subdomain !== subdomain));
      setSuccess('Subdomain deleted successfully');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setDeletingSubdomain(null);
    }
  };

  return (
    <div className="space-y-6 relative p-4 md:p-8">
      <DashboardHeader />
      <TenantGrid
        tenants={tenants}
        onDelete={handleDelete}
        deletingSubdomain={deletingSubdomain}
      />

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-md">
          {error}
        </div>
      )}

      {success && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-md">
          {success}
        </div>
      )}
    </div>
  );
}

import { Metadata } from 'next';
import { ConnectionsContent } from './ConnectionsContent';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Connections | SEOmatic',
  description: 'Manage your CMS and database connections',
};

export default function ConnectionsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConnectionsContent />
    </Suspense>
  );
}

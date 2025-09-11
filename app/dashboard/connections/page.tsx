import { Metadata } from 'next';
import { ConnectionsContent } from './ConnectionsContent';

export const metadata: Metadata = {
  title: 'Connections | SEOmatic',
  description: 'Manage your CMS and database connections',
};

export default function ConnectionsPage() {
  return <ConnectionsContent />;
}

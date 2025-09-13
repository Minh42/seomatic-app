import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { UserService } from '@/lib/services/user-service';
import { SettingsClient } from './SettingsClient';

export default async function SettingsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  // Fetch full user data from database to get firstName and lastName
  const user = await UserService.findByEmail(session.user.email!);

  if (!user) {
    redirect('/login');
  }

  return (
    <DashboardPage title="Settings">
      <SettingsClient user={user} />
    </DashboardPage>
  );
}

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { UserService } from '@/lib/services/user-service';
import { getUserRole } from '@/lib/auth/permissions';
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

  // Get user's role for access control
  const userRole = await getUserRole(user.id);

  return (
    <DashboardPage title="Settings">
      <SettingsClient user={user} userRole={userRole} />
    </DashboardPage>
  );
}

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export class UserService {
  static async findByEmail(email: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user || null;
  }

  static async updateProfile(
    email: string,
    updateData: Record<string, unknown>
  ) {
    return await db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email));
  }

  static async isActive(userId: string): Promise<boolean> {
    const [user] = await db
      .select({ isActive: users.isActive })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user?.isActive || false;
  }
}

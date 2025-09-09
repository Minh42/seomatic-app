import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/utils/password';
import { validateEmailDomain } from '@/lib/validations/email';
import { EmailService } from '@/lib/services/email-service';

export interface CreateUserParams {
  email: string;
  password: string;
  name?: string;
  fingerprint?: string;
}

export interface UserProfileUpdateParams {
  name?: string;
  image?: string;
}

export class UserService {
  /**
   * Create a new user account
   */
  static async createUser(params: CreateUserParams) {
    const { email, password, name } = params;

    // Validate email domain (block disposable emails)
    const emailValidation = validateEmailDomain(email);
    if (!emailValidation.isValid) {
      throw new Error(emailValidation.message || 'Invalid email domain');
    }

    // Check if user already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Create the user
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        name,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
      });

    // Send welcome email and track user creation
    await EmailService.sendWelcomeEmail({
      email: newUser.email,
      userId: newUser.id,
      createdAt: new Date(),
    });

    return newUser;
  }

  /**
   * Find a user by email
   */
  static async findByEmail(email: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    return user || null;
  }

  /**
   * Find a user by ID
   */
  static async findById(userId: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user || null;
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    updateData: UserProfileUpdateParams
  ) {
    const [updated] = await db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updated;
  }

  /**
   * Update user by email (legacy method for compatibility)
   */
  static async updateByEmail(
    email: string,
    updateData: Record<string, unknown>
  ) {
    return await db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email.toLowerCase()));
  }

  /**
   * Check if user is active
   */
  static async isActive(userId: string): Promise<boolean> {
    const [user] = await db
      .select({ isActive: users.isActive })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user?.isActive || false;
  }

  /**
   * Deactivate a user account
   */
  static async deactivate(userId: string) {
    const [updated] = await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updated;
  }

  /**
   * Reactivate a user account
   */
  static async reactivate(userId: string) {
    const [updated] = await db
      .update(users)
      .set({
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updated;
  }

  /**
   * Get total user count (for stats)
   */
  static async getTotalCount() {
    const result = await db.select({ count: users.id }).from(users);

    return result.length;
  }
}

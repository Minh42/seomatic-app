import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { verifyPassword } from '@/lib/auth/password';
import { loginSchema } from '@/lib/validations/auth';
import { loginRateLimit, checkRateLimit } from '@/lib/rate-limit';
import { eq } from 'drizzle-orm';

export const credentialsProvider = CredentialsProvider({
  id: 'credentials',
  name: 'credentials',
  credentials: {
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' },
  },
  async authorize(credentials) {
    try {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      // Validate the input
      const validatedData = loginSchema.parse({
        email: credentials.email,
        password: credentials.password,
      });

      // Check rate limit for login attempts
      const rateCheck = await checkRateLimit(
        loginRateLimit,
        validatedData.email
      );
      if (!rateCheck.success) {
        throw new Error(
          'Too many login attempts. Please wait before trying again.'
        );
      }

      // Find the user in the database
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, validatedData.email))
        .limit(1);

      if (!user) {
        return null;
      }

      // Check if user has a password (OAuth users might not)
      if (!user.passwordHash) {
        return null;
      }

      // Verify the password
      const isValidPassword = await verifyPassword(
        validatedData.password,
        user.passwordHash
      );

      if (!isValidPassword) {
        return null;
      }

      // Check if user is active
      if (!user.isActive) {
        return null;
      }

      // Check if email is verified (optional - comment out to allow unverified login)
      if (!user.emailVerified) {
        throw new Error('Please verify your email address before signing in.');
      }

      // Return the user object (NextAuth will handle the session)
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        image: user.avatarUrl,
      };
    } catch (error) {
      console.error('Credentials authorization error:', error);
      return null;
    }
  },
});

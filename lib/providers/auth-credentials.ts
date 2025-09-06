import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyPassword } from '@/lib/utils/password';
import { loginSchema } from '@/lib/validations/auth';
import { loginRateLimit, checkRateLimit } from '@/lib/auth/rate-limit';
import { UserService } from '@/lib/services/user-service';

export const credentialsProvider = CredentialsProvider({
  id: 'credentials',
  name: 'credentials',
  credentials: {
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' },
    rememberMe: { label: 'Remember Me', type: 'text' },
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
        rememberMe: credentials.rememberMe === 'true',
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
      const user = await UserService.findByEmail(validatedData.email);

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

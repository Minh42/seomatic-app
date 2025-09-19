import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyPassword } from '@/lib/utils/password';
import { loginSchema } from '@/lib/validations/auth';
import { RateLimitService } from '@/lib/services/rate-limit-service';
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
      const rateCheck = await RateLimitService.check(
        'login',
        `email:${validatedData.email}`
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

      // Return the user object with rememberMe flag
      // The rememberMe value needs to be accessible in the JWT callback
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.profileImage,
        // Add rememberMe to the user object so it can be accessed in jwt callback
        rememberMe: validatedData.rememberMe,
      };
    } catch {
      return null;
    }
  },
});

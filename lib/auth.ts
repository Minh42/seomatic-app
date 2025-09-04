import { type NextAuthOptions } from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import LinkedInProvider from 'next-auth/providers/linkedin';
import TwitterProvider from 'next-auth/providers/twitter';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createBentoEmailProvider } from '@/lib/auth/email-provider';
import { credentialsProvider } from '@/lib/auth/credentials-provider';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    image?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sub: string;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db),
  providers: [
    credentialsProvider,
    createBentoEmailProvider(),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: '2.0',
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  callbacks: {
    async session({ token, session }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ user, token }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async signIn({ account, profile }) {
      // Handle OAuth provider data mapping
      if (account?.provider && profile) {
        try {
          const profileData = profile as Record<string, unknown>;
          const updateData: Record<string, unknown> = {
            avatarUrl: profileData.picture || profileData.image,
            updatedAt: new Date(),
          };

          // Map provider-specific fields
          if (account.provider === 'google') {
            updateData.firstName = profileData.given_name;
            updateData.lastName = profileData.family_name;
            updateData.googleId = profileData.sub;
          } else if (account.provider === 'facebook') {
            updateData.firstName = profileData.first_name;
            updateData.lastName = profileData.last_name;
            updateData.facebookId = profileData.id;
          } else if (account.provider === 'linkedin') {
            updateData.firstName = profileData.given_name;
            updateData.lastName = profileData.family_name;
            updateData.linkedinId = profileData.sub;
          } else if (account.provider === 'twitter') {
            // Twitter provides full name only
            const fullName = (profileData.name as string) || '';
            const nameParts = fullName.split(' ');
            updateData.firstName = nameParts[0] || '';
            updateData.lastName = nameParts.slice(1).join(' ') || '';
            updateData.twitterId = profileData.id;
          }

          await db
            .update(users)
            .set(updateData)
            .where(eq(users.email, profile.email!));
        } catch (error) {
          console.error(
            `Failed to update user with ${account?.provider} profile:`,
            error
          );
        }
      }
      return true;
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

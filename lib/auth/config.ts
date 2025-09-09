import { type NextAuthOptions } from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import LinkedInProvider from 'next-auth/providers/linkedin';
import TwitterProvider from 'next-auth/providers/twitter';
import { db } from '@/lib/db';
import { users, accounts, verificationTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createBentoEmailProvider } from '@/lib/providers/auth-email';
import { credentialsProvider } from '@/lib/providers/auth-credentials';

// Session configuration constants
const SESSION_MAX_AGE = 24 * 60 * 60; // 24 hours in seconds
const SESSION_MAX_AGE_REMEMBER_ME = 30 * 24 * 60 * 60; // 30 days in seconds
const SESSION_UPDATE_AGE = 60 * 60; // 1 hour in seconds

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    verificationTokensTable: verificationTokens,
  }),
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
      client: {
        token_endpoint_auth_method: 'client_secret_post',
      },
      issuer: 'https://www.linkedin.com',
      wellKnown:
        'https://www.linkedin.com/oauth/.well-known/openid-configuration',
      authorization: {
        params: {
          scope: 'openid profile email',
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_API_KEY!,
      clientSecret: process.env.TWITTER_API_SECRET!,
      version: '1.0',
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_REMEMBER_ME, // Set to max possible (30 days)
    updateAge: SESSION_UPDATE_AGE, // Update session every hour
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // Set max age to 30 days for the cookie itself
        // The actual session expiry is controlled by the JWT exp claim
        maxAge: SESSION_MAX_AGE_REMEMBER_ME,
      },
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  callbacks: {
    async session({ token, session }) {
      // Token validation is already done in jwt callback
      // If we get here, the token is valid

      if (token.sub && session.user) {
        session.user.id = token.sub;
      }

      // Pass remember me status to session if needed for client-side reference
      if (token.rememberMe !== undefined) {
        (session as any).rememberMe = token.rememberMe;
      }

      // Calculate and pass the actual expiry time to the client
      if (token.exp && typeof token.exp === 'number') {
        (session as any).expires = new Date(token.exp * 1000).toISOString();
      }

      return session;
    },
    async jwt({ user, token, account, trigger }) {
      // Initial sign in
      if (trigger === 'signIn' && user) {
        token.sub = user.id;

        // Handle credentials provider remember me
        if (account?.provider === 'credentials') {
          // The remember me value is passed through the user object from authorize
          token.rememberMe = (user as any).rememberMe === true;

          // Set appropriate expiration based on remember me
          if (token.rememberMe) {
            // Set explicit expiration for 30 days
            token.exp =
              Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_REMEMBER_ME;
          } else {
            // Set explicit expiration for 24 hours
            token.exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
          }
        } else {
          // For OAuth providers, default to regular 24-hour sessions
          token.rememberMe = false;
          token.exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
        }
      }

      // On token refresh/update, preserve the remember me setting
      if (trigger === 'update' && token.rememberMe !== undefined) {
        // Keep existing remember me setting
        const now = Math.floor(Date.now() / 1000);

        if (token.rememberMe) {
          // Extend for another 30 days from now
          token.exp = now + SESSION_MAX_AGE_REMEMBER_ME;
        } else {
          // For non-remember me, check if original 24 hours haven't passed
          if (token.iat) {
            const twentyFourHoursFromIssue = token.iat + SESSION_MAX_AGE;
            if (now < twentyFourHoursFromIssue) {
              // Still within original 24 hours, keep that expiration
              token.exp = twentyFourHoursFromIssue;
            } else {
              // Past 24 hours, session should expire
              return null;
            }
          }
        }
      }

      // Validate token expiration on all requests
      if (token.exp && typeof token.exp === 'number') {
        const now = Math.floor(Date.now() / 1000);
        if (now > token.exp) {
          // Token has expired
          return null;
        }
      }

      return token;
    },
    async signIn({ account, profile, user }) {
      // Handle OAuth provider data mapping
      if (account?.provider && profile) {
        try {
          const profileData = profile as Record<string, unknown>;
          const updateData: Record<string, unknown> = {
            updatedAt: new Date(),
          };

          // Map provider-specific IDs
          if (account.provider === 'google') {
            updateData.googleId = profileData.sub;
          } else if (account.provider === 'facebook') {
            updateData.facebookId = profileData.id;
          } else if (account.provider === 'linkedin') {
            updateData.linkedinId = profileData.sub;
          } else if (account.provider === 'twitter') {
            // OAuth 1.0a uses id_str instead of id
            updateData.twitterId = profileData.id_str || profileData.id;

            // Handle Twitter users without email
            // Even with OAuth 1.0a, email might not always be provided
            if (!profile.email && user) {
              // Use the user object which has the database record
              const existingUser = await db
                .select()
                .from(users)
                .where(eq(users.id, user.id))
                .limit(1);

              if (existingUser.length > 0) {
                await db
                  .update(users)
                  .set(updateData)
                  .where(eq(users.id, user.id));
                return true;
              }
            }
          }

          if (profile.email) {
            await db
              .update(users)
              .set(updateData)
              .where(eq(users.email, profile.email));
          } else if (account.provider === 'twitter' && user?.id) {
            // For Twitter without email, update by user ID
            await db.update(users).set(updateData).where(eq(users.id, user.id));
          }
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

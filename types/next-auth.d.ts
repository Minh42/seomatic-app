import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      image?: string | null;
    };
    rememberMe?: boolean;
    expires: string;
  }

  interface User {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    image?: string | null;
    rememberMe?: boolean;
  }

  interface Account {
    rememberMe?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sub: string;
    rememberMe?: boolean;
    exp?: number;
    iat?: number;
  }
}

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
  }

  interface User {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    image?: string | null;
  }

  interface Account {
    rememberMe?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sub: string;
    rememberMe?: boolean;
  }
}

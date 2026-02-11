import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      needsPassword?: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sub: string;
    needsPassword?: boolean;
  }
}

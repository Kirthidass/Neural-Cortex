import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import prisma from './prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error('No account found with this email');
        }

        if (!user.password) {
          throw new Error('Please use Google sign-in or set a password first');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error('Invalid password');
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account }) {
      // For Google OAuth: check if user needs to set password (first time)
      if (account?.provider === 'google') {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });
        if (!existingUser) {
          // New Google user - will be created by adapter, mark as needing password
          // We handle this after creation via the jwt callback
        } else if (!existingUser.password) {
          // Existing Google user without password
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { needsPassword: true },
          });
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
        (session.user as any).needsPassword = token.needsPassword || false;
      }
      return session;
    },
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.sub = user.id;
      }
      // Only query DB on initial sign-in or explicit update, not every request
      const isInitialSignIn = !!user || !!account;
      const isUpdate = trigger === 'update';

      if (token.sub && (isInitialSignIn || isUpdate || token.needsPassword === undefined)) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { needsPassword: true, password: true },
        });
        token.needsPassword = dbUser?.needsPassword || (!dbUser?.password && !!token.sub);
        token.hasPassword = !!dbUser?.password;

        // If Google signup (first time), mark user as needing password
        if (account?.provider === 'google' && !dbUser?.password) {
          await prisma.user.update({
            where: { id: token.sub },
            data: { needsPassword: true },
          });
          token.needsPassword = true;
        }
      }
      return token;
    },
  },
  pages: {
    signIn: '/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

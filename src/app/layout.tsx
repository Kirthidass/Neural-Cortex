import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import SessionProvider from '@/components/providers/SessionProvider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: 'Neural Cortex | AI Personal Knowledge Twin',
  description: 'Your AI-powered cognitive extension. Store, connect, and amplify your knowledge with advanced AI.',
};

// Critical inline CSS to prevent FOUC (Flash of Unstyled Content)
const criticalCSS = `
  html, body {
    background: #0a0a0f !important;
    color: #ffffff !important;
    margin: 0;
    padding: 0;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  *, *::before, *::after {
    box-sizing: border-box;
  }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #0a0a0f; }
  ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 3px; }
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: criticalCSS }} />
      </head>
      <body className={`${inter.className} antialiased`}>
        <SessionProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#1a1a25',
                color: '#fff',
                border: '1px solid #2a2a3a',
              },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  );
}

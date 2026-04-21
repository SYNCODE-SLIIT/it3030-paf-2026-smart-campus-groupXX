import type { Metadata } from "next";
import { Open_Sans, Poppins, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/components/providers/AuthProvider';
import { AuthHashRedirector } from '@/components/auth/AuthHashRedirector';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { getInitialServerAppUser } from '@/lib/server-auth';

const openSans = Open_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const poppins = Poppins({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Smart Campus",
  description: "Smart Campus Application",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialAppUser = await getInitialServerAppUser();

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        suppressHydrationWarning
        className={`${openSans.variable} ${poppins.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <AuthProvider initialAppUser={initialAppUser}>
          <ToastProvider>
            <AuthHashRedirector />
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

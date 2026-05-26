import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import RealtimeConnector from '../components/RealtimeConnector';
import ToastProvider from '../components/ToastProvider';
import LogoutButton from '../components/LogoutButton';

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "AegisSpace — Enterprise CRM & ERP",
  description: "Intelligent Coworking Space Management Platform",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        <ToastProvider>
          {children}
          <RealtimeConnector />
          <LogoutButton />
        </ToastProvider>
      </body>
    </html>
  );
}
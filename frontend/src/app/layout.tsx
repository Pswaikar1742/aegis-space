import type { ReactNode } from "react";

import "./globals.css";

export const metadata = {
  title: "AegisSpace",
  description: "Minimal workspace desk overview and orchestrate trigger",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tirth Construction - Construction Operations Ledger System",
  description: "Centralized site-level financial data and worker attendance management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

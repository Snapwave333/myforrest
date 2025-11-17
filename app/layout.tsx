import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Forrest",
  description: "An endless procedurally generated forest exploration game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

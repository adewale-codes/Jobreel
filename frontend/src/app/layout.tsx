import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jobreel",
  description: "UK Jobs Intelligence",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

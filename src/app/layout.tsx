import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ABES Connect | Professional Network for ABES Students & Alumni",
  description: "The premier professional networking platform for the students, alumni, and faculty of ABES Engineering College. Connect, find mentorship, share opportunities, and build your career.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

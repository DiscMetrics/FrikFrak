import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FrikFrak",
  description: "Anonymous chatter for college frisbee teams and tournaments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)] flex flex-col">
        {children}
      </body>
    </html>
  );
}

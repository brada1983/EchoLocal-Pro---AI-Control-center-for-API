import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EchoLocal AI Control",
  description: "Monitoring & control center for the EchoLocal Whisper API and Ollama servers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

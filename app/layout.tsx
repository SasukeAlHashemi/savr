import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GlobalLogoutButton } from "@/components/global-logout-button";
import { ThemeToggleBar } from "@/components/theme-toggle-bar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Savr",
  description: "Save, preview, and share links and files from one place.",
};

const themeBootScript = `
(() => {
  try {
    const savedTheme = window.localStorage.getItem("savr-theme");
    const theme =
      savedTheme === "white" || savedTheme === "black" || savedTheme === "dim"
        ? savedTheme
        : "dim";

    document.documentElement.dataset.theme = theme;
  } catch {
    document.documentElement.dataset.theme = "dim";
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeToggleBar />
        <GlobalLogoutButton />
        {children}
      </body>
    </html>
  );
}

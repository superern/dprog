import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"]
});

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"]
});

export const metadata: Metadata = {
  title: "Doc Intake + Q&A",
  description: "Ingest documents and ask questions."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        <div className="app-shell">
          <header className="top-bar">
            <div className="brand">
              <span className="brand-mark" />
              <div>
                <p className="brand-title">Dprog</p>
                <p className="brand-subtitle">Docs intake + Q&A</p>
              </div>
            </div>
            <nav className="nav-links">
              <a href="/">Ask</a>
              <a href="/docs">Docs</a>
            </nav>
          </header>
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}

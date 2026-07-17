import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://bindersync.com"),
  title: {
    default: "Binder Sync — Pokémon TCG binders",
    template: "%s · Binder Sync",
  },
  description:
    "Browse every Pokémon TCG set, flip through a virtual binder, track your collection, and share sell binders with a QR code.",
  openGraph: {
    siteName: "Binder Sync",
    type: "website",
    url: "https://bindersync.com",
    title: "Binder Sync — Pokémon TCG binders",
    description:
      "Every set. In your binder. Flip through master sets with reverse holos, track what you own, and sell with a shareable QR binder.",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint to avoid a light flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('bs-theme')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}",
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "معركة الاستراتيجية | Strategic War Game",
  description: "لعبة حرب استراتيجية سداسية باستخدام خطط عسكرية حقيقية - 17 وحدة، 7 خرائط، 12 تكتيك عسكري",
  keywords: ["حرب استراتيجية", "ألعاب استراتيجية", "hex war game", "military tactics"],
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/strategic-war-game/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "حرب استراتيجية",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0d1117",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0d1117" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased" style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  );
}

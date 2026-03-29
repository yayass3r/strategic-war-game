import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "معركة الاستراتيجية | Strategic War Game",
  description: "لعبة حرب استراتيجية سداسية باستخدام خطط عسكرية حقيقية - 17 وحدة، 7 خرائط، 12 تكتيك عسكري",
  keywords: ["حرب استراتيجية", "ألعاب استراتيجية", "hex war game", "military tactics"],
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="antialiased" style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  );
}

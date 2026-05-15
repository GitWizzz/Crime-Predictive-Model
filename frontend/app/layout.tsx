import { Suspense } from "react";
import "./globals.css";
import TopNav from "@/components/layout/TopNav";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Suspense fallback={null}>
          <TopNav />
        </Suspense>
        <div className="min-h-[calc(100vh-56px)]">{children}</div>
      </body>
    </html>
  );
}
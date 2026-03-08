import "./globals.css";
import TopNav from "@/components/layout/TopNav";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning className="dark bg-zinc-950 text-zinc-100">
        <TopNav />
        <div className="min-h-[calc(100vh-56px)]">{children}</div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { aiConfigured } from "@/lib/ai";
import { BUSINESS_NAME } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: `${BUSINESS_NAME} · AI Lead Response`,
  description: "Quote requests answered instantly by AI and tracked in a lead dashboard.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="wrap">
          <Header demoMode={!aiConfigured()} />
          {children}
        </div>
      </body>
    </html>
  );
}

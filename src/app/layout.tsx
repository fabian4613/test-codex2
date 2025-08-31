import "@/styles/globals.css";
import { DashboardProvider } from "@/components/DashboardContext";
import { Providers } from "@/components/Providers";
import { ToastProvider } from "@/components/Toast";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Panel de control personalizable"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Providers>
          <ToastProvider>
            <DashboardProvider>
              {children}
            </DashboardProvider>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}

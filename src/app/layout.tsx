import "@/styles/globals.css";
import { DashboardProvider } from "@/components/DashboardContext";
import { Providers } from "@/components/Providers";
import { ToastProvider } from "@/components/Toast";
import { DialogProvider } from "@/components/Dialog";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Panel de control personalizable"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Providers>
          <ToastProvider>
            <DialogProvider>
              <DashboardProvider>
                {children}
              </DashboardProvider>
            </DialogProvider>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}

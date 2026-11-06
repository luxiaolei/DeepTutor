import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Lora } from "next/font/google";
import { resolveBackendApiBase } from "@/lib/backend-runtime-config";
import { tabTitleForAccount } from "@/lib/learner-chrome";
import "./globals.css";
import "@/features/ui-layout/classic/classic.css";
import "@/features/ui-layout/modern/modern.css";
import ThemeScript from "@/components/ThemeScript";
import ToastViewport from "@/components/common/ToastViewport";
import MotionProvider from "@/components/common/MotionProvider";
import SettingsReturnTracker from "@/components/settings/SettingsReturnTracker";
import { WorkspaceNavigation } from "@/components/workspaces/WorkspaceNavigation";
import { AppShellProvider } from "@/context/AppShellContext";
import { I18nClientBridge } from "@/i18n/I18nClientBridge";

// Geist matches the public site (deeptutor.info) and stays crisp at the
// small UI sizes the composer/toolbars use, unlike the rounder Jakarta.
const fontSans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const fontSerif = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
});

export const viewport: Viewport = { interactiveWidget: "resizes-content" };

const BRAND_ICONS: Metadata["icons"] = {
  icon: [
    { url: "/brand/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    { url: "/brand/favicon-32x32.png", sizes: "32x32", type: "image/png" },
  ],
  apple: "/brand/apple-touch-icon.png",
};

async function accountHasLearningPolicy(): Promise<boolean> {
  try {
    const token = (await cookies()).get("dt_token")?.value;
    if (!token) return false;
    const base = resolveBackendApiBase().replace(/\/$/, "");
    const response = await fetch(`${base}/api/auth/status`, {
      headers: { cookie: `dt_token=${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { learning_policy?: unknown };
    return Boolean(body?.learning_policy);
  } catch {
    return false;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const title = tabTitleForAccount(await accountHasLearningPolicy());
  return {
    title: { absolute: title },
    description: "Agent-native intelligent learning companion",
    icons: BRAND_ICONS,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${fontSans.variable} ${fontSerif.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body
        className="font-sans bg-[var(--background)] text-[var(--foreground)]"
        suppressHydrationWarning
      >
        <AppShellProvider>
          <SettingsReturnTracker />
          <WorkspaceNavigation />
          <MotionProvider>
            <I18nClientBridge>{children}</I18nClientBridge>
          </MotionProvider>
          <ToastViewport />
        </AppShellProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "StillYou — A familiar reflection, a little more choice",
    template: "%s · StillYou",
  },
  description:
    "Save a photo that feels like you. Explore wig styles, make a shortlist, and choose at your own pace.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}

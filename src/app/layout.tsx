import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Inter, Noto_Sans_Lao } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

// Same font stack as the prototype
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500", "600"] });
const notoLao = Noto_Sans_Lao({ variable: "--font-lao", subsets: ["lao", "latin"] });

export const metadata: Metadata = {
  title: "Yorsys",
  description: "Yorsys — group operations: POS, PMS, Accounting, HR",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${plexMono.variable} ${notoLao.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

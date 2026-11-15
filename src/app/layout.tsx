import type { Metadata } from "next"
import { Funnel_Sans } from "next/font/google"
import "./globals.css"

/** Closest free match to CathaySans, Cathay's proprietary app and web face (Dalton Maag): same epsilon ampersand,
 *  straight-tailed y and width. CathaySans sits a little lighter, so body copy is set at 360 on the variable axis. */
const sans = Funnel_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  fallback: ["Noto Sans", "Noto Sans TC", "sans-serif"],
})

export const metadata: Metadata = {
  title: "Flight profile · Cathay concept demo",
  description: "Concept demo of a Cathay flight profile that carries a passenger's preferences from phone to seatback. Not affiliated with Cathay Pacific.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  )
}

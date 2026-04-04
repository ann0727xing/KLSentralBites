import { Inter, Lobster } from "next/font/google";

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600"],
});

/** Bold handwritten wordmark — readable on small screens */
export const lobster = Lobster({
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
});

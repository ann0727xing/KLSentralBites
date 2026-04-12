import type { NextConfig } from "next";

function supabaseImageHost(): string | null {
  try {
    const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!u) return null;
    return new URL(u).hostname;
  } catch {
    return null;
  }
}

const remotePatterns: {
  protocol: "https";
  hostname: string;
  pathname: string;
}[] = [
  {
    protocol: "https",
    hostname: "images.unsplash.com",
    pathname: "/**",
  },
];

const supabaseHost = supabaseImageHost();
if (supabaseHost) {
  remotePatterns.push({
    protocol: "https",
    hostname: supabaseHost,
    pathname: "/storage/v1/object/public/**",
  });
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;

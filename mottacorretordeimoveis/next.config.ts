import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "wabkkqbgfwufmxjutxsr.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Supabase genérico — cobre outros projetos se URL de env for diferente
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;

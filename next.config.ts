import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The FalkorDB client opens raw TCP sockets; keep it out of the bundler so it
  // runs as a normal Node dependency on the server.
  serverExternalPackages: ["falkordb"],
  images: {
    // Google profile pictures used for the signed-in user avatar.
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // A stray lockfile in the home directory made Next infer the wrong workspace
  // root. Pin it to this project.
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    // AVIF first, WebP fallback. Next 16 defaults to WebP only.
    formats: ["image/avif", "image/webp"],
    // Optimized derivatives were being re-encoded far too often.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "framerusercontent.com",
      },
      {
        protocol: "https",
        hostname: "www.figma.com",
      },
    ],
  },
  allowedDevOrigins: ["192.168.0.17"],
};

export default nextConfig;

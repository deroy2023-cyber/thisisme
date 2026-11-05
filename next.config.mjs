/** @type {import('next').NextConfig} */
const nextConfig = {
  // A stray lockfile in the home directory made Next infer the wrong workspace
  // root. Pin it to this project.
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    // Every <Image> resolves through this loader instead of Vercel's
    // /_next/image optimizer: Cloudinary URLs get Cloudinary's own
    // f_auto/q_auto/w_ transforms, local files are served as-is. See the
    // file header for why (images intermittently failing to load).
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
  allowedDevOrigins: ["192.168.0.17"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "index, follow" }],
      },
      {
        // Public files are not content-hashed, so not `immutable`: a replaced
        // file is picked up within a day, and repeat visits skip the
        // revalidation round trip Vercel's default max-age=0 forces.
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

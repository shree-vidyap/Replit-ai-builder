/** @type {import('next').NextConfig} */
const nextConfig = {
  // WebContainers need cross-origin isolation (use Chrome or Edge)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const s3ImageHostname = process.env.NEXT_PUBLIC_S3_IMAGE_HOSTNAME;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      ...(s3ImageHostname
        ? [
            {
              protocol: "https" as const,
              hostname: s3ImageHostname,
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const securityHeaders = [
  { key: "x-content-type-options", value: "nosniff" },
  { key: "referrer-policy", value: "strict-origin-when-cross-origin" },

  {
    key: "permissions-policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },

  { key: "x-frame-options", value: "DENY" },
  { key: "strict-transport-security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "cross-origin-opener-policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },

      {
        source: "/room/:code*",
        headers: [
          { key: "x-robots-tag", value: "noindex, nofollow" },
          { key: "cache-control", value: "no-store" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "cache-control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;

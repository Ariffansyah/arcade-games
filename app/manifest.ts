import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Web Arcade",
    short_name: "Arcade",
    description: "Party mini-games for two players or a roomful, behind one room code.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#06030d",
    theme_color: "#06030d",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             "MatchBatch — Campus Network",
    short_name:       "MatchBatch",
    description:      "The anonymous, merit-based network for Indian college students.",
    start_url:        "/dashboard",
    display:          "standalone",
    orientation:      "portrait",
    background_color: "#06060e",
    theme_color:      "#7c3aed",
    categories:       ["education", "social"],
    icons: [
      { src: "/icon-192.png",  sizes: "192x192",  type: "image/png" },
      { src: "/icon-512.png",  sizes: "512x512",  type: "image/png" },
    ],
    shortcuts: [
      { name: "Merit Feed",    url: "/feed",       icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Chat",          url: "/chat",       icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Challenges",    url: "/challenges", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}

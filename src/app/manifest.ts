import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SuMisura",
    short_name: "SuMisura",
    description: "Candidature di lavoro e stage su misura.",
    start_url: "/home",
    display: "standalone",
    background_color: "#f4efe6",
    theme_color: "#f4efe6",
    orientation: "portrait-primary",
    lang: "it",
  };
}

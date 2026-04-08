import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "InvoiceBillos",
    short_name: "InvoiceBillos",
    description:
      "A clean invoicing app for freelancers and small businesses to manage customers, create invoices, and export PDFs.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    orientation: "portrait",
    background_color: "#020617",
    theme_color: "#020617",
    lang: "en",
    dir: "ltr",
    categories: ["business", "finance", "productivity"],
    icons: [
      {
        src: "/pwa-icons/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icons/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icons/512-maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "Open your business overview.",
        url: "/dashboard",
      },
      {
        name: "Customers",
        short_name: "Customers",
        description: "Manage your saved customers.",
        url: "/customers",
      },
      {
        name: "New Invoice",
        short_name: "New Invoice",
        description: "Create a new invoice quickly.",
        url: "/invoices/new",
      },
    ],
  };
}

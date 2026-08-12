import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"

import appCss from "../styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      {
        name: "theme-color",
        content: "#eef0f3",
      },
      {
        name: "description",
        content: "Layer focus sounds in a clean, browser-based audio mixer.",
      },
      {
        property: "og:title",
        content: "Focus FM",
      },
      {
        property: "og:description",
        content: "Layer focus sounds in a clean, browser-based audio mixer.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:url",
        content: "https://focusfm.vercel.app/",
      },
      {
        property: "og:image",
        content: "https://focusfm.vercel.app/opengraph.png",
      },
      {
        property: "og:image:width",
        content: "2880",
      },
      {
        property: "og:image:height",
        content: "1620",
      },
      {
        property: "og:image:alt",
        content: "Four friends together in a car.",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:image",
        content: "https://focusfm.vercel.app/opengraph.png",
      },
      {
        title: "Focus FM",
      },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

/** Renders the shared HTML document around every route. */
function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

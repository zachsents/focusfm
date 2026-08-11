import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { execFileSync } from "node:child_process"

import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import { nitro } from "nitro/vite"

import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

interface ChangelogEntry {
  hash: string
  message: string
  date: string
  author: string
}

/** Reads recent commit subjects while Git metadata is available at build time. */
function readChangelog(): ChangelogEntry[] {
  try {
    return execFileSync(
      "git",
      ["log", "-5", "--pretty=format:%h%x1f%s%x1f%cs%x1f%an"],
      { encoding: "utf8" },
    )
      .split("\n")
      .map((line) => {
        const [hash, message, date, author] = line.split("\x1f")
        return { hash, message, date, author }
      })
      .filter((entry): entry is ChangelogEntry =>
        Boolean(entry.hash && entry.message && entry.date && entry.author),
      )
  } catch {
    const hash = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)
    const message = process.env.VERCEL_GIT_COMMIT_MESSAGE
    const author = process.env.VERCEL_GIT_COMMIT_AUTHOR_NAME ?? "Contributor"
    return hash && message
      ? [{ hash, message, date: "Latest release", author }]
      : []
  }
}

const config = defineConfig({
  define: {
    __FOCUSFM_CHANGELOG__: JSON.stringify(readChangelog()),
  },
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), nitro(), viteReact()],
})

export default config

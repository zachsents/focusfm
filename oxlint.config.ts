import { defineConfig } from "oxlint"

import reactConfig from "@zachsents/oxlint-config/react"

export default defineConfig({
  extends: [reactConfig],
  ignorePatterns: ["src/routeTree.gen.ts"],
})

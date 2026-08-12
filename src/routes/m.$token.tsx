import { createFileRoute } from "@tanstack/react-router"

import { Home } from "#/routes/index"

export const Route = createFileRoute("/m/$token")({ component: Home })

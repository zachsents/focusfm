import { createFileRoute } from "@tanstack/react-router"

import { Home } from "#/routes/index"

export const Route = createFileRoute("/mix/$token")({ component: Home })

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/db/select')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/api/db/select"!</div>
}

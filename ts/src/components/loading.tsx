import { Spinner } from "./ui/spinner"

export const Loading = () => {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner size="xl" speed="slow" className="text-muted-foreground" />
    </div>
  )
}

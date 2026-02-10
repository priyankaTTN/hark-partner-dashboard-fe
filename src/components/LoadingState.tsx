import { Spinner } from "@/components/ui/spinner"

type LoadingStateProps = {
  message?: string
  /** If true, render as overlay (absolute) with backdrop; otherwise full content area */
  overlay?: boolean
}

export function LoadingState({ message = "Loading...", overlay = false }: LoadingStateProps) {
  if (overlay) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border border-gray-200 bg-white/80">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="size-8 text-primary" />
          <span className="text-sm font-medium text-gray-700">{message}</span>
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Spinner className="size-8 text-primary" />
      <span className="text-sm font-medium text-gray-700">{message}</span>
    </div>
  )
}

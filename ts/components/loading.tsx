import { LoaderCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import TextGradient from "./ui/text-gradient"

export const LoadingPage = () => {
  return (
    <div className="flex h-screen items-center justify-center">
      <LoaderCircle size={48} className="animate-spin text-muted-foreground" />
    </div>
  )
}

export const LoadingInline = ({ text, className }: { text?: string; className?: string }) => {
  return (
    <div className="flex w-full items-center justify-center gap-2">
      <LoaderCircle
        size={16}
        className="shrink-0 translate-y-px animate-spin text-muted-foreground"
      />
      <TextGradient className={cn("text-base leading-none", className)} spread={10}>
        {text || "Loading..."}
      </TextGradient>
    </div>
  )
}

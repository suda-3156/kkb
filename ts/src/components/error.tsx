"use client"

import { TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { BlurIn } from "./ui/blur-in"
import { Card, CardContent, CardHeader } from "./ui/card"

type ErrorCardProps = {
  message: string
} & React.ComponentProps<"div">

export const ErrorCard = ({ className, message, ...props }: ErrorCardProps) => {
  return (
    <Card className={className} {...props}>
      <CardHeader>
        <BlurIn className="flex items-center gap-x-8 text-destructive">
          <TriangleAlert size={28} className="translate-y-1" />
          <p className="font-semibold text-3xl">Error</p>
        </BlurIn>
      </CardHeader>
      <CardContent className="flex h-full flex-col text-destructive">
        <BlurIn className="mx-2 text-sm">{message}</BlurIn>
      </CardContent>
    </Card>
  )
}

export const ErrorInline = ({ message, className }: { message: string; className?: string }) => {
  return (
    <div
      className={cn(
        "flex items-center gap-x-2 rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm",
        className,
      )}
    >
      <TriangleAlert size={16} />
      {message}
    </div>
  )
}

export const ErrorPage = ({ message }: { message: string }) => {
  return (
    <div className="flex h-screen items-center justify-center">
      <ErrorInline message={message} className="w-full max-w-md" />
    </div>
  )
}

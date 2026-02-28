"use client"

import { TriangleAlert } from "lucide-react"
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

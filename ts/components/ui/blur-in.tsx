"use client"

import clsx from "clsx"
import { type HTMLMotionProps, motion } from "motion/react"

export const BlurIn = ({ children, className, ...props }: HTMLMotionProps<"div">) => {
  const variants1 = {
    hidden: { filter: "blur(10px)", opacity: 0 },
    visible: { filter: "blur(0px)", opacity: 1 },
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.3, ease: "easeOut" }}
      variants={variants1}
      className={clsx("drop-shadow-sm", className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

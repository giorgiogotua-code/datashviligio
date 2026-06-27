"use client"

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function AuroraBackground({ className }: { className?: string }) {
  return (
    <div className={cn("fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-background", className)}>
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          x: ["0%", "10%", "-5%", "0%"],
          y: ["0%", "-10%", "5%", "0%"]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute -top-1/4 -right-1/4 w-[70vw] h-[70vw] rounded-full bg-gradient-to-r from-primary/20 to-indigo-500/20 blur-[120px]"
      />
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.4, 0.2],
          x: ["0%", "-10%", "5%", "0%"],
          y: ["0%", "10%", "-5%", "0%"]
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-1/4 -left-1/4 w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 blur-[120px]"
      />
      
      {/* Grain/noise texture overlay using SVG data-URI */}
      <div
        className="absolute inset-0 opacity-[0.025] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
        }}
      />
    </div>
  )
}

"use client"

import { useMemo } from "react"

interface Shot {
  id: string
  x: number
  y: number
  made: boolean
  shotType: "2PT" | "3PT"
  distance: number
}

interface BasketballCourtProps {
  shots: Shot[]
  onShotClick?: (shot: Shot) => void
}

export function BasketballCourt({ shots, onShotClick }: BasketballCourtProps) {
  const courtWidth = 500
  const courtHeight = 470

  const shotElements = useMemo(() => {
    return shots.map((shot) => (
      <circle
        key={shot.id}
        cx={shot.x}
        cy={shot.y}
        r={6}
        className={`cursor-pointer transition-all hover:r-8 ${
          shot.made
            ? "fill-primary stroke-primary/50"
            : "fill-accent stroke-accent/50"
        }`}
        strokeWidth={2}
        onClick={() => onShotClick?.(shot)}
      />
    ))
  }, [shots, onShotClick])

  return (
    <div className="flex items-center justify-center w-full">
      <svg
        viewBox={`0 0 ${courtWidth} ${courtHeight}`}
        className="w-full max-w-2xl"
        style={{ aspectRatio: `${courtWidth}/${courtHeight}` }}
      >
        {/* Court Background */}
        <rect
          x={0}
          y={0}
          width={courtWidth}
          height={courtHeight}
          className="fill-secondary/50"
          rx={4}
        />

        {/* Court Outline */}
        <rect
          x={0}
          y={0}
          width={courtWidth}
          height={courtHeight}
          className="fill-none stroke-border"
          strokeWidth={2}
          rx={4}
        />

        {/* Paint / Key */}
        <rect
          x={170}
          y={0}
          width={160}
          height={190}
          className="fill-none stroke-muted-foreground/40"
          strokeWidth={1.5}
        />

        {/* Free Throw Circle */}
        <circle
          cx={250}
          cy={190}
          r={60}
          className="fill-none stroke-muted-foreground/40"
          strokeWidth={1.5}
        />

        {/* Restricted Area */}
        <path
          d="M 210 0 A 40 40 0 0 0 290 0"
          className="fill-none stroke-muted-foreground/40"
          strokeWidth={1.5}
          transform="translate(0, 40)"
        />

        {/* Basket */}
        <circle
          cx={250}
          cy={52}
          r={7.5}
          className="fill-none stroke-accent"
          strokeWidth={2}
        />

        {/* Backboard */}
        <line
          x1={220}
          y1={40}
          x2={280}
          y2={40}
          className="stroke-muted-foreground/60"
          strokeWidth={3}
        />

        {/* Three Point Line */}
        <path
          d="M 30 0 L 30 140 Q 30 310 250 310 Q 470 310 470 140 L 470 0"
          className="fill-none stroke-muted-foreground/40"
          strokeWidth={1.5}
        />

        {/* Center Court (half) */}
        <path
          d="M 100 470 A 150 150 0 0 1 400 470"
          className="fill-none stroke-muted-foreground/40"
          strokeWidth={1.5}
        />

        {/* Shot markers */}
        {shotElements}

        {/* Legend */}
        <g transform={`translate(${courtWidth - 120}, ${courtHeight - 50})`}>
          <circle cx={10} cy={10} r={6} className="fill-primary" />
          <text
            x={24}
            y={14}
            className="fill-muted-foreground text-[11px] font-sans"
          >
            Made
          </text>
          <circle cx={10} cy={30} r={6} className="fill-accent" />
          <text
            x={24}
            y={34}
            className="fill-muted-foreground text-[11px] font-sans"
          >
            Missed
          </text>
        </g>
      </svg>
    </div>
  )
}

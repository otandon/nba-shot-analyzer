"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

interface PlayerStats {
  name: string
  team: string
  teamAbbr: string
  position: string
  number: number
  fgPct: number
  threePtPct: number
  ppg: number
  gamesPlayed: number
  fgMade: number
  fgAttempted: number
  threePtMade: number
  threePtAttempted: number,
  ftPct: number,
  ftMade: number,
  ftAttempted: number
}

interface PlayerSidebarProps {
  player: PlayerStats
}

export function PlayerSidebar({ player }: PlayerSidebarProps) {
  return (
    <aside className="w-72 bg-sidebar border-r border-sidebar-border p-6 flex flex-col gap-6 h-full overflow-y-auto">
      {/* Player Header */}
      <div className="flex flex-col items-center gap-4">
        <Avatar className="h-24 w-24 bg-secondary border-2 border-border">
          <AvatarFallback className="text-2xl font-bold text-foreground bg-secondary">
            {player.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">{player.name}</h2>
          <p className="text-muted-foreground text-sm">
            {player.team} • #{player.number}
          </p>
          <span className="inline-block mt-2 px-3 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-full">
            {player.position}
          </span>
        </div>
      </div>

      <Separator className="bg-border" />

      {/* Season Stats */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          2024-25 Season
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="PPG" value={player.ppg.toFixed(1)} />
          <StatCard label="GP" value={player.gamesPlayed.toString()} />
        </div>
      </div>

      <Separator className="bg-border" />

      {/* Shooting Stats */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Shooting
        </h3>

        <div className="space-y-3">
          <ShootingStatRow
            label="FG%"
            percentage={player.fgPct}
            made={player.fgMade}
            attempted={player.fgAttempted}
          />
          <ShootingStatRow
            label="3P%"
            percentage={player.threePtPct}
            made={player.threePtMade}
            attempted={player.threePtAttempted}
          />
          <ShootingStatRow
            label="FT%"
            percentage={player.ftPct}
            made={player.ftMade}
            attempted={player.ftAttempted}
          />
        </div>
      </div>

      <Separator className="bg-border" />

      {/* Shot Distribution */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Shot Distribution
        </h3>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Paint</span>
            <span className="text-foreground font-medium">38%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Mid-Range</span>
            <span className="text-foreground font-medium">22%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">3-Point</span>
            <span className="text-foreground font-medium">40%</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary/50 rounded-lg p-3 text-center">
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
    </div>
  )
}

function ShootingStatRow({
  label,
  percentage,
  made,
  attempted,
}: {
  label: string
  percentage: number
  made: number
  attempted: number
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold text-foreground">
          {percentage.toFixed(1)}%
        </span>
      </div>
      <div className="relative h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-primary rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground">
        {made}/{attempted}
      </div>
    </div>
  )
}

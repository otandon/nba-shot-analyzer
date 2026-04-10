"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface GameLogProps {
  games: any[]
  onGameClick: (gameId: string) => void
}

export function GameLog({ games, onGameClick }: GameLogProps) {
  return (
    <div className="rounded-md border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground">Date</TableHead>
            <TableHead className="text-muted-foreground">Matchup</TableHead>
            <TableHead className="text-muted-foreground">W/L</TableHead>
            <TableHead className="text-muted-foreground text-right">PTS</TableHead>
            <TableHead className="text-muted-foreground text-right">FG</TableHead>
            <TableHead className="text-muted-foreground text-right">FG%</TableHead>
            <TableHead className="text-muted-foreground text-right">3PM</TableHead>
            <TableHead className="text-muted-foreground text-right">3P%</TableHead>
            <TableHead className="text-muted-foreground text-right">REB</TableHead>
            <TableHead className="text-muted-foreground text-right">AST</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {games.map((game) => (
            <TableRow
              key={game.Game_ID}
              className="hover:bg-secondary/30 border-border transition-colors cursor-pointer"
              onClick={() => onGameClick(game.Game_ID)}
            >
              <TableCell className="text-sm text-muted-foreground">{game.GAME_DATE}</TableCell>
              <TableCell className="text-sm font-medium">{game.MATCHUP}</TableCell>
              <TableCell>
                <span className={`text-xs font-bold ${game.WL === "W" ? "text-green-500" : "text-red-500"}`}>
                  {game.WL}
                </span>
              </TableCell>
              <TableCell className="text-right font-bold">{game.PTS}</TableCell>
              <TableCell className="text-right text-sm">{game.FGM}-{game.FGA}</TableCell>
              <TableCell className="text-right text-sm">{(game.FG_PCT * 100).toFixed(1)}%</TableCell>
              <TableCell className="text-right text-sm">{game.FG3M}</TableCell>
              <TableCell className="text-right text-sm">{(game.FG3_PCT * 100).toFixed(1)}%</TableCell>
              <TableCell className="text-right text-sm">{game.REB}</TableCell>
              <TableCell className="text-right text-sm">{game.AST}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
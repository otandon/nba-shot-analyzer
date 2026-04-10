"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlayerSidebar } from "@/components/player-sidebar"
import { BasketballCourt } from "@/components/basketball-court"
import { AIAnalysis } from "@/components/ai-analysis"
import { GameLog } from "@/components/game-log"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Activity, BarChart3, FileText, Search, Loader2 } from "lucide-react"
import { searchPlayers, getPlayerInfo, getShots, getGameLog, analyzePlayer } from "@/lib/api"

const SEASONS = ["2025-26", "2024-25", "2023-24", "2022-23", "2021-22", "2020-21"]

export default function Home() {
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null)
  const [playerData, setPlayerData] = useState<any>(null)
  const [shots, setShots] = useState<any[]>([])
  const [games, setGames] = useState<any[]>([])
  const [insights, setInsights] = useState<any[]>([])
  const [executiveSummary, setExecutiveSummary] = useState("")
  const [recommendedFocus, setRecommendedFocus] = useState("")
  const [season, setSeason] = useState("2025-26")
  const [loadingPlayer, setLoadingPlayer] = useState(false)
  const [loadingShots, setLoadingShots] = useState(false)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [activeTab, setActiveTab] = useState("chart")

  async function handleSearch() {
    if (!query.trim()) return
    const results = await searchPlayers(query)
    setSearchResults(results)
  }


  async function handleSelectPlayer(player: any) {
      setSelectedPlayer(player)
      setSearchResults([])
      setQuery("")
      setInsights([])
      setExecutiveSummary("")
      setRecommendedFocus("")
      setShots([])
      setGames([])
      setPlayerData(null)
      setLoadingPlayer(true)
      setLoadingShots(true)

      try {
        const [info, gameLog] = await Promise.all([
          getPlayerInfo(player.id, season),
          getGameLog(player.id, season),
        ])
        if (info.detail) {
          setLoadingPlayer(false)
          setLoadingShots(false)
          return
        }
        setPlayerData(info)
        setGames(gameLog)
      } catch {
        setLoadingPlayer(false)
        setLoadingShots(false)
        return
      } finally {
        setLoadingPlayer(false)
      }

      try {
        const shotData = await getShots(player.id, season)
        setShots(shotData)
      } finally {
        setLoadingShots(false)
      }
    }

  async function handleSeasonChange(newSeason: string) {
    setSeason(newSeason)
    if (!selectedPlayer) return
    setInsights([])
    setExecutiveSummary("")
    setRecommendedFocus("")
    setLoadingShots(true)
    setLoadingPlayer(true)

    try {
      const [info, shotData, gameLog] = await Promise.all([
        getPlayerInfo(selectedPlayer.id, newSeason),
        getShots(selectedPlayer.id, newSeason),
        getGameLog(selectedPlayer.id, newSeason),
      ])
      setPlayerData(info)
      setShots(shotData)
      setGames(gameLog)
    } finally {
      setLoadingPlayer(false)
      setLoadingShots(false)
    }
  }

  async function handleTabChange(tab: string) {
    setActiveTab(tab)
    if (tab === "analysis" && selectedPlayer && insights.length === 0) {
      if (!playerData) return  // no valid player loaded, do nothing
      setLoadingAnalysis(true)
      try {
        const data = await analyzePlayer(selectedPlayer.id, season)
        if (data.detail) return  // 404 from backend
        setInsights(data.insights ?? [])
        setExecutiveSummary(typeof data.executiveSummary === "string" ? data.executiveSummary : "")
        setRecommendedFocus(typeof data.recommendedFocus === "string" ? data.recommendedFocus : "")
      } catch {
        // silently fail, show empty state
      } finally {
        setLoadingAnalysis(false)
      }
    }
  }
  async function handleGameClick(gameId: string) {
    if (!selectedPlayer) return
    setLoadingShots(true)
    setActiveTab("chart")
    try {
      const shotData = await getShots(selectedPlayer.id, season, gameId)
      setShots(shotData)
    } finally {
      setLoadingShots(false)
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 shrink-0">
        {playerData && !loadingPlayer ? (
          <PlayerSidebar player={playerData} />
        ) : (
          <div className="w-72 bg-sidebar border-r border-sidebar-border p-6 flex flex-col items-center justify-center h-full">
            {loadingPlayer ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <p className="text-muted-foreground text-sm text-center">
                Search for a player to get started
              </p>
            )}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="border-b border-border p-4 flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Input
              placeholder="Search player..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pr-10"
            />
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={handleSearch}
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Dropdown results */}
            {searchResults.length > 0 && (
              <div className="absolute top-full mt-1 w-full bg-popover border border-border rounded-md shadow-lg z-50">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={() => handleSelectPlayer(p)}
                  >
                    {p.full_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Season selector */}
          <Select value={season} onValueChange={handleSeasonChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEASONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedPlayer && (
            <span className="text-sm text-muted-foreground">
              {selectedPlayer.full_name}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-hidden p-6">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
            <TabsList className="mb-4 w-fit">
              <TabsTrigger value="chart" className="gap-2">
                <Activity className="h-4 w-4" /> Shot Chart
              </TabsTrigger>
              <TabsTrigger value="analysis" className="gap-2">
                <BarChart3 className="h-4 w-4" /> AI Analysis
              </TabsTrigger>
              <TabsTrigger value="games" className="gap-2">
                <FileText className="h-4 w-4" /> Game Log
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chart" className="flex-1">
              {loadingShots ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : shots.length > 0 ? (
                <BasketballCourt shots={shots} />
              ) : selectedPlayer ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <p className="text-foreground font-medium">No shot data available</p>
                  <p className="text-muted-foreground text-sm">
                    {selectedPlayer.full_name} may not have played in the {season} season
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground text-sm">Search for a player to see their shot chart</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="analysis" className="flex-1 overflow-y-auto">
              {loadingAnalysis ? (
                <div className="flex items-center justify-center h-full gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">Claude is analyzing shot data...</p>
                </div>
              ) : insights.length > 0 ? (
                <AIAnalysis
                  playerName={selectedPlayer?.full_name ?? "Player"}
                  executiveSummary={executiveSummary}
                  recommendedFocus={recommendedFocus}
                  insights={insights}
                />
              ) : selectedPlayer && !playerData ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <p className="text-foreground font-medium">No data available</p>
                  <p className="text-muted-foreground text-sm">
                    {selectedPlayer.full_name} has no stats for the {season} season
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground text-sm">Select a player and open this tab to generate insights</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="games" className="flex-1 overflow-y-auto">
              {games.length > 0 ? (
                <GameLog games={games} onGameClick={handleGameClick} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground text-sm">No game log loaded yet</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
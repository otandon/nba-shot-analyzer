const BASE_URL = "https://nba-shot-analyzer-production.up.railway.app"

export async function searchPlayers(query: string) {
  const res = await fetch(`${BASE_URL}/api/players/search?q=${query}`)
  return res.json()
}

export async function getPlayerInfo(playerId: number, season: string = "2025-26") {
  const res = await fetch(`${BASE_URL}/api/players/${playerId}/info?season=${season}`)
  return res.json()
}

export async function getShots(playerId: number, season: string = "2025-26", gameId?: string) {
  const url = gameId
    ? `${BASE_URL}/api/players/${playerId}/shots?season=${season}&game_id=${gameId}`
    : `${BASE_URL}/api/players/${playerId}/shots?season=${season}`
  const res = await fetch(url)
  return res.json()
}

export async function getGameLog(playerId: number, season: string = "2025-26") {
  const res = await fetch(`${BASE_URL}/api/players/${playerId}/games?season=${season}`)
  return res.json()
}

export async function analyzePlayer(playerId: number, season: string = "2025-26") {
  const res = await fetch(`${BASE_URL}/api/players/${playerId}/analyze?season=${season}`, {
    method: "POST",
  })
  return res.json()
}
import json
import os
import requests as http_requests
from typing import Optional

from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from nba_api.stats.static import players, teams as nba_teams_static
from nba_api.stats.endpoints import (
    commonplayerinfo,
    playercareerstats,
    shotchartdetail,
    playergamelog,
    leaguedashteamstats,
)
import anthropic
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://nba-shot-analyzer.vercel.app",
        "http://localhost:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Existing routes
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {"status": "NBA Shot Analyst API is running"}


@app.get("/api/players/search")
def search_players(q: str):
    all_players = players.get_players()
    results = [p for p in all_players if q.lower() in p["full_name"].lower()]
    return results[:10]


@app.get("/api/players/{player_id}/info")
def get_player_info(player_id: int, season: str = "2024-25"):
    from fastapi import HTTPException
    info = commonplayerinfo.CommonPlayerInfo(player_id=player_id)
    career = playercareerstats.PlayerCareerStats(player_id=player_id)

    info_df = info.get_data_frames()[0]
    season_df = career.get_data_frames()[0]

    season_row = season_df[season_df["SEASON_ID"] == season]
    if season_row.empty:
        raise HTTPException(status_code=404, detail=f"No data for this player in {season}")

    current = season_row.iloc[-1]

    return {
        "name": info_df["DISPLAY_FIRST_LAST"].values[0],
        "team": info_df["TEAM_NAME"].values[0],
        "teamAbbr": info_df["TEAM_ABBREVIATION"].values[0],
        "position": info_df["POSITION"].values[0],
        "number": info_df["JERSEY"].values[0],
        "ppg": round(float(current["PTS"]) / float(current["GP"]), 1),
        "fgPct": round(float(current["FG_PCT"]) * 100, 1),
        "threePtPct": round(float(current["FG3_PCT"]) * 100, 1),
        "gamesPlayed": int(current["GP"]),
        "fgMade": int(current["FGM"]),
        "fgAttempted": int(current["FGA"]),
        "threePtMade": int(current["FG3M"]),
        "threePtAttempted": int(current["FG3A"]),
        "ftPct": round(float(current["FT_PCT"]) * 100, 1),
        "ftMade": int(current["FTM"]),
        "ftAttempted": int(current["FTA"]),
    }


@app.get("/api/players/{player_id}/shots")
def get_shot_chart(player_id: int, season: str = "2024-25", game_id: str = None):
    params = {
        "player_id": player_id,
        "team_id": 0,
        "season_nullable": season,
        "season_type_all_star": "Regular Season",
        "context_measure_simple": "FGA",
    }
    if game_id:
        params["game_id_nullable"] = game_id

    chart = shotchartdetail.ShotChartDetail(**params)
    df = chart.get_data_frames()[0]

    shots = []
    for _, row in df.iterrows():
        x = (float(row["LOC_X"]) * 1.01) + 250
        y = (float(row["LOC_Y"]) * 1.01) + 52

        shots.append({
            "id": f"{row['GAME_ID']}-{row['GAME_EVENT_ID']}",
            "x": round(x, 1),
            "y": round(y, 1),
            "made": bool(row["SHOT_MADE_FLAG"]),
            "shotType": "3PT" if "3PT" in str(row["SHOT_TYPE"]) else "2PT",
            "distance": int(row["SHOT_DISTANCE"]),
            "description": row["ACTION_TYPE"],
            "quarter": int(row["PERIOD"]),
        })

    return shots


@app.get("/api/players/{player_id}/games")
def get_game_log(player_id: int, season: str = "2024-25"):
    log = playergamelog.PlayerGameLog(player_id=player_id, season=season)
    df = log.get_data_frames()[0]
    return df[["GAME_DATE", "MATCHUP", "WL", "PTS", "FGM", "FGA",
               "FG_PCT", "FG3M", "FG3A", "FG3_PCT", "AST", "REB", "Game_ID"]].to_dict("records")


# ---------------------------------------------------------------------------
# Agentic analysis — tool definitions
# ---------------------------------------------------------------------------

ANALYZE_TOOLS = [
    {
        "name": "get_shot_chart",
        "description": (
            "Fetch shot chart data for a player for a given season. Returns aggregated "
            "shooting stats by zone: paint (0-6 ft), mid-range (10-16 ft), and 3-pointers. "
            "Use last_n_games to limit analysis to the most recent N games only."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "player_id": {"type": "integer", "description": "NBA player ID"},
                "season": {"type": "string", "description": "Season string like '2024-25'"},
                "last_n_games": {
                    "type": "integer",
                    "description": "If provided, limit to shots from the last N games only",
                },
            },
            "required": ["player_id", "season"],
        },
    },
    {
        "name": "get_game_log",
        "description": (
            "Fetch game-by-game stats for a player: points, FG%, 3P%, assists, rebounds, "
            "and win/loss. Use last_n_games to focus on recent form."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "player_id": {"type": "integer", "description": "NBA player ID"},
                "season": {"type": "string", "description": "Season string like '2024-25'"},
                "last_n_games": {
                    "type": "integer",
                    "description": "If provided, return only the last N games",
                },
            },
            "required": ["player_id", "season"],
        },
    },
    {
        "name": "get_opponent_defense",
        "description": (
            "Fetch defensive stats for an NBA team — how they defend opposing players, "
            "including opponent FG%, 3P%, and points allowed per game."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "team_abbreviation": {
                    "type": "string",
                    "description": "Team abbreviation e.g. 'LAL', 'BOS', 'GSW', 'MIA'",
                },
                "season": {"type": "string", "description": "Season string like '2024-25'"},
            },
            "required": ["team_abbreviation", "season"],
        },
    },
    {
        "name": "get_player_props",
        "description": (
            "Fetch live sportsbook over/under betting lines for a player prop via The Odds API. "
            "Use to get the current betting line for points, rebounds, assists, or threes."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "player_name": {
                    "type": "string",
                    "description": "Full player name e.g. 'LeBron James'",
                },
                "prop_type": {
                    "type": "string",
                    "description": "One of: 'points', 'rebounds', 'assists', 'threes', 'steals', 'blocks'",
                },
            },
            "required": ["player_name", "prop_type"],
        },
    },
]


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

def _tool_get_shot_chart(player_id: int, season: str, last_n_games: int = None) -> dict:
    chart = shotchartdetail.ShotChartDetail(
        player_id=player_id,
        team_id=0,
        season_nullable=season,
        season_type_all_star="Regular Season",
        context_measure_simple="FGA",
    )
    df = chart.get_data_frames()[0]

    if last_n_games and last_n_games > 0 and not df.empty:
        log = playergamelog.PlayerGameLog(player_id=player_id, season=season)
        log_df = log.get_data_frames()[0]
        last_game_ids = log_df.head(last_n_games)["Game_ID"].tolist()
        df = df[df["GAME_ID"].isin(last_game_ids)]

    if df.empty:
        return {"error": "No shot data found for the specified parameters"}

    total = len(df)
    made = int(df["SHOT_MADE_FLAG"].sum())
    threes_df = df[df["SHOT_TYPE"].str.contains("3PT", na=False)]
    threes_made = int(threes_df["SHOT_MADE_FLAG"].sum())
    paint_df = df[df["SHOT_DISTANCE"] <= 6]
    paint_made = int(paint_df["SHOT_MADE_FLAG"].sum())
    midrange_df = df[(df["SHOT_DISTANCE"] >= 10) & (df["SHOT_DISTANCE"] <= 16)]
    midrange_made = int(midrange_df["SHOT_MADE_FLAG"].sum())

    return {
        "games_included": last_n_games if last_n_games else "full season",
        "total_shots": total,
        "fg_pct": round(made / total * 100, 1),
        "threes_attempted": len(threes_df),
        "threes_made": threes_made,
        "three_pct": round(threes_made / len(threes_df) * 100, 1) if len(threes_df) > 0 else 0,
        "paint_attempted": len(paint_df),
        "paint_made": paint_made,
        "paint_pct": round(paint_made / len(paint_df) * 100, 1) if len(paint_df) > 0 else 0,
        "midrange_attempted": len(midrange_df),
        "midrange_made": midrange_made,
        "midrange_pct": round(midrange_made / len(midrange_df) * 100, 1) if len(midrange_df) > 0 else 0,
    }


def _tool_get_game_log(player_id: int, season: str, last_n_games: int = None) -> list:
    log = playergamelog.PlayerGameLog(player_id=player_id, season=season)
    df = log.get_data_frames()[0]
    if last_n_games and last_n_games > 0:
        df = df.head(last_n_games)
    cols = ["GAME_DATE", "MATCHUP", "WL", "PTS", "FGM", "FGA",
            "FG_PCT", "FG3M", "FG3A", "FG3_PCT", "AST", "REB"]
    return df[cols].to_dict("records")


def _tool_get_opponent_defense(team_abbreviation: str, season: str) -> dict:
    all_teams = nba_teams_static.get_teams()
    team = next(
        (t for t in all_teams if t["abbreviation"].upper() == team_abbreviation.upper()),
        None,
    )
    if not team:
        return {
            "error": f"Team '{team_abbreviation}' not found. Valid examples: LAL, BOS, GSW, MIA, NYK"
        }

    try:
        # Opponent measure returns what opponents score/shoot against this team
        stats = leaguedashteamstats.LeagueDashTeamStats(
            season=season,
            measure_type_simple="Opponent",
        )
        df = stats.get_data_frames()[0]
        row = df[df["TEAM_ID"] == team["id"]]

        if row.empty:
            return {"error": f"No defensive stats found for {team_abbreviation} in {season}"}

        r = row.iloc[0]
        result = {"team": team_abbreviation.upper(), "season": season}

        # Columns in Opponent measure represent what opponents do against this team
        for col, key in [
            ("FG_PCT", "opp_fg_pct"),
            ("FG3_PCT", "opp_3p_pct"),
            ("PTS", "opp_pts_per_game"),
            ("FG3A", "opp_3pa_per_game"),
        ]:
            if col in r.index:
                val = float(r[col])
                result[key] = round(val * 100, 1) if "PCT" in col else round(val, 1)

        return result
    except Exception as e:
        return {"error": f"Failed to fetch defensive stats: {str(e)}"}


def _tool_get_player_props(player_name: str, prop_type: str) -> dict:
    api_key = os.getenv("ODDS_API_KEY")
    if not api_key:
        return {"error": "ODDS_API_KEY is not set. Player props unavailable."}

    prop_map = {
        "points": "player_points",
        "rebounds": "player_rebounds",
        "assists": "player_assists",
        "threes": "player_threes",
        "steals": "player_steals",
        "blocks": "player_blocks",
        "pts+reb+ast": "player_points_rebounds_assists",
    }
    market = prop_map.get(prop_type.lower(), f"player_{prop_type.lower().replace(' ', '_')}")
    player_lower = player_name.lower()

    try:
        events_resp = http_requests.get(
            "https://api.the-odds-api.com/v4/sports/basketball_nba/events",
            params={"apiKey": api_key},
            timeout=10,
        )
        if events_resp.status_code != 200:
            return {"error": f"Odds API error fetching events: {events_resp.status_code}"}

        events = events_resp.json()

        for event in events[:8]:
            odds_resp = http_requests.get(
                f"https://api.the-odds-api.com/v4/sports/basketball_nba/events/{event['id']}/odds",
                params={
                    "apiKey": api_key,
                    "regions": "us",
                    "markets": market,
                    "oddsFormat": "american",
                },
                timeout=10,
            )
            if odds_resp.status_code != 200:
                continue

            data = odds_resp.json()

            for bookmaker in data.get("bookmakers", [])[:3]:
                for mkt in bookmaker.get("markets", []):
                    player_outcomes = [
                        o for o in mkt.get("outcomes", [])
                        if player_lower in o.get("description", "").lower()
                    ]
                    if player_outcomes:
                        over = next((o for o in player_outcomes if o.get("name") == "Over"), None)
                        under = next((o for o in player_outcomes if o.get("name") == "Under"), None)
                        return {
                            "player": player_name,
                            "prop": prop_type,
                            "line": over.get("point") if over else None,
                            "over_odds": over.get("price") if over else None,
                            "under_odds": under.get("price") if under else None,
                            "bookmaker": bookmaker["title"],
                            "game": f"{data.get('away_team', '?')} @ {data.get('home_team', '?')}",
                            "game_time": data.get("commence_time"),
                        }

        return {
            "message": (
                f"No active props found for {player_name} ({prop_type}). "
                "They may not have a game today or props are not yet posted."
            )
        }
    except Exception as e:
        return {"error": f"Failed to fetch player props: {str(e)}"}


def _dispatch_tool(tool_name: str, tool_input: dict):
    if tool_name == "get_shot_chart":
        return _tool_get_shot_chart(**tool_input)
    elif tool_name == "get_game_log":
        return _tool_get_game_log(**tool_input)
    elif tool_name == "get_opponent_defense":
        return _tool_get_opponent_defense(**tool_input)
    elif tool_name == "get_player_props":
        return _tool_get_player_props(**tool_input)
    else:
        return {"error": f"Unknown tool: {tool_name}"}


# ---------------------------------------------------------------------------
# Upgraded analyze endpoint — agentic loop
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    question: Optional[str] = None


ANALYZE_SYSTEM = """You are an expert NBA shot analyst with access to real player data via tools.

Use the tools to gather the specific data needed to answer the question. Call multiple tools if needed to build a complete picture.

After gathering sufficient data, respond with ONLY a valid JSON object — no markdown code fences, no extra text before or after:
{
  "executiveSummary": "2-3 sentence overview citing specific numbers from the data",
  "recommendedFocus": "one clear, actionable coaching or betting recommendation tied to the data",
  "insights": [
    {"title": "short title", "description": "2 sentences with specific stats and numbers", "type": "strength|improvement|trend|warning"}
  ]
}
Include exactly 4 insights. Output ONLY the JSON object."""


@app.post("/api/players/{player_id}/analyze")
def analyze_shots(
    player_id: int,
    season: str = "2024-25",
    body: Optional[AnalyzeRequest] = Body(default=None),
):
    question = (body.question if body and body.question else None) or (
        f"Provide a comprehensive analysis of this player's shooting performance for the {season} season."
    )

    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    messages = [
        {
            "role": "user",
            "content": f"Player ID: {player_id}, Season: {season}\n\nQuestion: {question}",
        }
    ]

    # Agentic loop — run until Claude stops calling tools
    while True:
        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=4096,
            system=ANALYZE_SYSTEM,
            tools=ANALYZE_TOOLS,
            messages=messages,
        )

        if response.stop_reason == "end_turn":
            # Extract the final text response and parse it as JSON
            text = ""
            for block in response.content:
                if hasattr(block, "text"):
                    text = block.text.strip()
                    break

            # Strip markdown code fences if present (defensive)
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            text = text.strip()

            payload = json.loads(text)
            return {
                "executiveSummary": payload.get("executiveSummary", ""),
                "recommendedFocus": payload.get("recommendedFocus", ""),
                "insights": payload.get("insights", []),
            }

        # stop_reason == "tool_use" — execute all requested tools
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = _dispatch_tool(block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result),
                })

        # Append assistant response (including tool_use blocks) then tool results
        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})

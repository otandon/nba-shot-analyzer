from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from nba_api.stats.static import players
from dotenv import load_dotenv
from nba_api.stats.endpoints import commonplayerinfo, playercareerstats
from nba_api.stats.endpoints import shotchartdetail
from nba_api.stats.endpoints import playergamelog
import anthropic
import os


load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        # NBA coords: LOC_X is -250 to 250, LOC_Y is -50 to ~900
        # Map to SVG court: 500 wide, 470 tall
        x = (float(row["LOC_X"])* 1.01) + 250
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


@app.post("/api/players/{player_id}/analyze")
def analyze_shots(player_id: int, season: str = "2024-25"):
    shots = get_shot_chart(player_id, season)

    total = len(shots)
    made = sum(1 for s in shots if s["made"])
    threes = [s for s in shots if s["shotType"] == "3PT"]
    threes_made = sum(1 for s in threes if s["made"])
    paint = [s for s in shots if s["distance"] <= 6]
    paint_made = sum(1 for s in paint if s["made"])
    midrange = [s for s in shots if 10 <= s["distance"] <= 16]
    midrange_made = sum(1 for s in midrange if s["made"])

    summary = f"""
    Total shots: {total}, FG%: {round(made/total*100, 1)}%
    3-pointers: {len(threes)} attempts, {threes_made} made ({round(threes_made/len(threes)*100, 1) if threes else 0}%)
    Paint (0-6ft): {len(paint)} attempts, {paint_made} made ({round(paint_made/len(paint)*100, 1) if paint else 0}%)
    Mid-range (10-16ft): {len(midrange)} attempts, {midrange_made} made ({round(midrange_made/len(midrange)*100, 1) if midrange else 0}%)
    """

    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": f"""Analyze this NBA player's shot chart data for the {season} season.
            Return ONLY a JSON array of exactly 4 insight objects, no other text.
            Each object must have: "title" (short), "description" (2 sentences, specific with numbers), "type" (one of: "strength", "improvement", "trend", "warning").
            
            Shot data:
            {summary}"""
        }]
    )

    import json
    text = response.content[0].text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    insights = json.loads(text.strip())
    return {"insights": insights}
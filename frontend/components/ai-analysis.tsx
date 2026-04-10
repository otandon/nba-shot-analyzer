"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, TrendingUp, Target, AlertTriangle } from "lucide-react"

interface AnalysisInsight {
  title: string
  description: string
  type: "strength" | "improvement" | "trend" | "warning"
}

interface AIAnalysisProps {
  playerName: string
  insights: AnalysisInsight[]
}

export function AIAnalysis({ playerName, insights }: AIAnalysisProps) {
  const getIcon = (type: AnalysisInsight["type"]) => {
    switch (type) {
      case "strength":
        return <Target className="h-4 w-4 text-primary" />
      case "improvement":
        return <TrendingUp className="h-4 w-4 text-chart-3" />
      case "trend":
        return <Sparkles className="h-4 w-4 text-chart-4" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-accent" />
    }
  }

  const getBadgeVariant = (type: AnalysisInsight["type"]) => {
    switch (type) {
      case "strength":
        return "default"
      case "improvement":
        return "secondary"
      case "trend":
        return "secondary"
      case "warning":
        return "destructive"
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            AI Shot Analysis
          </h2>
          <p className="text-sm text-muted-foreground">
            Powered by advanced basketball analytics
          </p>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground">
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {playerName} demonstrates elite shooting efficiency from the
            perimeter with a particularly strong corner three. The mid-range
            game has shown improvement over the last 10 games, with a 7%
            increase in efficiency. Paint scoring remains consistent but shows
            room for growth against taller defenders.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Key Insights
        </h3>

        <div className="grid gap-3">
          {insights.map((insight, index) => (
            <Card key={index} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getIcon(insight.type)}</div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm">
                        {insight.title}
                      </span>
                      <Badge variant={getBadgeVariant(insight.type)} className="text-xs">
                        {insight.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {insight.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="bg-secondary/30 border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Recommended Focus
              </p>
              <p className="text-xs text-muted-foreground">
                Increase shot attempts from left corner three where efficiency
                is 12% above average
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

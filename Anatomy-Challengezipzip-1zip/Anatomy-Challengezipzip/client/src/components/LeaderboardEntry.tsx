import { Trophy, Medal, Award } from "lucide-react";
import { Card } from "@/components/ui/card";

interface LeaderboardEntryProps {
  rank: number;
  name: string;
  score: number;
  isCurrentPlayer: boolean;
  pointsGained?: number;
}

export function LeaderboardEntry({ rank, name, score, isCurrentPlayer, pointsGained }: LeaderboardEntryProps) {
  const getRankIcon = () => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-medal-gold" />;
      case 2:
        return <Medal className="w-6 h-6 text-medal-silver" />;
      case 3:
        return <Award className="w-6 h-6 text-medal-bronze" />;
      default:
        return (
          <span className="w-6 h-6 flex items-center justify-center text-lg font-bold text-muted-foreground">
            {rank}
          </span>
        );
    }
  };

  const getRankBgColor = () => {
    switch (rank) {
      case 1:
        return "bg-medal-gold/10 border-medal-gold/30";
      case 2:
        return "bg-medal-silver/10 border-medal-silver/30";
      case 3:
        return "bg-medal-bronze/10 border-medal-bronze/30";
      default:
        return "";
    }
  };

  return (
    <Card
      className={`p-4 flex items-center gap-4 transition-all duration-300 ${getRankBgColor()} ${
        isCurrentPlayer ? "ring-2 ring-primary" : ""
      }`}
      data-testid={`leaderboard-entry-${rank}`}
    >
      <div className="flex-shrink-0">{getRankIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold truncate ${isCurrentPlayer ? "text-primary" : ""}`}>
          {name}
          {isCurrentPlayer && " (You)"}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-xl font-bold tabular-nums" data-testid={`score-${rank}`}>
          {score.toLocaleString()}
        </span>
        {pointsGained !== undefined && pointsGained > 0 && (
          <span className="text-sm text-green-500 font-medium">+{pointsGained}</span>
        )}
      </div>
    </Card>
  );
}

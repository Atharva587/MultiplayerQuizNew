import { User, Crown } from "lucide-react";
import { Card } from "@/components/ui/card";

interface PlayerCardProps {
  name: string;
  isHost: boolean;
  index: number;
}

const avatarColors = [
  "bg-answer-red",
  "bg-answer-blue",
  "bg-answer-yellow",
  "bg-answer-green",
  "bg-primary",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-5",
];

export function PlayerCard({ name, isHost, index }: PlayerCardProps) {
  const colorIndex = index % avatarColors.length;
  const bgColor = avatarColors[colorIndex];

  return (
    <Card className="p-4 flex items-center gap-3" data-testid={`player-card-${index}`}>
      <div className={`relative w-10 h-10 rounded-full ${bgColor} flex items-center justify-center`}>
        <User className="w-5 h-5 text-white" />
        {isHost && (
          <div className="absolute -top-1 -right-1 bg-medal-gold rounded-full p-0.5">
            <Crown className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate" data-testid={`player-name-${index}`}>{name}</p>
        {isHost && <p className="text-xs text-muted-foreground">Host</p>}
      </div>
    </Card>
  );
}

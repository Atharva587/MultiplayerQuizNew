import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useGame } from "@/lib/gameContext";
import { useToast } from "@/hooks/use-toast";
import { PlayerCard } from "@/components/PlayerCard";
import { Copy, Users, Play, Loader2, Settings, FileText } from "lucide-react";

export default function Lobby() {
  const { room, isHost, startGame, resetGame, totalQuestions } = useGame();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!room) {
      navigate("/");
      return;
    }
    if (room.status === "playing") {
      navigate("/game");
    }
  }, [room, navigate]);

  if (!room) return null;

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      toast({ title: "Room code copied!" });
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleStartGame = () => {
    if (room.players.length < 1) {
      toast({ title: "Need at least 1 player to start", variant: "destructive" });
      return;
    }
    startGame();
  };

  const handleLeave = () => {
    resetGame();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Game Lobby</h1>
          <p className="text-muted-foreground">Share the code with your friends!</p>
        </div>

        <Card className="p-8">
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium">
              Room Code
            </p>
            <div className="flex items-center gap-4">
              <div
                className="px-8 py-4 bg-muted rounded-xl border-4 border-primary/20"
                data-testid="room-code-display"
              >
                <span className="text-4xl md:text-5xl font-bold tracking-[0.3em] font-mono">
                  {room.code}
                </span>
              </div>
              <Button
                size="icon"
                variant="outline"
                onClick={copyRoomCode}
                data-testid="button-copy-code"
              >
                <Copy className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </Card>

        {isHost() && (
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Quiz Questions</p>
                  <p className="text-sm text-muted-foreground">
                    {room.useCustomQuestions 
                      ? `${totalQuestions} custom questions` 
                      : `${totalQuestions} default questions`}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => navigate("/questions")}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                Configure
              </Button>
            </div>
          </Card>
        )}

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">
              Players ({room.players.length})
            </h2>
          </div>

          {room.players.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="space-y-2">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Waiting for players to join...</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {room.players.map((player, index) => (
                <PlayerCard
                  key={player.id}
                  name={player.name}
                  isHost={player.isHost}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="outline"
            onClick={handleLeave}
            className="sm:w-40"
            data-testid="button-leave-lobby"
          >
            Leave
          </Button>
          {isHost() && (
            <Button
              onClick={handleStartGame}
              className="sm:w-40"
              disabled={room.players.length < 1}
              data-testid="button-start-game"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Game
            </Button>
          )}
          {!isHost() && (
            <div className="text-center text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              Waiting for host to start...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

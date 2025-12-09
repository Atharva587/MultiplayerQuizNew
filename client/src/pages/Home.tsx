import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGame } from "@/lib/gameContext";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Bone, Loader2 } from "lucide-react";

export default function Home() {
  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { createRoom, joinRoom, error, room, isConnected } = useGame();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      toast({ title: "Please enter your name", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    createRoom(playerName.trim());
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      toast({ title: "Please enter your name", variant: "destructive" });
      return;
    }
    if (!roomCode.trim() || roomCode.length !== 6) {
      toast({ title: "Please enter a valid 6-character room code", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
  };

  useEffect(() => {
    if (room) {
      navigate("/lobby");
    }
  }, [room, navigate]);

  useEffect(() => {
    if (error && isLoading) {
      setIsLoading(false);
      toast({ title: error, variant: "destructive" });
    }
  }, [error, isLoading, toast]);

  if (room) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Bone className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            MedAB Quiz
          </h1>
          <p className="text-lg text-muted-foreground">
            Challenge Yourself
          </p>
        </div>

        {mode === "select" && (
          <div className="grid gap-6">
            <Card
              className="p-8 cursor-pointer hover-elevate transition-all"
              onClick={() => setMode("create")}
              data-testid="card-create-room"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Plus className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Create Room</h2>
                  <p className="text-muted-foreground">Host a new quiz game</p>
                </div>
              </div>
            </Card>

            <Card
              className="p-8 cursor-pointer hover-elevate transition-all"
              onClick={() => setMode("join")}
              data-testid="card-join-room"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-answer-blue/10 flex items-center justify-center">
                  <Users className="w-7 h-7 text-answer-blue" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Join Room</h2>
                  <p className="text-muted-foreground">Enter a room code to play</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {mode === "create" && (
          <Card className="p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Create a Room</h2>
              <p className="text-muted-foreground">You will be the host</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Your Name</Label>
                <Input
                  id="create-name"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="text-lg"
                  maxLength={20}
                  data-testid="input-create-name"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setMode("select")}
                  className="flex-1"
                  disabled={isLoading}
                  data-testid="button-back-create"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreateRoom}
                  className="flex-1"
                  disabled={!isConnected || isLoading}
                  data-testid="button-create-room"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Create Room"
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {mode === "join" && (
          <Card className="p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Join a Room</h2>
              <p className="text-muted-foreground">Enter the code shared by your host</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="join-name">Your Name</Label>
                <Input
                  id="join-name"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="text-lg"
                  maxLength={20}
                  data-testid="input-join-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-code">Room Code</Label>
                <Input
                  id="room-code"
                  placeholder="XXXXXX"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
                  className="text-2xl text-center tracking-[0.3em] uppercase font-mono"
                  maxLength={6}
                  data-testid="input-room-code"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setMode("select")}
                  className="flex-1"
                  disabled={isLoading}
                  data-testid="button-back-join"
                >
                  Back
                </Button>
                <Button
                  onClick={handleJoinRoom}
                  className="flex-1"
                  disabled={!isConnected || isLoading}
                  data-testid="button-join-room"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Join Room"
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {!isConnected && (
          <div className="text-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            Connecting to server...
          </div>
        )}
      </div>
    </div>
  );
}

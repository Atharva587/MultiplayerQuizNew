import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGame } from "@/lib/gameContext";
import { LeaderboardEntry } from "@/components/LeaderboardEntry";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";

export default function QuestionResults() {
  const { room, leaderboard, playerId, isHost, nextQuestion, totalQuestions } = useGame();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!room) {
      navigate("/");
      return;
    }
    if (room.status === "playing") {
      navigate("/game");
    }
    if (room.status === "finished") {
      navigate("/final");
    }
  }, [room, navigate]);

  if (!room || leaderboard.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const questionNumber = room.currentQuestionIndex + 1;
  const isLastQuestion = questionNumber >= totalQuestions;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <p className="text-muted-foreground">
            After Question {questionNumber} of {totalQuestions}
          </p>
        </div>

        <div className="space-y-3">
          {leaderboard.map((player, index) => (
            <LeaderboardEntry
              key={player.id}
              rank={index + 1}
              name={player.name}
              score={player.score}
              isCurrentPlayer={player.id === playerId}
            />
          ))}
        </div>

        <div className="flex justify-center pt-4">
          {isHost() ? (
            <Button
              onClick={nextQuestion}
              size="lg"
              className="gap-2"
              data-testid="button-next-question"
            >
              {isLastQuestion ? "See Final Results" : "Next Question"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <div className="text-center text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              Waiting for host to continue...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

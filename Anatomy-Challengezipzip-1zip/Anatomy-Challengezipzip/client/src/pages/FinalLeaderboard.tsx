import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useGame } from "@/lib/gameContext";
import { LeaderboardEntry } from "@/components/LeaderboardEntry";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Medal, Award, Home, RotateCcw, Loader2, ChevronDown, ChevronUp, Check, X, Clock } from "lucide-react";

export default function FinalLeaderboard() {
  const { room, leaderboard, playerId, resetGame, answerHistories, gameQuestions } = useGame();
  const [, navigate] = useLocation();
  const [showMyAnswers, setShowMyAnswers] = useState(false);

  useEffect(() => {
    if (!room) {
      navigate("/");
    }
  }, [room, navigate]);

  if (!room || leaderboard.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const handlePlayAgain = () => {
    resetGame();
    navigate("/");
  };

  const handleExit = () => {
    resetGame();
    navigate("/");
  };

  const winner = leaderboard[0];
  const runnerUp = leaderboard[1];
  const thirdPlace = leaderboard[2];

  const myAnswerHistory = answerHistories.find((h) => h.playerId === playerId);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Game Over!</h1>
          <p className="text-muted-foreground text-lg">Final Results</p>
        </div>

        {leaderboard.length >= 3 && (
          <div className="flex items-end justify-center gap-4 py-8">
            <div className="flex flex-col items-center">
              <Card className="w-24 md:w-32 p-4 bg-medal-silver/10 border-medal-silver/30">
                <div className="text-center space-y-2">
                  <Medal className="w-8 h-8 mx-auto text-medal-silver" />
                  <p className="font-bold truncate text-sm">{runnerUp?.name}</p>
                  <p className="text-xl font-bold tabular-nums">{runnerUp?.score.toLocaleString()}</p>
                </div>
              </Card>
              <div className="w-full h-16 bg-medal-silver/20 rounded-t-none" />
            </div>

            <div className="flex flex-col items-center -mb-4">
              <Card className="w-28 md:w-36 p-4 bg-medal-gold/10 border-medal-gold/30 ring-2 ring-medal-gold">
                <div className="text-center space-y-2">
                  <Trophy className="w-10 h-10 mx-auto text-medal-gold" />
                  <p className="font-bold truncate">{winner?.name}</p>
                  <p className="text-2xl font-bold tabular-nums">{winner?.score.toLocaleString()}</p>
                </div>
              </Card>
              <div className="w-full h-24 bg-medal-gold/20 rounded-t-none" />
            </div>

            <div className="flex flex-col items-center">
              <Card className="w-24 md:w-32 p-4 bg-medal-bronze/10 border-medal-bronze/30">
                <div className="text-center space-y-2">
                  <Award className="w-8 h-8 mx-auto text-medal-bronze" />
                  <p className="font-bold truncate text-sm">{thirdPlace?.name}</p>
                  <p className="text-xl font-bold tabular-nums">{thirdPlace?.score.toLocaleString()}</p>
                </div>
              </Card>
              <div className="w-full h-12 bg-medal-bronze/20 rounded-t-none" />
            </div>
          </div>
        )}

        {leaderboard.length < 3 && leaderboard.length > 0 && (
          <Card className="p-8 text-center">
            <Trophy className="w-16 h-16 mx-auto text-medal-gold mb-4" />
            <h2 className="text-2xl font-bold">{winner?.name} Wins!</h2>
            <p className="text-3xl font-bold tabular-nums text-primary mt-2">
              {winner?.score.toLocaleString()} points
            </p>
          </Card>
        )}

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-muted-foreground">Full Rankings</h3>
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

        {myAnswerHistory && myAnswerHistory.answers.length > 0 && (
          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={() => setShowMyAnswers(!showMyAnswers)}
              className="w-full justify-between"
            >
              <span>Review My Answers</span>
              {showMyAnswers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>

            {showMyAnswers && (
              <div className="space-y-3">
                {myAnswerHistory.answers.map((answer, index) => {
                  const question = gameQuestions[answer.questionIndex];
                  const isTimeout = answer.selectedAnswer === -1;

                  return (
                    <Card
                      key={index}
                      className={`p-4 ${
                        answer.isCorrect
                          ? "border-green-500/30 bg-green-500/5"
                          : "border-red-500/30 bg-red-500/5"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm">
                            Q{answer.questionIndex + 1}: {answer.questionText}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            {answer.isCorrect ? (
                              <Check className="w-5 h-5 text-green-500" />
                            ) : isTimeout ? (
                              <Clock className="w-5 h-5 text-yellow-500" />
                            ) : (
                              <X className="w-5 h-5 text-red-500" />
                            )}
                            <span className="text-sm font-bold tabular-nums">
                              +{answer.points}
                            </span>
                          </div>
                        </div>

                        {question && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {question.options.map((option, optIndex) => {
                              const isSelected = answer.selectedAnswer === optIndex;
                              const isCorrectOption = answer.correctAnswer === optIndex;

                              let optionClass = "p-2 rounded border ";
                              if (isCorrectOption) {
                                optionClass += "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
                              } else if (isSelected && !isCorrectOption) {
                                optionClass += "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400";
                              } else {
                                optionClass += "border-border/50 text-muted-foreground";
                              }

                              return (
                                <div key={optIndex} className={optionClass}>
                                  <span className="font-medium mr-2">
                                    {String.fromCharCode(65 + optIndex)}.
                                  </span>
                                  {option}
                                  {isCorrectOption && (
                                    <Check className="w-4 h-4 inline ml-2 text-green-500" />
                                  )}
                                  {isSelected && !isCorrectOption && (
                                    <X className="w-4 h-4 inline ml-2 text-red-500" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {isTimeout && (
                          <p className="text-sm text-yellow-600 dark:text-yellow-400">
                            Time ran out - no answer submitted
                          </p>
                        )}
                      </div>
                    </Card>
                  );
                })}

                <Card className="p-4 bg-primary/5 border-primary/30">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Score</span>
                    <span className="text-xl font-bold tabular-nums">
                      {myAnswerHistory.totalScore.toLocaleString()} points
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-muted-foreground mt-1">
                    <span>Correct Answers</span>
                    <span>
                      {myAnswerHistory.answers.filter((a) => a.isCorrect).length} / {myAnswerHistory.answers.length}
                    </span>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleExit}
            className="gap-2"
            data-testid="button-exit-game"
          >
            <Home className="w-4 h-4" />
            Exit
          </Button>
          <Button
            onClick={handlePlayAgain}
            className="gap-2"
            data-testid="button-play-again"
          >
            <RotateCcw className="w-4 h-4" />
            Play Again
          </Button>
        </div>
      </div>
    </div>
  );
}

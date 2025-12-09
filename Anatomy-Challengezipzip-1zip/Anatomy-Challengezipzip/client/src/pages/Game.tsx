import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGame } from "@/lib/gameContext";
import { Timer } from "@/components/Timer";
import { AnswerButton } from "@/components/AnswerButton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function Game() {
  const {
    room,
    currentQuestion,
    timeRemaining,
    selectedAnswer,
    answerResult,
    submitAnswer,
    totalQuestions,
  } = useGame();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!room) {
      navigate("/");
      return;
    }
    if (room.status === "question_results") {
      navigate("/results");
    }
    if (room.status === "finished") {
      navigate("/final");
    }
  }, [room, navigate]);

  if (!room || !currentQuestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading question...</p>
        </div>
      </div>
    );
  }

  const questionNumber = room.currentQuestionIndex + 1;
  const hasAnswered = selectedAnswer !== null;
  const showResult = answerResult !== null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Badge variant="secondary" className="text-sm px-4 py-1.5">
            Question {questionNumber} of {totalQuestions}
          </Badge>
          <Timer timeRemaining={timeRemaining} />
        </div>

        <Card className="p-6 md:p-8">
          <div className="space-y-4">
            <Badge variant="outline" className="text-xs">
              {currentQuestion.category}
            </Badge>
            <h2
              className="text-xl md:text-2xl lg:text-3xl font-bold leading-tight"
              data-testid="question-text"
            >
              {currentQuestion.question}
            </h2>
          </div>
        </Card>

        {showResult && (
          <Card className={`p-4 flex items-center gap-4 ${
            answerResult.correct 
              ? "bg-green-500/10 border-green-500/30" 
              : "bg-red-500/10 border-red-500/30"
          }`}>
            {answerResult.correct ? (
              <>
                <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
                <div>
                  <p className="font-bold text-green-600 dark:text-green-400">Correct!</p>
                  <p className="text-sm text-muted-foreground">+{answerResult.points} points</p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-bold text-red-600 dark:text-red-400">
                    {hasAnswered ? "Incorrect!" : "Time's up!"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The correct answer was: {currentQuestion.options[answerResult.correctIndex]}
                  </p>
                </div>
              </>
            )}
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {currentQuestion.options.map((option, index) => (
            <AnswerButton
              key={index}
              index={index}
              text={option}
              onClick={() => submitAnswer(index)}
              disabled={hasAnswered || timeRemaining === 0}
              isSelected={selectedAnswer === index}
              isCorrect={answerResult?.correctIndex === index}
              showResult={showResult}
            />
          ))}
        </div>

        <div className="flex justify-center">
          <div className="flex gap-2">
            {Array.from({ length: totalQuestions }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-colors ${
                  i < questionNumber
                    ? "bg-primary"
                    : i === questionNumber - 1
                    ? "bg-primary animate-pulse"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {hasAnswered && !showResult && (
          <div className="text-center text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            Waiting for other players...
          </div>
        )}
      </div>
    </div>
  );
}

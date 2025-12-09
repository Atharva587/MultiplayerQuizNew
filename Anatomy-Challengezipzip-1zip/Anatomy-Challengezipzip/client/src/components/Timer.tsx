import { QUESTION_TIME_LIMIT } from "@shared/schema";

interface TimerProps {
  timeRemaining: number;
}

export function Timer({ timeRemaining }: TimerProps) {
  const percentage = (timeRemaining / QUESTION_TIME_LIMIT) * 100;
  const isUrgent = timeRemaining <= 5;
  const circumference = 2 * Math.PI * 52;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" data-testid="timer-container">
      <svg
        className="w-28 h-28 transform -rotate-90"
        viewBox="0 0 120 120"
      >
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
        />
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke={isUrgent ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={`transition-all duration-1000 ease-linear ${isUrgent ? "animate-pulse" : ""}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`text-4xl font-bold tabular-nums ${isUrgent ? "text-destructive animate-pulse" : "text-foreground"}`}
          data-testid="timer-value"
        >
          {timeRemaining}
        </span>
      </div>
    </div>
  );
}

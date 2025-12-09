import { Triangle, Diamond, Circle, Square, Check, X } from "lucide-react";

interface AnswerButtonProps {
  index: number;
  text: string;
  onClick: () => void;
  disabled: boolean;
  isSelected: boolean;
  isCorrect?: boolean;
  showResult: boolean;
}

const buttonStyles = [
  { bg: "bg-answer-red", fg: "text-answer-red-foreground", icon: Triangle },
  { bg: "bg-answer-blue", fg: "text-answer-blue-foreground", icon: Diamond },
  { bg: "bg-answer-yellow", fg: "text-answer-yellow-foreground", icon: Circle },
  { bg: "bg-answer-green", fg: "text-answer-green-foreground", icon: Square },
];

export function AnswerButton({
  index,
  text,
  onClick,
  disabled,
  isSelected,
  isCorrect,
  showResult,
}: AnswerButtonProps) {
  const style = buttonStyles[index];
  const Icon = style.icon;

  const getButtonState = () => {
    if (!showResult) {
      if (isSelected) {
        return "ring-4 ring-white ring-offset-2 ring-offset-background scale-[1.02]";
      }
      return "";
    }
    if (isCorrect) {
      return "ring-4 ring-green-400 ring-offset-2 ring-offset-background";
    }
    if (isSelected && !isCorrect) {
      return "opacity-60 ring-4 ring-red-400 ring-offset-2 ring-offset-background";
    }
    return "opacity-40";
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-full h-24 md:h-32 rounded-2xl
        ${style.bg} ${style.fg}
        flex items-center justify-center gap-4
        text-lg md:text-xl font-semibold
        transition-all duration-200 ease-out
        ${disabled ? "cursor-not-allowed" : "cursor-pointer hover:scale-[1.02] active:scale-[0.98]"}
        ${getButtonState()}
      `}
      data-testid={`answer-button-${index}`}
    >
      <Icon className="w-6 h-6 md:w-8 md:h-8 flex-shrink-0" />
      <span className="text-center px-2 line-clamp-2">{text}</span>
      {showResult && isCorrect && (
        <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
      {showResult && isSelected && !isCorrect && (
        <div className="absolute top-2 right-2 bg-red-500 rounded-full p-1">
          <X className="w-4 h-4 text-white" />
        </div>
      )}
    </button>
  );
}

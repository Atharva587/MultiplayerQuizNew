import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameProvider } from "@/lib/gameContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import Home from "@/pages/Home";
import Lobby from "@/pages/Lobby";
import Game from "@/pages/Game";
import QuestionResults from "@/pages/QuestionResults";
import FinalLeaderboard from "@/pages/FinalLeaderboard";
import QuestionBuilder from "@/pages/QuestionBuilder";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/lobby" component={Lobby} />
      <Route path="/questions" component={QuestionBuilder} />
      <Route path="/game" component={Game} />
      <Route path="/results" component={QuestionResults} />
      <Route path="/final" component={FinalLeaderboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="medab-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <GameProvider>
            <ThemeToggle />
            <Toaster />
            <Router />
          </GameProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

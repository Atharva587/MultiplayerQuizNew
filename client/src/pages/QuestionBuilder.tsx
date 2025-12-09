import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useGame } from "@/lib/gameContext";
import { useToast } from "@/hooks/use-toast";
import type { Question } from "@shared/schema";
import { 
  Upload, 
  FileText, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Check,
  Loader2,
  Edit2,
  BookOpen,
  Library,
  Save
} from "lucide-react";

type Mode = "select" | "upload" | "manual" | "review" | "library";

export default function QuestionBuilder() {
  const [mode, setMode] = useState<Mode>("select");
  const [sourceText, setSourceText] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [savedQuestionsList, setSavedQuestionsList] = useState<Question[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<number>>(new Set());
  
  const { room, isHost, setCustomQuestions } = useGame();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!room) {
      navigate("/");
      return;
    }
    if (!isHost()) {
      navigate("/lobby");
    }
  }, [room, isHost, navigate]);

  const loadSavedQuestions = async () => {
    try {
      const response = await fetch("/api/saved-questions");
      const data = await response.json();
      if (response.ok) {
        setSavedQuestionsList(data.questions);
      }
    } catch (error) {
      console.error("Failed to load saved questions:", error);
    }
  };

  useEffect(() => {
    loadSavedQuestions();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      const formData = new FormData();
      formData.append("pdf", file);
      
      setIsLoading(true);
      try {
        const response = await fetch("/api/parse-questions", {
          method: "POST",
          body: formData,
        });
        
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to parse questions");
        }
        
        const formattedQuestions = data.questions.map((q: any, i: number) => ({
          ...q,
          id: i + 1,
        }));
        setQuestions(formattedQuestions);
        setMode("review");
        toast({ title: `Parsed ${data.parsedCount} questions!` });
      } catch (error) {
        toast({ 
          title: "Failed to parse questions", 
          description: (error as Error).message,
          variant: "destructive" 
        });
      } finally {
        setIsLoading(false);
      }
    } else if (file.type === "text/plain") {
      const text = await file.text();
      setSourceText(text);
      setMode("upload");
    } else {
      toast({ title: "Please upload a PDF or text file", variant: "destructive" });
    }
  };

  const handleParseFromText = async () => {
    if (sourceText.length < 20) {
      toast({ title: "Please enter some content", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/parse-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sourceText }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to parse questions");
      }
      
      const formattedQuestions = data.questions.map((q: any, i: number) => ({
        ...q,
        id: i + 1,
      }));
      setQuestions(formattedQuestions);
      setMode("review");
      toast({ title: `Parsed ${data.parsedCount} questions!` });
    } catch (error) {
      toast({ 
        title: "Failed to parse questions", 
        description: (error as Error).message,
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToLibrary = async () => {
    const validQuestions = questions.filter(q => 
      q.question.trim() && 
      q.options.every(opt => opt.trim())
    );
    
    if (validQuestions.length === 0) {
      toast({ title: "No valid questions to save", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/saved-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: validQuestions }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to save questions");
      }
      
      toast({ title: `Saved ${data.saved} questions to library!` });
      await loadSavedQuestions();
      setQuestions([]);
      setMode("select");
    } catch (error) {
      toast({ 
        title: "Failed to save questions", 
        description: (error as Error).message,
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addManualQuestion = () => {
    const newQuestion: Question = {
      id: questions.length + 1,
      question: "",
      options: ["", "", "", ""],
      correctIndex: 0,
      category: "Custom",
    };
    setQuestions([...questions, newQuestion]);
    setEditingIndex(questions.length);
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    setQuestions(questions.map((q, i) => 
      i === index ? { ...q, ...updates } : q
    ));
  };

  const deleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const deleteSavedQuestion = async (id: number) => {
    try {
      const response = await fetch(`/api/saved-questions/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast({ title: "Question deleted" });
        await loadSavedQuestions();
        setSelectedQuestionIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    } catch (error) {
      toast({ title: "Failed to delete question", variant: "destructive" });
    }
  };

  const toggleQuestionSelection = (id: number) => {
    setSelectedQuestionIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllQuestions = () => {
    if (selectedQuestionIds.size === savedQuestionsList.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(savedQuestionsList.map(q => q.id)));
    }
  };

  const handleUseSelectedQuestions = () => {
    const selectedQuestions = savedQuestionsList
      .filter(q => selectedQuestionIds.has(q.id))
      .slice(0, questionCount)
      .map((q, i) => ({ ...q, id: i + 1 }));
    
    if (selectedQuestions.length === 0) {
      toast({ title: "Please select at least one question", variant: "destructive" });
      return;
    }

    setCustomQuestions(selectedQuestions, true);
    toast({ title: `Using ${selectedQuestions.length} questions for the game!` });
    navigate("/lobby");
  };

  const handleSaveQuestions = () => {
    const validQuestions = questions.filter(q => 
      q.question.trim() && 
      q.options.every(opt => opt.trim())
    );
    
    if (validQuestions.length === 0) {
      toast({ title: "Please add at least one complete question", variant: "destructive" });
      return;
    }

    const numberedQuestions = validQuestions.map((q, i) => ({ ...q, id: i + 1 }));
    setCustomQuestions(numberedQuestions, true);
    toast({ title: `Saved ${numberedQuestions.length} custom questions!` });
    navigate("/lobby");
  };

  const handleUseDefault = () => {
    setCustomQuestions([], false);
    navigate("/lobby");
  };

  if (!room) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => mode === "select" ? navigate("/lobby") : setMode("select")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Question Builder</h1>
            <p className="text-muted-foreground">Create or select questions for your quiz</p>
          </div>
        </div>

        {mode === "select" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card 
              className="p-6 cursor-pointer hover:border-primary transition-colors"
              onClick={() => setMode("library")}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Library className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Question Library</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose from {savedQuestionsList.length} saved questions
                  </p>
                </div>
              </div>
            </Card>

            <Card 
              className="p-6 cursor-pointer hover:border-primary transition-colors"
              onClick={() => setMode("upload")}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-answer-blue/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-answer-blue" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Import Questions</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload PDF or paste formatted text
                  </p>
                </div>
              </div>
            </Card>

            <Card 
              className="p-6 cursor-pointer hover:border-primary transition-colors"
              onClick={() => { setMode("manual"); addManualQuestion(); }}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Edit2 className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Manual Entry</h3>
                  <p className="text-sm text-muted-foreground">
                    Create questions one by one
                  </p>
                </div>
              </div>
            </Card>

            <Card 
              className="p-6 cursor-pointer hover:border-primary transition-colors"
              onClick={handleUseDefault}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Default Questions</h3>
                  <p className="text-sm text-muted-foreground">
                    Use 3 built-in anatomy questions
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {mode === "library" && (
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Question Library</h2>
                <p className="text-sm text-muted-foreground">
                  {savedQuestionsList.length} questions saved
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label>Use up to:</Label>
                  <Input
                    type="number"
                    min={1}
                    max={savedQuestionsList.length || 50}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">questions</span>
                </div>
              </div>
            </div>

            {savedQuestionsList.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No saved questions yet</p>
                <Button onClick={() => setMode("upload")} variant="outline" className="mt-4">
                  Import Questions
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedQuestionIds.size === savedQuestionsList.length}
                    onCheckedChange={selectAllQuestions}
                  />
                  <Label className="cursor-pointer" onClick={selectAllQuestions}>
                    Select All ({selectedQuestionIds.size} selected)
                  </Label>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {savedQuestionsList.map((question) => (
                    <div 
                      key={question.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        selectedQuestionIds.has(question.id) 
                          ? "border-primary bg-primary/5" 
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedQuestionIds.has(question.id)}
                          onCheckedChange={() => toggleQuestionSelection(question.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 bg-muted rounded">
                              {question.category}
                            </span>
                          </div>
                          <p className="font-medium">{question.question}</p>
                          <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
                            {question.options.map((opt, i) => (
                              <span 
                                key={i} 
                                className={i === question.correctIndex ? "text-green-600 font-medium" : "text-muted-foreground"}
                              >
                                {String.fromCharCode(65 + i)}. {opt}
                              </span>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSavedQuestion(question.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setMode("select")} className="flex-1">
                    Back
                  </Button>
                  <Button 
                    onClick={handleUseSelectedQuestions} 
                    className="flex-1" 
                    disabled={selectedQuestionIds.size === 0}
                  >
                    Use {Math.min(selectedQuestionIds.size, questionCount)} Questions
                  </Button>
                </div>
              </>
            )}
          </Card>
        )}

        {mode === "upload" && (
          <Card className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Upload PDF or paste formatted questions</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    disabled={isLoading}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Click to upload PDF or TXT file
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Max 10MB
                    </p>
                  </label>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or paste formatted text
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Textarea
                  placeholder={`Format your questions like this:

Q: What is the largest bone in the human body?
A) Skull
B) Femur*
C) Tibia
D) Humerus

(Mark the correct answer with an asterisk *)`}
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  {sourceText.length} characters
                </p>
              </div>

              <Button
                onClick={handleParseFromText}
                disabled={sourceText.length < 20 || isLoading}
                className="w-full gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Parsing questions...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Parse Questions
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {(mode === "manual" || mode === "review") && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {questions.length} Question{questions.length !== 1 ? "s" : ""}
              </h2>
              <div className="flex gap-2">
                <Button onClick={addManualQuestion} variant="outline" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Question
                </Button>
              </div>
            </div>

            {questions.map((question, index) => (
              <Card key={index} className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Q{index + 1}
                      </span>
                      {question.category && (
                        <span className="text-xs px-2 py-1 bg-muted rounded">
                          {question.category}
                        </span>
                      )}
                    </div>

                    {editingIndex === index ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Question</Label>
                          <Textarea
                            value={question.question}
                            onChange={(e) => updateQuestion(index, { question: e.target.value })}
                            placeholder="Enter your question..."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Input
                            value={question.category}
                            onChange={(e) => updateQuestion(index, { category: e.target.value })}
                            placeholder="e.g., Bones, Muscles, Nerves"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Options (click to set as correct answer)</Label>
                          {question.options.map((opt, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant={question.correctIndex === optIndex ? "default" : "outline"}
                                size="icon"
                                className="shrink-0"
                                onClick={() => updateQuestion(index, { correctIndex: optIndex })}
                              >
                                {question.correctIndex === optIndex ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <span className="text-xs">{String.fromCharCode(65 + optIndex)}</span>
                                )}
                              </Button>
                              <Input
                                value={opt}
                                onChange={(e) => {
                                  const newOptions = [...question.options];
                                  newOptions[optIndex] = e.target.value;
                                  updateQuestion(index, { options: newOptions });
                                }}
                                placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                              />
                            </div>
                          ))}
                        </div>

                        <Button 
                          onClick={() => setEditingIndex(null)} 
                          size="sm"
                        >
                          Done Editing
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="font-medium">{question.question || "No question text"}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {question.options.map((opt, optIndex) => (
                            <div 
                              key={optIndex}
                              className={`text-sm p-2 rounded ${
                                question.correctIndex === optIndex 
                                  ? "bg-green-500/10 border border-green-500/30" 
                                  : "bg-muted"
                              }`}
                            >
                              <span className="font-medium mr-2">
                                {String.fromCharCode(65 + optIndex)}.
                              </span>
                              {opt || "Empty option"}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {editingIndex !== index && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingIndex(index)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteQuestion(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {questions.length === 0 && (
              <Card className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No questions yet</p>
                <Button onClick={addManualQuestion} variant="outline" className="mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  Add Your First Question
                </Button>
              </Card>
            )}

            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={() => setMode("select")} className="flex-1">
                Back
              </Button>
              <Button 
                variant="secondary"
                onClick={handleSaveToLibrary} 
                className="flex-1 gap-2" 
                disabled={questions.length === 0 || isLoading}
              >
                <Save className="w-4 h-4" />
                Save to Library
              </Button>
              <Button onClick={handleSaveQuestions} className="flex-1" disabled={questions.length === 0}>
                Use Now
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

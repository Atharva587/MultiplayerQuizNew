import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useGame } from "@/lib/gameContext";
import { useToast } from "@/hooks/use-toast";
import type { Question, QuestionWithFolder, Folder } from "@shared/schema";
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
  Save,
  FolderPlus,
  FolderOpen,
  Move
} from "lucide-react";

type Mode = "select" | "upload" | "manual" | "review" | "library";

export default function QuestionBuilder() {
  const [mode, setMode] = useState<Mode>("select");
  const [sourceText, setSourceText] = useState("");
  const [questionCount, setQuestionCount] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [savedQuestionsList, setSavedQuestionsList] = useState<QuestionWithFolder[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<number>>(new Set());
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [savingToFolderId, setSavingToFolderId] = useState<number | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveToFolderId, setMoveToFolderId] = useState<number | null>(null);

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

  const loadFolders = async () => {
    try {
      const response = await fetch("/api/folders");
      const data = await response.json();
      if (response.ok) {
        setFolders(data.folders);
      }
    } catch (error) {
      console.error("Failed to load folders:", error);
    }
  };

  const loadSavedQuestions = async (folderId?: number | null) => {
    try {
      let url = "/api/saved-questions";
      if (folderId) {
        url += `?folderId=${folderId}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok) {
        setSavedQuestionsList(data.questions);
      }
    } catch (error) {
      console.error("Failed to load saved questions:", error);
    }
  };

  useEffect(() => {
    loadFolders();
    loadSavedQuestions();
  }, []);

  useEffect(() => {
    loadSavedQuestions(selectedFolderId);
  }, [selectedFolderId]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast({ title: "Please enter a folder name", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName, description: newFolderDesc }),
      });

      if (response.ok) {
        toast({ title: "Folder created!" });
        setNewFolderName("");
        setNewFolderDesc("");
        setShowFolderDialog(false);
        await loadFolders();
      }
    } catch (error) {
      toast({ title: "Failed to create folder", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFolder = async (folderId: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Folder deleted" });
        if (selectedFolderId === folderId) {
          setSelectedFolderId(null);
        }
        await loadFolders();
        await loadSavedQuestions(selectedFolderId === folderId ? null : selectedFolderId);
      }
    } catch (error) {
      toast({ title: "Failed to delete folder", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveQuestions = async () => {
    if (selectedQuestionIds.size === 0) {
      toast({ title: "Please select questions to move", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/saved-questions/bulk-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionIds: Array.from(selectedQuestionIds),
          folderId: moveToFolderId
        }),
      });

      if (response.ok) {
        toast({ title: `Moved ${selectedQuestionIds.size} questions!` });
        setSelectedQuestionIds(new Set());
        setShowMoveDialog(false);
        await loadSavedQuestions(selectedFolderId);
      }
    } catch (error) {
      toast({ title: "Failed to move questions", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

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
        body: JSON.stringify({ questions: validQuestions, folderId: savingToFolderId }),
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
        await loadSavedQuestions(selectedFolderId);
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
      <div className="max-w-5xl mx-auto space-y-6">
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
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-semibold">Question Library</h2>
                <p className="text-sm text-muted-foreground">
                  {savedQuestionsList.length} questions {selectedFolderId ? "in folder" : "total"}
                </p>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label>Use up to:</Label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value) || 100)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">questions</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <FolderOpen className="w-5 h-5 text-muted-foreground" />
                <Select
                  value={selectedFolderId?.toString() || "all"}
                  onValueChange={(v) => setSelectedFolderId(v === "all" ? null : parseInt(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Questions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Questions</SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id.toString()}>
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <FolderPlus className="w-4 h-4" />
                    New Folder
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Folder Name</Label>
                      <Input
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="e.g., Upper Limb, Lower Limb"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description (optional)</Label>
                      <Textarea
                        value={newFolderDesc}
                        onChange={(e) => setNewFolderDesc(e.target.value)}
                        placeholder="Brief description of this folder"
                      />
                    </div>
                    <Button
                      onClick={handleCreateFolder}
                      disabled={isLoading || !newFolderName.trim()}
                      className="w-full"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Folder"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {selectedQuestionIds.size > 0 && (
                <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Move className="w-4 h-4" />
                      Move Selected ({selectedQuestionIds.size})
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Move Questions to Folder</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <Select
                        value={moveToFolderId?.toString() || "none"}
                        onValueChange={(v) => setMoveToFolderId(v === "none" ? null : parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select folder" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Folder (Unfiled)</SelectItem>
                          {folders.map((folder) => (
                            <SelectItem key={folder.id} value={folder.id.toString()}>
                              {folder.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleMoveQuestions}
                        disabled={isLoading}
                        className="w-full"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Move ${selectedQuestionIds.size} Questions`}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {folders.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${selectedFolderId === folder.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                      }`}
                    onClick={() => setSelectedFolderId(selectedFolderId === folder.id ? null : folder.id)}
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span className="text-sm font-medium">{folder.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-5 h-5 ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {savedQuestionsList.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {selectedFolderId ? "No questions in this folder" : "No saved questions yet"}
                </p>
                <Button onClick={() => setMode("upload")} variant="outline" className="mt-4">
                  Import Questions
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedQuestionIds.size === savedQuestionsList.length && savedQuestionsList.length > 0}
                    onCheckedChange={selectAllQuestions}
                  />
                  <Label className="cursor-pointer" onClick={selectAllQuestions}>
                    Select All ({selectedQuestionIds.size} selected)
                  </Label>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {savedQuestionsList.map((question) => (
                    <div
                      key={question.id}
                      className={`p-4 rounded-lg border transition-colors ${selectedQuestionIds.has(question.id)
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
                          <p className="font-medium text-sm leading-relaxed">{question.question}</p>
                          <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
                            {question.options.map((opt, i) => (
                              <span
                                key={i}
                                className={`${i === question.correctIndex ? "text-green-600 font-medium" : "text-muted-foreground"} truncate`}
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
                  className="min-h-[500px] font-mono text-sm"
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
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-lg font-semibold">
                {questions.length} Question{questions.length !== 1 ? "s" : ""}
              </h2>
              <div className="flex gap-2 flex-wrap">
                <Select
                  value={savingToFolderId?.toString() || "none"}
                  onValueChange={(v) => setSavingToFolderId(v === "none" ? null : parseInt(v))}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Save to folder..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Folder</SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id.toString()}>
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                            className="min-h-[100px]"
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
                        <p className="font-medium leading-relaxed">{question.question || "No question text"}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {question.options.map((opt, optIndex) => (
                            <div
                              key={optIndex}
                              className={`text-sm p-2 rounded ${question.correctIndex === optIndex
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

            <div className="flex gap-4 pt-4 flex-wrap">
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

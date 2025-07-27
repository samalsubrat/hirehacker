"use client";
import React, { useState, useRef } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { CodeEditor, CodeEditorRef } from "@/components/code-editor";
import Nav from "./Nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LetterText, Play, RotateCcw, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const QUESTIONS = [
  {
    title: "1. Prime Number",
    description: "Write a function to check if a number is prime.",
    submissions: ["Submission 1 for Q1", "Submission 2 for Q1"],
    code: `def isPrime(n):
    if n <= 1:
        return False
    if n <= 3:
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    i = 5
    while i * i <= n:
        if n % i == 0 or n % (i + 2) == 0:
            return False
        i += 6
    return True

# Test the function
n = int(input())
print(isPrime(n))`,
    testCases: [
      { name: "Case 1", input: "7", expectedOutput: "True" },
      { name: "Case 2", input: "10", expectedOutput: "False" },
      { name: "Case 3", input: "2", expectedOutput: "True" },
    ],
  },
  {
    title: "2. Fibonacci",
    description: "Write a function to return the nth Fibonacci number.",
    submissions: ["Submission 1 for Q2"],
    code: `def fibonacci(n):
    if n <= 1:
        return n
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b

# Test the function
n = int(input())
print(fibonacci(n))`,
    testCases: [
      { name: "Case 1", input: "5", expectedOutput: "5" },
      { name: "Case 2", input: "8", expectedOutput: "21" },
      { name: "Case 3", input: "0", expectedOutput: "0" },
    ],
  },
  {
    title: "3. Palindrome",
    description: "Check if a string is a palindrome.",
    submissions: ["Submission 1 for Q3"],
    code: `def isPalindrome(s):
    s = s.lower().replace(' ', '')
    return s == s[::-1]

# Test the function
s = input().strip()
print(isPalindrome(s))`,
    testCases: [
      { name: "Case 1", input: "racecar", expectedOutput: "True" },
      { name: "Case 2", input: "hello", expectedOutput: "False" },
      { name: "Case 3", input: "A man a plan a canal Panama", expectedOutput: "True" },
    ],
  },
  // MCQ questions
  {
    title: "4. What is the output of 2 + 2?",
    mcq: {
      question: "What is the output of 2 + 2?",
      options: ["3", "4", "5", "22"],
      answer: 1,
    },
  },
  {
    title: "5. Which is a JavaScript framework?",
    mcq: {
      question: "Which is a JavaScript framework?",
      options: ["React", "Laravel", "Django", "Rails"],
      answer: 0,
    },
  },
  {
    title: "6. What does CSS stand for?",
    mcq: {
      question: "What does CSS stand for?",
      options: [
        "Cascading Style Sheets",
        "Computer Style Sheets",
        "Creative Style System",
        "Colorful Style Sheets",
      ],
      answer: 0,
    },
  },
  {
    title: "7. Which HTML tag is used for a hyperlink?",
    mcq: {
      question: "Which HTML tag is used for a hyperlink?",
      options: ["<a>", "<link>", "<href>", "<hyperlink>"],
      answer: 0,
    },
  },
  // Subjective questions
  {
    title: "8. Explain the concept of closures in JavaScript.",
    subjective: {
      question: "Explain the concept of closures in JavaScript.",
      placeholder: "Type your answer here...",
    },
  },
  {
    title: "9. What are the advantages of using React?",
    subjective: {
      question: "What are the advantages of using React?",
      placeholder: "Type your answer here...",
    },
  },
  {
    title: "10. Describe the lifecycle of a React component.",
    subjective: {
      question: "Describe the lifecycle of a React component.",
      placeholder: "Type your answer here...",
    },
  },
];

// Interface for storing test case results
interface TestCaseResult {
  testCase: string;
  input: string;
  expectedOutput: string;
  actualOutput: string | null;
  status: string;
  isCorrect: boolean | null;
  error: string | null;
}

const Page = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [activeTab, setActiveTab] = useState<"description" | "submissions">("description");
  const [codes, setCodes] = useState(QUESTIONS.map((q) => q.code || ""));
  const [languages, setLanguages] = useState(QUESTIONS.map(() => "python"));
  const [mcqAnswers, setMcqAnswers] = useState(Array(QUESTIONS.length).fill(null));
  const [subjectiveAnswers, setSubjectiveAnswers] = useState(Array(QUESTIONS.length).fill(""));
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const codeEditorRef = useRef<CodeEditorRef>(null);

  // Map UI language to Judge0 language_id
  const languageMap: Record<string, number> = {
    python: 71, // Python 3
    java: 62,   // Java
    c: 50,      // C (GCC)
  };

  // Enhanced Judge0 API call with proper test case handling
  const runCode = async () => {
    const currentQ = QUESTIONS[currentQuestion];
    if (!currentQ.testCases) return;

    setIsRunning(true);
    setTestResults([]);
    
    const source_code = codes[currentQuestion];
    const language_id = languageMap[languages[currentQuestion]];
    const newResults: TestCaseResult[] = [];

    for (let i = 0; i < currentQ.testCases.length; i++) {
      const testCase = currentQ.testCases[i];
      let actualOutput: string | null = null;
      let status = "Error";
      let isCorrect: boolean | null = null;
      let error: string | null = null;

      try {
        const response = await fetch("/api/judge0", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: source_code,
            language_id: language_id,
            stdin: testCase.input,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          actualOutput = data.stdout ? data.stdout.trim() : data.compile_output || data.stderr || "No output";
          status = data.status?.description || "Unknown Status";

          if (data.status?.id === 3) { // Accepted
            isCorrect = actualOutput === testCase.expectedOutput;
          } else {
            isCorrect = false;
            error = data.compile_output || data.stderr || data.message || "Execution failed.";
          }
        } else {
          error = data.details?.message || data.error || "Failed to execute code.";
          status = "API Error";
          isCorrect = false;
        }
      } catch (err) {
        console.error("Error running code:", err);
        error = (err as Error).message || "Network or unexpected error.";
        status = "Client Error";
        isCorrect = false;
      }

      newResults.push({
        testCase: testCase.name,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput,
        status,
        isCorrect,
        error,
      });
    }

    setTestResults(newResults);
    setIsRunning(false);
  };

  const q = QUESTIONS[currentQuestion];
  const isMcq = !!q.mcq;
  const isSubjective = !!q.subjective;

  return (
    <>
      <Nav />
      <section className="flex justify-between h-screen p-1.5 overflow-hidden pt-12">
        <ResizablePanelGroup
          direction="horizontal"
          className="w-full h-full min-h-0"
        >
          {/* Question navigation */}
          <div className="border rounded-lg h-full w-10 mr-0.5 flex flex-col">
            <h1 className="flex items-center justify-center p-2 border-b flex-shrink-0">
              Q
            </h1>
            <ul className="flex flex-col gap-2 items-center py-2">
              {QUESTIONS.map((_, idx) => (
                <li
                  key={idx}
                  className={`cursor-pointer rounded-full w-6 flex flex-col items-center justify-center ${
                    currentQuestion === idx
                      ? "text-black font-medium"
                      : "font-normal text-gray-500"
                  }`}
                  onClick={() => {
                    setCurrentQuestion(idx);
                    setActiveTab("description");
                    setTestResults([]); // Clear results when switching questions
                  }}
                >
                  {idx + 1}
                  {idx < QUESTIONS.length - 1 && (
                    <div className="w-4 h-px bg-gray-300 p-[0.5px] rounded-full mt-2" />
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Main panel: Coding, MCQ, or Subjective */}
          {!isMcq && !isSubjective ? (
            <>
              <ResizablePanel
                defaultSize={45}
                minSize={20}
                className="border rounded-lg h-full min-h-0"
              >
                <div className="h-full flex flex-col min-h-0">
                  <h1 className="px-4 py-2 border-b">
                    <ul className="flex gap-2 items-center">
                      <li
                        className={`cursor-pointer ${
                          activeTab === "description"
                            ? "font-medium "
                            : "font-normal text-gray-500"
                        }`}
                        onClick={() => setActiveTab("description")}
                      >
                        Description
                      </li>
                      <div className="h-4 w-px bg-gray-300 p-[0.5px] rounded-full" />
                      <li
                        className={`cursor-pointer ${
                          activeTab === "submissions"
                            ? "font-medium "
                            : "font-normal text-gray-500"
                        }`}
                        onClick={() => setActiveTab("submissions")}
                      >
                        Submissions
                      </li>
                    </ul>
                  </h1>
                  <div className="p-4 flex-1 min-h-0 overflow-auto">
                    {activeTab === "description" && (
                      <div>
                        <h1 className="font-medium text-xl pb-2">{q.title}</h1>
                        <p>{q.description}</p>
                      </div>
                    )}
                    {activeTab === "submissions" && (
                      <div>
                        <h2 className="font-medium pb-2">Submissions</h2>
                        <ul className="list-disc pl-5">
                          {q.submissions.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle
                withHandle
                className="hover:border-2 border-yellow-400 hidden sm:flex"
              />

              {/* Code editor and test cases */}
              <ResizablePanel
                defaultSize={50}
                minSize={30}
                className="hidden sm:block overflow-hidden"
              >
                <ResizablePanelGroup
                  direction="vertical"
                  className="h-full min-h-0"
                >
                  <ResizablePanel
                    defaultSize={70}
                    minSize={40}
                    className="border rounded-lg overflow-hidden"
                  >
                    <div className="flex flex-col h-full min-h-0">
                      <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0 ">
                        <h1>Code</h1>
                        <div className="flex items-center justify-between -mr-2 gap-1">
                          <Button
                            className="bg-gray-100 hover:bg-gray-300  group flex items-center justify-center rounded-sm text-muted-foreground "
                            size="sm"
                            variant="ghost"
                            onClick={runCode}
                            disabled={isRunning}
                          >
                            {isRunning ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Play className="size-4 group-hover:fill-accent-foreground" />
                            )}
                            {isRunning && <span className="ml-2 text-xs">Running...</span>}
                          </Button>
                          <Button
                            className="bg-gray-100 hover:bg-gray-300  group flex items-center justify-center rounded-sm text-green-600 hover:text-green-800"
                            size="sm"
                            variant="ghost"
                          >
                            <Upload className="size-4" />
                            <h1 className="pb-1">Submit</h1>
                          </Button>
                        </div>
                      </div>
                      <div className="px-2 py-1 mb-1 border-b flex-shrink-0 text-sm flex items-center justify-between">
                        <Select
                          value={languages[currentQuestion]}
                          onValueChange={(val) => {
                            setLanguages((langs) => {
                              const newLangs = [...langs];
                              newLangs[currentQuestion] = val;
                              return newLangs;
                            });
                          }}
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Python" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="python">Python</SelectItem>
                            <SelectItem value="java">Java</SelectItem>
                            <SelectItem value="c">C</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center text-muted-foreground">
                          {/* format code  */}
                          <Button
                            className="font-normal"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              codeEditorRef.current?.formatCode();
                            }}
                          >
                            <LetterText className="size-4" />
                          </Button>

                          {/* reset  */}
                          <Button
                            className="font-normal"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCodes((codes) => {
                                const newCodes = [...codes];
                                newCodes[currentQuestion] = QUESTIONS[currentQuestion].code || "";
                                return newCodes;
                              });
                            }}
                          >
                            <RotateCcw className="size-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex-1 min-h-0 overflow-auto">
                        <CodeEditor
                          ref={codeEditorRef}
                          language={languages[currentQuestion]}
                          value={codes[currentQuestion]}
                          onChange={(val) => {
                            setCodes((codes) => {
                              const newCodes = [...codes];
                              newCodes[currentQuestion] = val || "";
                              return newCodes;
                            });
                          }}
                        />
                      </div>
                    </div>
                  </ResizablePanel>
                  <ResizableHandle
                    withHandle
                    className="hover:border-2 rounded-2xl border-yellow-400"
                  />
                  <ResizablePanel
                    defaultSize={30}
                    minSize={10}
                    className="border rounded-lg overflow-hidden"
                  >
                    <div className="h-full flex flex-col">
                      <h1 className="px-4 py-2 border-b">Test Cases & Results</h1>
                      <div className="flex-1 overflow-auto">
                        <Tabs defaultValue="cases" className="p-2">
                          <TabsList>
                            <TabsTrigger value="cases">Test Cases</TabsTrigger>
                            <TabsTrigger value="results">Results</TabsTrigger>
                          </TabsList>
                          <TabsContent value="cases" className="space-y-2">
                            {q.testCases?.map((tc, idx) => (
                              <div key={idx} className="border p-2 rounded bg-gray-50">
                                <div className="font-medium text-sm">{tc.name}</div>
                                <div className="text-xs text-gray-600">
                                  <div><strong>Input:</strong> {tc.input}</div>
                                  <div><strong>Expected:</strong> {tc.expectedOutput}</div>
                                </div>
                              </div>
                            ))}
                          </TabsContent>
                          <TabsContent value="results" className="space-y-2">
                            {testResults.length === 0 && !isRunning && (
                              <p className="text-center text-gray-500 text-sm p-4">
                                Run your code to see results
                              </p>
                            )}
                            {testResults.map((result, idx) => (
                              <div key={idx} className="border p-2 rounded bg-gray-50">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-medium text-sm">{result.testCase}</span>
                                  {result.isCorrect !== null && (
                                    <Badge
                                      className={cn(
                                        result.isCorrect 
                                          ? "bg-green-500 hover:bg-green-600" 
                                          : "bg-red-500 hover:bg-red-600",
                                        "text-white text-xs"
                                      )}
                                    >
                                      {result.isCorrect ? "✅" : "❌"}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600 space-y-1">
                                  <div><strong>Input:</strong> {result.input}</div>
                                  <div><strong>Expected:</strong> {result.expectedOutput}</div>
                                  <div><strong>Actual:</strong> {result.actualOutput || "N/A"}</div>
                                  {result.error && (
                                    <div className="text-red-600"><strong>Error:</strong> {result.error}</div>
                                  )}
                                  <div className="text-gray-500">Status: {result.status}</div>
                                </div>
                              </div>
                            ))}
                          </TabsContent>
                        </Tabs>
                      </div>
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
            </>
          ) : isMcq ? (
            // MCQ UI
            <ResizablePanel
              defaultSize={95}
              minSize={40}
              className="border rounded-lg h-full min-h-0"
            >
              <div>
                <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
                  <h1>MCQs</h1>
                </div>
                <div className="p-4 ">
                  <h1 className="font-medium text-xl pb-4">{q.title}</h1>
                  <form>
                    <fieldset>
                      <legend className="mb-4 font-semibold">
                        {q.mcq.question}
                      </legend>
                      <div className="flex flex-col gap-3">
                        {q.mcq.options.map((option: string, idx: number) => (
                          <label
                            key={idx}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-colors w-1/2
                            ${
                              mcqAnswers[currentQuestion] === idx
                                ? "border-green-500 bg-green-50 text-green-800 shadow-md"
                                : "border-gray-200 bg-white text-gray-800"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`mcq-${currentQuestion}`}
                              value={idx}
                              checked={mcqAnswers[currentQuestion] === idx}
                              onChange={() => {
                                setMcqAnswers((ans) => {
                                  const arr = [...ans];
                                  arr[currentQuestion] = idx;
                                  return arr;
                                });
                              }}
                              className="sr-only"
                            />
                            <div className={`size-4 border-1 rounded-full flex items-center justify-center
                              ${
                                 mcqAnswers[currentQuestion] === idx
                                   ? "border-green-500"
                                   : "border-gray-300"
                               }`}>
                              <span
                                className={`size-2 rounded-full flex-shrink-0 flex items-center justify-center
                                 ${
                                 mcqAnswers[currentQuestion] === idx
                                   ? "bg-green-500 border-green-500"
                                   : "bg-white border-gray-300"
                               }`}
                              />
                            </div>
                            <span className="text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </form>
                </div>
              </div>
            </ResizablePanel>
          ) : (
            // Subjective UI
            <ResizablePanel
              defaultSize={95}
              minSize={40}
              className="border rounded-lg h-full min-h-0"
            >
              <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
                <h1>Subjective</h1>
              </div>
              <div className="p-4">
                <h1 className="font-medium text-xl pb-4 ">{q.title}</h1>
                <form>
                  <fieldset>
                    <legend className="mb-4 font-semibold">
                      {q.subjective.question}
                    </legend>
                    <textarea
                      className="w-full min-h-[120px] border rounded-lg p-2 text-base focus:outline-none focus:ring-1 focus:shadow-md"
                      placeholder={q.subjective.placeholder}
                      value={subjectiveAnswers[currentQuestion]}
                      onChange={(e) => {
                        setSubjectiveAnswers((ans) => {
                          const arr = [...ans];
                          arr[currentQuestion] = e.target.value;
                          return arr;
                        });
                      }}
                    />
                  </fieldset>
                </form>
              </div>
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </section>
    </>
  );
};

export default Page;
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
import { LetterText, Play, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

const QUESTIONS = [
  {
    title: "1. Prime Number",
    description: "Write a function to check if a number is prime.",
    submissions: ["Submission 1 for Q1", "Submission 2 for Q1"],
    code: "",
    testCases: [
      { name: "Case 1", content: "n = 7" },
      { name: "Case 2", content: "n = 10" },
    ],
  },
  {
    title: "2. Fibonacci",
    description: "Write a function to return the nth Fibonacci number.",
    submissions: ["Submission 1 for Q2"],
    code: "",
    testCases: [
      { name: "Case 1", content: "n = 5" },
      { name: "Case 2", content: "n = 8" },
    ],
  },
  {
    title: "3. Palindrome",
    description: "Check if a string is a palindrome.",
    submissions: ["Submission 1 for Q3"],
    code: "",
    testCases: [
      { name: "Case 1", content: "s = 'racecar'" },
      { name: "Case 2", content: "s = 'hello'" },
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

const Page = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [activeTab, setActiveTab] = useState<"description" | "submissions">("description");
  const [codes, setCodes] = useState(QUESTIONS.map((q) => q.code || ""));
  const [languages, setLanguages] = useState(QUESTIONS.map(() => "python"));
  const [mcqAnswers, setMcqAnswers] = useState(Array(QUESTIONS.length).fill(null));
  const [subjectiveAnswers, setSubjectiveAnswers] = useState(Array(QUESTIONS.length).fill(""));
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const codeEditorRef = useRef<CodeEditorRef>(null);

  // Map UI language to Judge0 language_id
  const languageMap: Record<string, number> = {
    python: 71, // Python 3
    java: 62,   // Java
    c: 50,      // C (GCC)
  };

  // Call Judge0 API
  const runCode = async () => {
    setIsRunning(true);
    setOutput("");
    const source_code = codes[currentQuestion];
    const language_id = languageMap[languages[currentQuestion]];
    // Use first test case as input if available
    const input = QUESTIONS[currentQuestion].testCases?.[0]?.content?.replace(/\s*\=.*$/, (m) => m.split('=')[1].trim()) || "";
    try {
      const res = await fetch("http://192.168.29.77:2358/submissions?base64_encoded=false&wait=true", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          source_code,
          language_id,
          stdin: input,
        })
      });
      const data = await res.json();
      setOutput(data.stdout || data.stderr || data.compile_output || "No output");
    } catch (err) {
      setOutput("Error running code");
    }
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
                            <Play className="size-4 group-hover:fill-accent-foreground" />
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
                                newCodes[currentQuestion] = "";
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
                        {/* Output/result area */}
                        {output && (
                          <div className="mt-2 p-2 bg-gray-100 rounded text-sm whitespace-pre-wrap border">
                            <strong>Output:</strong>
                            <div>{output}</div>
                          </div>
                        )}
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
                      <h1 className="px-4 py-2 border-b">Test Cases</h1>
                      <Tabs defaultValue="case1" className="p-2">
                        <TabsList>
                          {q.testCases.map((tc, idx) => (
                            <TabsTrigger key={idx} value={`case${idx + 1}`}>
                              {tc.name}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        {q.testCases.map((tc, idx) => (
                          <TabsContent key={idx} value={`case${idx + 1}`}>
                            {tc.content}
                          </TabsContent>
                        ))}
                      </Tabs>
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

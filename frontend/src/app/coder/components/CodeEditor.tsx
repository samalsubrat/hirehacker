"use client";
import React, { useRef } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { CodeEditor, CodeEditorRef } from "@/components/code-editor";
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
import { Question, TestCaseResult } from "../types";

interface CodingQuestionSectionProps {
  question: Question;
  code: string;
  language: string;
  testResults: TestCaseResult[];
  isRunning: boolean;
  activeTab: "description" | "submissions";
  onCodeChange: (code: string) => void;
  onLanguageChange: (language: string) => void;
  onRunCode: () => void;
  onResetCode: () => void;
  onTabChange: (tab: "description" | "submissions") => void;
}

export const CodeEditorSection: React.FC<CodingQuestionSectionProps> = ({
  question,
  code,
  language,
  testResults,
  isRunning,
  activeTab,
  onCodeChange,
  onLanguageChange,
  onRunCode,
  onResetCode,
  onTabChange,
}) => {
  const codeEditorRef = useRef<CodeEditorRef>(null);

  return (
    <>
      {/* Question Description Panel */}
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
                    ? "font-medium"
                    : "font-normal text-gray-500"
                }`}
                onClick={() => onTabChange("description")}
              >
                Description
              </li>
              <div className="h-4 w-px bg-gray-300 p-[0.5px] rounded-full" />
              <li
                className={`cursor-pointer ${
                  activeTab === "submissions"
                    ? "font-medium"
                    : "font-normal text-gray-500"
                }`}
                onClick={() => onTabChange("submissions")}
              >
                Submissions
              </li>
            </ul>
          </h1>
          <div className="p-4 flex-1 min-h-0 overflow-auto">
            {activeTab === "description" && (
              <div>
                <h1 className="font-medium text-xl pb-2">{question.title}</h1>
                <p>{question.description}</p>
              </div>
            )}
            {activeTab === "submissions" && (
              <div>
                <h2 className="font-medium pb-2">Submissions</h2>
                <ul className="list-disc pl-5">
                  {question.submissions?.map((s, i) => (
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

      {/* Code Editor and Test Cases Panel */}
      <ResizablePanel
        defaultSize={50}
        minSize={30}
        className="hidden sm:block overflow-hidden"
      >
        <ResizablePanelGroup direction="vertical" className="h-full min-h-0">
          <ResizablePanel
            defaultSize={70}
            minSize={40}
            className="border rounded-lg overflow-hidden"
          >
            <div className="flex flex-col h-full min-h-0">
              <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
                <h1>Code</h1>
                <div className="flex items-center justify-between -mr-2 gap-1">
                  <Button
                    className="bg-gray-100 hover:bg-gray-300 group flex items-center justify-center rounded-sm text-muted-foreground"
                    size="sm"
                    variant="ghost"
                    onClick={onRunCode}
                    disabled={isRunning}
                  >
                    {isRunning ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Play className="size-4 group-hover:fill-accent-foreground" />
                    )}
                    {isRunning && (
                      <span className="ml-2 text-xs">Running...</span>
                    )}
                  </Button>
                  <Button
                    className="bg-gray-100 hover:bg-gray-300 group flex items-center justify-center rounded-sm text-green-600 hover:text-green-800"
                    size="sm"
                    variant="ghost"
                  >
                    <Upload className="size-4" />
                    <h1>Submit</h1>
                  </Button>
                </div>
              </div>
              <div className="px-2 py-1 mb-1 border-b flex-shrink-0 text-sm flex items-center justify-between">
                <Select value={language} onValueChange={onLanguageChange}>
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
                  <Button
                    className="font-normal"
                    variant="ghost"
                    size="sm"
                    onClick={onResetCode}
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-auto">
                <CodeEditor
                  ref={codeEditorRef}
                  language={language}
                  value={code}
                  onChange={(val) => onCodeChange(val || "")}
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
              <h1 className="px-4 py-2 border-b">Test Cases</h1>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <Tabs defaultValue="case1" className="p-2">
                  <TabsList>
                    {question.testCases?.map((tc, idx) => (
                      <TabsTrigger key={idx} value={`case${idx + 1}`}>
                        {tc.name}
                        {testResults.length > 0 && testResults[idx] && (
                          <span className="ml-1">
                            {testResults[idx].isCorrect ? "✅" : "❌"}
                          </span>
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {question.testCases?.map((tc, idx) => (
                    <TabsContent
                      key={idx}
                      value={`case${idx + 1}`}
                      className="space-y-3"
                    >
                      <div>
                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Input:</strong> {tc.input}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Expected Output:</strong> {tc.expectedOutput}
                        </div>
                        {testResults.length > 0 && testResults[idx] && (
                          <div className="space-y-2">
                            <div className="text-sm">
                              <strong>Actual Output:</strong>
                              <div
                                className={`mt-1 p-2 rounded border text-xs font-mono ${
                                  testResults[idx].isCorrect
                                    ? "bg-green-50 border-green-200 text-green-800"
                                    : "bg-red-50 border-red-200 text-red-800"
                                }`}
                              >
                                {testResults[idx].actualOutput || "No output"}
                              </div>
                            </div>
                            {testResults[idx].error && (
                              <div className="text-sm">
                                <strong className="text-red-600">Error:</strong>
                                <div className="mt-1 p-2 rounded border bg-red-50 border-red-200 text-red-800 text-xs font-mono">
                                  {testResults[idx].error}
                                </div>
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              <strong>Status:</strong> {testResults[idx].status}
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </>
  );
};
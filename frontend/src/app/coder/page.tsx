"use client";
import React, { useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { CodeEditor } from "@/components/code-editor";
import Nav from "./Nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, LetterText, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const Page = () => {
  const [activeTab, setActiveTab] = useState<"description" | "submissions">(
    "description"
  );

  return (
    <>
      <Nav />
      <section className="flex justify-between h-screen p-1.5 overflow-hidden pt-12">
        <ResizablePanelGroup direction="horizontal" className="w-full">
          {/* question numbers  */}
          <div className="border rounded-lg h-full w-10 mr-0.5">
            <h1 className="flex items-center justify-center p-2 border-b flex-shrink-0">
              Q
            </h1>
            <h1 className="py-2">
              <ul className="flex flex-col gap-2 items-center">
                <li
                  className={`cursor-pointer ${
                    activeTab === "description" ? "font-medium" : "font-normal"
                  }`}
                  onClick={() => setActiveTab("description")}
                >
                  1
                </li>
                <div className="h-px w-4 bg-gray-300 p-[0.5px] rounded-full" />
                <li
                  className={`cursor-pointer ${
                    activeTab === "submissions" ? "font-medium" : "font-normal"
                  }`}
                  onClick={() => setActiveTab("submissions")}
                >
                  2
                </li>
                <div className="h-px w-4 bg-gray-300 p-[0.5px] rounded-full" />
                <li
                  className={`cursor-pointer ${
                    activeTab === "submissions" ? "font-medium" : "font-normal"
                  }`}
                  onClick={() => setActiveTab("submissions")}
                >
                  3
                </li>
              </ul>
            </h1>
          </div>

          {/* navigation for each question  */}
          <ResizablePanel
            defaultSize={50}
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
                        : "font-normal"
                    }`}
                    onClick={() => setActiveTab("description")}
                  >
                    Description
                  </li>
                  <div className="h-4 w-px bg-gray-300 p-[0.5px] rounded-full" />
                  <li
                    className={`cursor-pointer ${
                      activeTab === "submissions"
                        ? "font-medium"
                        : "font-normal"
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
                    <h1 className="font-medium text-xl pb-2">
                      1. Prime Number
                    </h1>
                    <p>This is the problem description.</p>
                  </div>
                )}
                {activeTab === "submissions" && (
                  <div>
                    <p>Your previous submissions will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle
            withHandle
            className="hover:border-2 border-yellow-400 hidden sm:flex"
          />

          {/* code editor and test cases  */}
          <ResizablePanel
            defaultSize={50}
            minSize={30}
            className="hidden sm:block overflow-hidden"
          >
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel
                defaultSize={70}
                minSize={40}
                className="border rounded-lg overflow-hidden"
              >
                <div className="flex flex-col h-full min-h-0">
                  <h1 className="px-4 py-2 border-b flex-shrink-0">Code</h1>
                  <div className="px-2 py-1 mb-1 border-b flex-shrink-0 text-sm flex  items-center justify-between">
                    <Select>
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
                      <Button className="font-normal" variant="ghost" size="sm">
                        <LetterText className="size-4" />
                      </Button>

                      {/* reset  */}
                      <Button className="font-normal" variant="ghost" size="sm">
                        <RotateCcw className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-auto">
                    <CodeEditor language="python" value="" />
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
                className=" border rounded-lg overflow-hidden"
              >
                <div className="h-full flex flex-col">
                  <h1 className="px-4 py-2 border-b">Test Case</h1>
                  <Tabs defaultValue="case1" className="p-2">
                    <TabsList>
                      <TabsTrigger value="case1">Case 1</TabsTrigger>
                      <TabsTrigger value="case2">Case 2</TabsTrigger>
                    </TabsList>
                    <TabsContent value="case1">
                      nums=
                      <br />
                      1,2,3,4,5
                    </TabsContent>
                    <TabsContent value="case2">
                      nums=
                      <br />
                      6,7,8,9,10
                    </TabsContent>
                  </Tabs>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </section>
    </>
  );
};

export default Page;

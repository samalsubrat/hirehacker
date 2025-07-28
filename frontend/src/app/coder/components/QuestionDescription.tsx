"use client";
import React from "react";
import { ResizablePanel } from "@/components/ui/resizable";
import { Question } from "../types";

interface QuestionDescriptionProps {
  question: Question;
  activeTab: "description" | "submissions";
  onTabChange: (tab: "description" | "submissions") => void;
}

export const QuestionDescription: React.FC<QuestionDescriptionProps> = ({
  question,
  activeTab,
  onTabChange,
}) => {
  return (
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
  );
};

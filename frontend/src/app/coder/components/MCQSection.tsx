"use client";
import React from "react";
import { ResizablePanel } from "@/components/ui/resizable";
import { Question } from "../types";

interface MCQSectionProps {
  question: Question;
  selectedAnswer: number | null;
  onAnswerChange: (answerIndex: number) => void;
}

export const MCQSection: React.FC<MCQSectionProps> = ({
  question,
  selectedAnswer,
  onAnswerChange,
}) => {
  if (!question.mcq) return null;

  return (
    <ResizablePanel
      defaultSize={95}
      minSize={40}
      className="border rounded-lg h-full min-h-0"
    >
      <div>
        <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
          <h1>MCQs</h1>
        </div>
        <div className="p-4">
          <h1 className="font-medium text-xl pb-4">{question.title}</h1>
          <form>
            <fieldset>
              <legend className="mb-4 font-semibold">
                {question.mcq.question}
              </legend>
              <div className="flex flex-col gap-3">
                {question.mcq.options.map((option: string, idx: number) => (
                  <label
                    key={idx}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-colors w-1/2
                    ${
                      selectedAnswer === idx
                        ? "border-green-500 bg-green-50 text-green-800 shadow-md"
                        : "border-gray-200 bg-white text-gray-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`mcq-${question.title}`}
                      value={idx}
                      checked={selectedAnswer === idx}
                      onChange={() => onAnswerChange(idx)}
                      className="sr-only"
                    />
                    <div
                      className={`size-4 border-1 rounded-full flex items-center justify-center
                      ${
                        selectedAnswer === idx
                          ? "border-green-500"
                          : "border-gray-300"
                      }`}
                    >
                      <span
                        className={`size-2 rounded-full flex-shrink-0 flex items-center justify-center
                         ${
                           selectedAnswer === idx
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
  );
};
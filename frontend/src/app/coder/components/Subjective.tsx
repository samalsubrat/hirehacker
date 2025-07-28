"use client";
import React from "react";
import { ResizablePanel } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Question } from "../types";

interface SubjectiveSectionProps {
  question: Question;
  answer: string;
  onAnswerChange: (answer: string) => void;
  onSubmit: () => void;
}

export const SubjectiveSection: React.FC<SubjectiveSectionProps> = ({
  question,
  answer,
  onAnswerChange,
  onSubmit,
}) => {
  if (!question.subjective) return null;

  return (
    <ResizablePanel
      defaultSize={95}
      minSize={40}
      className="border rounded-lg h-full min-h-0"
    >
      <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
        <h1>Subjective</h1>
      </div>
      <div className="p-4">
        <h1 className="font-medium text-xl pb-4">{question.title}</h1>
        <form>
          <fieldset>
            <legend className="mb-4 font-semibold">
              {question.subjective.question}
            </legend>
            <textarea
              className="w-full min-h-[120px] border rounded-lg p-2 text-base focus:outline-none focus:ring-1 focus:shadow-md"
              placeholder={question.subjective.placeholder}
              value={answer}
              onChange={(e) => onAnswerChange(e.target.value)}
            />
          </fieldset>
          <Button
            className="mt-4"
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            Submit
          </Button>
        </form>
      </div>
    </ResizablePanel>
  );
};
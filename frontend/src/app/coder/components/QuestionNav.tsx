"use client";
import React from "react";
import { Question } from "../types";

interface QuestionNavigationProps {
  questions: Question[];
  currentQuestion: number;
  mcqAnswers: (number | null)[];
  onQuestionChange: (questionIndex: number) => void;
}

export const QuestionNavigation: React.FC<QuestionNavigationProps> = ({
  questions,
  currentQuestion,
  mcqAnswers,
  onQuestionChange,
}) => {
  return (
    <div className="border rounded-lg h-full w-10 mr-0.5 flex flex-col">
      <h1 className="flex items-center justify-center p-2 border-b flex-shrink-0">
        Q
      </h1>
      <ul className="flex flex-col gap-2 items-center py-2">
        {questions.map((question, idx) => {
          const isMcqQuestion = !!question.mcq;
          const isMcqAnswered = isMcqQuestion && mcqAnswers[idx] !== null;

          return (
            <li
              key={idx}
              className={`cursor-pointer rounded-full w-6 flex flex-col items-center justify-center ${
                currentQuestion === idx
                  ? "text-black font-medium"
                  : isMcqAnswered
                  ? "font-bold text-green-600"
                  : "font-normal text-gray-500"
              }`}
              onClick={() => onQuestionChange(idx)}
            >
              {idx + 1}
              {idx < questions.length - 1 && (
                <div className="w-4 h-px bg-gray-300 p-[0.5px] rounded-full mt-2" />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

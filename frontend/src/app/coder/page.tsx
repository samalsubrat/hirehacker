/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState } from "react";
import {
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import Nav from "./Nav";
import { CodeEditorSection } from "./components/CodeEditor";
import { MCQSection } from "./components/MCQSection";
import { SubjectiveSection } from "./components/Subjective";
import { QuestionNavigation } from "./components/QuestionNav";
import {TestCaseResult } from "./types";

const QUESTIONS = [
  {
    title: "1. Prime Number",
    description:
      "Write a function to check if a number is prime. Complete the function isPrime(n) that returns true if n is prime, false otherwise.",
    submissions: ["Submission 1 for Q1", "Submission 2 for Q1"],
    code: {
      python: `# Read input
n = int(input())

def isPrime(n):
    # Write your code here
    # Complete this function to check if n is prime
    pass

# Call the function and print result
result = isPrime(n)
print(result)`,
      java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int n = scanner.nextInt();
        
        // Call the function and print result
        boolean result = isPrime(n);
        System.out.println(result);
        
        scanner.close();
    }
    
    public static boolean isPrime(int n) {
        // Write your code here
        // Complete this function to check if n is prime
        return false; // placeholder
    }
}`,
      c: `#include <stdio.h>
#include <stdbool.h>

bool isPrime(int n) {
    // Write your code here
    // Complete this function to check if n is prime
    return false; // placeholder
}

int main() {
    int n;
    scanf("%d", &n);
    
    // Call the function and print result
    bool result = isPrime(n);
    printf("%s\\n", result ? "true" : "false");
    
    return 0;
}`,
    },
    testCases: [
      { name: "Case 1", input: "7", expectedOutput: "True" },
      { name: "Case 2", input: "10", expectedOutput: "False" },
      { name: "Case 3", input: "2", expectedOutput: "True" },
    ],
  },
  {
    title: "2. Fibonacci",
    description:
      "Write a function to return the nth Fibonacci number. Complete the function fibonacci(n) that returns the nth number in the Fibonacci sequence.",
    submissions: ["Submission 1 for Q2"],
    code: {
      python: `# Read input
n = int(input())

def fibonacci(n):
    # Write your code here
    # Complete this function to return nth Fibonacci number
    pass

# Call the function and print result
result = fibonacci(n)
print(result)`,
      java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int n = scanner.nextInt();
        
        // Call the function and print result
        int result = fibonacci(n);
        System.out.println(result);
        
        scanner.close();
    }
    
    public static int fibonacci(int n) {
        // Write your code here
        // Complete this function to return nth Fibonacci number
        return 0; // placeholder
    }
}`,
      c: `#include <stdio.h>

int fibonacci(int n) {
    // Write your code here
    // Complete this function to return nth Fibonacci number
    return 0; // placeholder
}

int main() {
    int n;
    scanf("%d", &n);
    
    // Call the function and print result
    int result = fibonacci(n);
    printf("%d\\n", result);
    
    return 0;
}`,
    },
    testCases: [
      { name: "Case 1", input: "5", expectedOutput: "5" },
      { name: "Case 2", input: "8", expectedOutput: "21" },
      { name: "Case 3", input: "0", expectedOutput: "0" },
    ],
  },
  {
    title: "3. Palindrome",
    description:
      "Check if a string is a palindrome. Complete the function isPalindrome(s) that returns true if the string is a palindrome (ignoring case and spaces), false otherwise.",
    submissions: ["Submission 1 for Q3"],
    code: {
      python: `# Read input
s = input().strip()

def isPalindrome(s):
    # Write your code here
    # Complete this function to check if string is palindrome
    pass

# Call the function and print result
result = isPalindrome(s)
print(result)`,
      java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String s = scanner.nextLine().trim();
        
        // Call the function and print result
        boolean result = isPalindrome(s);
        System.out.println(result);
        
        scanner.close();
    }
    
    public static boolean isPalindrome(String s) {
        // Write your code here
        // Complete this function to check if string is palindrome
        return false; // placeholder
    }
}`,
      c: `#include <stdio.h>
#include <string.h>
#include <stdbool.h>
#include <ctype.h>

bool isPalindrome(char* s) {
    // Write your code here
    // Complete this function to check if string is palindrome
    return false; // placeholder
}

int main() {
    char s[1000];
    fgets(s, sizeof(s), stdin);
    
    // Remove newline if present
    s[strcspn(s, "\\n")] = 0;
    
    // Call the function and print result
    bool result = isPalindrome(s);
    printf("%s\\n", result ? "true" : "false");
    
    return 0;
}`,
    },
    testCases: [
      { name: "Case 1", input: "racecar", expectedOutput: "true" },
      { name: "Case 2", input: "hello", expectedOutput: "false" },
      {
        name: "Case 3",
        input: "A man a plan a canal Panama",
        expectedOutput: "true",
      },
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
  const [activeTab, setActiveTab] = useState<"description" | "submissions">(
    "description"
  );
  const [codes, setCodes] = useState(
    QUESTIONS.map((q) => q.code?.python || "")
  );
  const [languages, setLanguages] = useState(QUESTIONS.map(() => "python"));
  const [mcqAnswers, setMcqAnswers] = useState(
    Array(QUESTIONS.length).fill(null)
  );
  const [subjectiveAnswers, setSubjectiveAnswers] = useState(
    Array(QUESTIONS.length).fill("")
  );
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Map UI language to Judge0 language_id
  const languageMap: Record<string, number> = {
    python: 71,
    java: 62,
    c: 50,
  };

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
        const requestBody: any = {
          code: source_code,
          language_id: language_id,
          stdin: testCase.input,
        };

        if (languages[currentQuestion] === "c") {
          requestBody.compiler_options = "-lm";
        }

        const response = await fetch("/api/judge0", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (response.ok) {
          actualOutput = data.stdout
            ? data.stdout.trim()
            : data.compile_output || data.stderr || "No output";
          status = data.status?.description || "Unknown Status";

          if (data.status?.id === 3) {
            isCorrect = actualOutput === testCase.expectedOutput;
          } else {
            isCorrect = false;
            error =
              data.compile_output ||
              data.stderr ||
              data.message ||
              "Execution failed.";
          }
        } else {
          error =
            data.details?.message || data.error || "Failed to execute code.";
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

    // 🧪 Step 6: Save Submission Here
    try {
      const user =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("user") || "null")
          : null;

      await fetch("/api/submissions/save", {
        method: "POST",
        body: JSON.stringify({
          userId: user?.id || null,
          code: source_code,
          language: languages[currentQuestion],
          result: newResults,
          questionIndex: currentQuestion,
          isCorrect: newResults.every((r) => r.isCorrect),
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (err) {
      console.error("Failed to save submission:", err);
    }

    setIsRunning(false);
  };

  const handleQuestionChange = (questionIndex: number) => {
    setCurrentQuestion(questionIndex);
    setActiveTab("description");
    setTestResults([]);
  };

  const handleCodeChange = (code: string) => {
    setCodes((codes) => {
      const newCodes = [...codes];
      newCodes[currentQuestion] = code;
      return newCodes;
    });
  };

  const handleLanguageChange = (language: string) => {
    setLanguages((langs) => {
      const newLangs = [...langs];
      newLangs[currentQuestion] = language;
      return newLangs;
    });
    setCodes((codes) => {
      const newCodes = [...codes];
      newCodes[currentQuestion] =
        QUESTIONS[currentQuestion].code?.[
          language as keyof (typeof QUESTIONS)[0]["code"]
        ] || "";
      return newCodes;
    });
  };

  const handleResetCode = () => {
    setCodes((codes) => {
      const newCodes = [...codes];
      const currentLang = languages[currentQuestion];
      newCodes[currentQuestion] =
        QUESTIONS[currentQuestion].code?.[
          currentLang as keyof (typeof QUESTIONS)[0]["code"]
        ] || "";
      return newCodes;
    });
  };

  const handleMcqAnswerChange = (answerIndex: number) => {
    setMcqAnswers((ans) => {
      const arr = [...ans];
      arr[currentQuestion] = answerIndex;
      return arr;
    });
  };

  const handleSubjectiveAnswerChange = (answer: string) => {
    setSubjectiveAnswers((ans) => {
      const arr = [...ans];
      arr[currentQuestion] = answer;
      return arr;
    });
  };

  const handleSubjectiveSubmit = () => {
    console.log(
      "Subjective answer submitted:",
      subjectiveAnswers[currentQuestion]
    );
  };

  const currentQ = QUESTIONS[currentQuestion];
  const isMcq = !!currentQ.mcq;
  const isSubjective = !!currentQ.subjective;

  return (
    <>
      <Nav />
      <section className="flex justify-between h-screen p-1.5 overflow-hidden pt-12">
        <ResizablePanelGroup
          direction="horizontal"
          className="w-full h-full min-h-0"
        >
          <QuestionNavigation
            questions={QUESTIONS}
            currentQuestion={currentQuestion}
            mcqAnswers={mcqAnswers}
            onQuestionChange={handleQuestionChange}
          />

          {!isMcq && !isSubjective ? (
            <>
              <CodeEditorSection
                question={currentQ}
                code={codes[currentQuestion]}
                language={languages[currentQuestion]}
                testResults={testResults}
                isRunning={isRunning}
                activeTab={activeTab}
                onCodeChange={handleCodeChange}
                onLanguageChange={handleLanguageChange}
                onRunCode={runCode}
                onResetCode={handleResetCode}
                onTabChange={setActiveTab}
              />
            </>
          ) : isMcq ? (
            <MCQSection
              question={currentQ}
              selectedAnswer={mcqAnswers[currentQuestion]}
              onAnswerChange={handleMcqAnswerChange}
            />
          ) : (
            <SubjectiveSection
              question={currentQ}
              answer={subjectiveAnswers[currentQuestion]}
              onAnswerChange={handleSubjectiveAnswerChange}
              onSubmit={handleSubjectiveSubmit}
            />
          )}
        </ResizablePanelGroup>
      </section>
    </>
  );
};

export default Page;

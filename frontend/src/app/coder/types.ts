export interface TestCase {
  name: string;
  input: string;
  expectedOutput: string;
}

export interface TestCaseResult {
  testCase: string;
  input: string;
  expectedOutput: string;
  actualOutput: string | null;
  status: string;
  isCorrect: boolean | null;
  error: string | null;
}

export interface Question {
  title: string;
  description?: string;
  submissions?: string[];
  code?: {
    python?: string;
    java?: string;
    c?: string;
  };
  testCases?: TestCase[];
  mcq?: {
    question: string;
    options: string[];
    answer: number;
  };
  subjective?: {
    question: string;
    placeholder: string;
  };
}
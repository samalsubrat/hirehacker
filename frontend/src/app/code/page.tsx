"use client"

import { useState, useCallback } from "react"
import { CodeEditor } from "@/components/code-editor"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable" // Import resizable components
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

// Define test cases for the problem
const testCases = [
    { input: 10, expectedOutput: "4" },
    { input: 0, expectedOutput: "0" },
    { input: 20, expectedOutput: "8" },
]

// Judge0 Language ID for Python 3
const PYTHON_LANGUAGE_ID = 71

// Default code template for the Monaco Editor
const defaultPythonCode = `def countPrimes(n: int) -> int:
    if n <= 2:
        return 0
    
    is_prime = [True] * n
    is_prime[0] = is_prime[1] = False
    
    for p in range(2, int(n**0.5) + 1):
        if is_prime[p]:
            for multiple in range(p*p, n, p):
                is_prime[multiple] = False
                
    count = 0
    for i in range(2, n):
        if is_prime[i]:
            count += 1
            
    return count
`

// Interface for storing test case results
interface TestCaseResult {
    input: number
    expectedOutput: string
    actualOutput: string | null
    status: string
    isCorrect: boolean | null
    error: string | null
}

export default function CodingChallengePage() {
    const [code, setCode] = useState<string>(defaultPythonCode)
    const [results, setResults] = useState<TestCaseResult[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(false)

    // Callback to update code state from Monaco Editor
    const handleCodeChange = useCallback((value: string | undefined) => {
        setCode(value || "")
    }, [])

    // Function to run the user's code against test cases using Judge0 API
    const runCode = async () => {
        setIsLoading(true)
        setResults([]) // Clear previous results

        const newResults: TestCaseResult[] = []

        for (const testCase of testCases) {
            const { input, expectedOutput } = testCase
            let actualOutput: string | null = null
            let status = "Error"
            let isCorrect: boolean | null = null
            let error: string | null = null

            try {
                // Wrap the user's code with the function call for Judge0
                // This allows Judge0 to execute the function with the specific input
                const codeToExecute = `${code}\n\nprint(countPrimes(${input}))`

                const response = await fetch("/api/judge0", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        code: codeToExecute,
                        language_id: PYTHON_LANGUAGE_ID,
                        stdin: "", // No specific stdin needed as we're calling the function directly
                    }),
                })

                const data = await response.json()

                if (response.ok) {
                    // Trim stdout to remove trailing newlines for accurate comparison
                    actualOutput = data.stdout ? data.stdout.trim() : data.compile_output || data.stderr || "No output"
                    status = data.status?.description || "Unknown Status"

                    // Check if the code was accepted (status ID 3) and output matches
                    if (data.status?.id === 3) {
                        isCorrect = actualOutput === expectedOutput
                    } else {
                        isCorrect = false // Not accepted, so not correct
                        error = data.compile_output || data.stderr || data.message || "Execution failed."
                    }
                } else {
                    error = data.details?.message || data.error || "Failed to execute code."
                    status = "API Error"
                    isCorrect = false
                }
            } catch (err) {
                console.error("Error running code:", err)
                error = (err as Error).message || "Network or unexpected error."
                status = "Client Error"
                isCorrect = false
            } finally {
                newResults.push({
                    input,
                    expectedOutput,
                    actualOutput,
                    status,
                    isCorrect,
                    error,
                })
            }
        }
        setResults(newResults)
        setIsLoading(false)
    }

    return (
        <ResizablePanelGroup direction="horizontal" className="h-screen bg-gray-50 dark:bg-gray-950">
            {/* Left Panel: Problem Description */}
            <ResizablePanel defaultSize={50} minSize={30}>
                <ScrollArea className="h-full p-6 border-r border-gray-200 dark:border-gray-800">
                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-2xl font-bold">🧠 Problem: Count the Number of Primes</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow text-gray-700 dark:text-gray-300 space-y-4">
                            <p>
                                Given an integer <code className="font-mono">n</code>, return the number of prime numbers that are
                                strictly less than <code className="font-mono">n</code>.
                            </p>

                            <h3 className="font-semibold text-lg">Function Signature:</h3>
                            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md text-sm overflow-auto">
                                <code>def countPrimes(n: int) -&gt; int:</code>
                            </pre>

                            <h3 className="font-semibold text-lg">🧾 Input</h3>
                            <p>
                                A single integer <code className="font-mono">n</code> (0 &le; n &le; 10^6)
                            </p>

                            <h3 className="font-semibold text-lg">📤 Output</h3>
                            <p>
                                An integer representing the number of prime numbers strictly less than{" "}
                                <code className="font-mono">n</code>
                            </p>

                            <h3 className="font-semibold text-lg">🧪 Example Test Cases:</h3>
                            <div className="space-y-2">
                                <div>
                                    <p>
                                        <span className="font-medium">Input:</span> 10
                                    </p>
                                    <p>
                                        <span className="font-medium">Output:</span> 4
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Explanation: Primes less than 10 are [2, 3, 5, 7]
                                    </p>
                                </div>
                                <div>
                                    <p>
                                        <span className="font-medium">Input:</span> 0
                                    </p>
                                    <p>
                                        <span className="font-medium">Output:</span> 0
                                    </p>
                                </div>
                                <div>
                                    <p>
                                        <span className="font-medium">Input:</span> 20
                                    </p>
                                    <p>
                                        <span className="font-medium">Output:</span> 8
                                    </p>
                                </div>
                            </div>

                            <h3 className="font-semibold text-lg">🔍 Constraints:</h3>
                            <p>Optimize for performance: solutions slower than O(n log n) may time out for large inputs.</p>
                        </CardContent>
                    </Card>
                </ScrollArea>
            </ResizablePanel>
            <ResizableHandle withHandle /> {/* Resizable handle between panels */}
            {/* Right Panel: Code Editor and Output (now vertical resizable) */}
            <ResizablePanel defaultSize={50} minSize={30}>
                <ResizablePanelGroup direction="vertical" className="h-full w-full">
                    <ResizablePanel defaultSize={60} minSize={20}>
                        <div className="h-full p-6 flex flex-col space-y-3">
                            <div>Code Editor</div>
                            <CodeEditor
                                value={code}
                                onChange={handleCodeChange}
                                language="python"
                                height="100%" // Make editor fill available space
                            />
                            <Button onClick={runCode} disabled={isLoading} className="w-full">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Run Code
                            </Button>
                        </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={40} minSize={20}>
                        <div className="h-full p-6 flex flex-col space-y-3">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Test Results</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {results.length === 0 && !isLoading && (
                                        <p className="text-center text-gray-500 dark:text-gray-400">Run your code to see results.</p>
                                    )}
                                    {results.map((result, index) => (
                                        <div key={index} className="border p-4 rounded-md bg-gray-50 dark:bg-gray-800">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="font-semibold">
                                                    Test Case {index + 1}: Input {result.input}
                                                </h4>
                                                {result.isCorrect !== null && (
                                                    <Badge
                                                        className={cn(
                                                            result.isCorrect ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600",
                                                            "text-white",
                                                        )}
                                                    >
                                                        {result.isCorrect ? "✅ Correct" : "❌ Incorrect"}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p>
                                                <strong>Expected Output:</strong> {result.expectedOutput}
                                            </p>
                                            <p>
                                                <strong>Actual Output:</strong> {result.actualOutput}
                                            </p>
                                            {result.error && (
                                                <p className="text-red-500 text-sm mt-2">
                                                    <strong>Error:</strong> {result.error}
                                                </p>
                                            )}
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Status: {result.status}</p>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </ResizablePanel>
        </ResizablePanelGroup>
    )
}

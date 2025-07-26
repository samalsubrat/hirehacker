"use client"
import { Editor } from "@monaco-editor/react"
import { useState, useRef } from "react"
import type { editor } from "monaco-editor"

interface CodeEditorProps {
  value: string
  onChange: (value: string | undefined) => void
  language: string
  height?: string
}

export function CodeEditor({ value, onChange, language, height = "400px" }: CodeEditorProps) {
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 })
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor
    
    // Listen for cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column
      })
    })
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language}
          value={value}
          onChange={onChange}
          onMount={handleEditorDidMount}
          theme="vs-light"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            wordWrap: "on",
          }}
        />
      </div>
      {/* Status bar with line and column numbers */}
      <div className="flex justify-end items-center px-3 py-1 bg-gray-50 border-t border-gray-200 text-sm text-gray-600 flex-shrink-0 h-8">
        <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
      </div>
    </div>
  )
}
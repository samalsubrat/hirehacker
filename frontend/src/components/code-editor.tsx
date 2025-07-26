"use client"
import { Editor } from "@monaco-editor/react"
import { useState, useRef, useImperativeHandle, forwardRef } from "react"

interface CodeEditorProps {
  value: string
  onChange: (value: string | undefined) => void
  language: string
  height?: string
}

export interface CodeEditorRef {
  formatCode: () => void
}

export const CodeEditor = forwardRef<CodeEditorRef, CodeEditorProps>(({ value, onChange, language, height = "400px" }, ref) => {
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 })
  const editorRef = useRef<any>(null)

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor
    
    // Listen for cursor position changes
    editor.onDidChangeCursorPosition((e: any) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column
      })
    })
  }

  useImperativeHandle(ref, () => ({
    formatCode: () => {
      if (editorRef.current) {
        // Use the format document action (Alt+Shift+F equivalent)
        editorRef.current.getAction('editor.action.formatDocument')?.run()
      }
    }
  }))

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
})
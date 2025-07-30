"use client"
import { useEffect, useState } from "react"

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState([])

  useEffect(() => {
    fetch("/api/submissions/all")
      .then(res => res.json())
      .then(data => setSubmissions(data))
  }, [])

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Submissions</h2>
      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Language</th>
            <th className="p-2 text-left">Code</th>
            <th className="p-2 text-left">Result</th>
            <th className="p-2 text-left">Time</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((s: any, i: number) => (
            <tr key={i} className="border-t">
              <td className="p-2">{s.language}</td>
              <td className="p-2 max-w-[300px] truncate">{s.code}</td>
              <td className="p-2">{s.result}</td>
              <td className="p-2">{new Date(s.submitted_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

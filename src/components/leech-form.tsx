"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

export default function LeechForm() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ doc_id: string; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/leech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong")
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-4 p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Input
            placeholder="Paste direct download link here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            className="border-red-200 focus-visible:ring-red-500"
          />
        </div>
        <Button type="submit" disabled={loading || !url} className="w-full bg-red-600 hover:bg-red-700 text-white">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Start Leech"
          )}
        </Button>
      </form>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
          Error: {error}
        </div>
      )}

      {result && (
        <div className="p-4 space-y-2 bg-green-50 border border-green-200 rounded-md">
          <h3 className="font-semibold text-green-800">Leech Started!</h3>
          <p className="text-sm text-green-700">
            Your file is being processed by the GitHub Actions engine.
          </p>
          <div className="mt-2 text-xs font-mono bg-white p-2 rounded border">
            Doc ID: {result.doc_id}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Once complete, download at: <br/>
            <code className="bg-gray-100 p-1 rounded break-all">https://crimson.pipipahmy.workers.dev/download/{result.doc_id}</code>
          </p>
        </div>
      )}
    </div>
  )
}

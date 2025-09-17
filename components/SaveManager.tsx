"use client"

import { useState } from "react"

export type SaveManagerProps = {
  onExport: () => string | null
  onImport: (saveData: string) => boolean
  onClear: () => boolean
}

export default function SaveManager({ onExport, onImport, onClear }: SaveManagerProps) {
  const [importText, setImportText] = useState("")
  const [showImport, setShowImport] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [exportData, setExportData] = useState("")
  const [message, setMessage] = useState("")

  const handleExport = () => {
    const data = onExport()
    if (data) {
      setExportData(data)
      setShowExport(true)
      setMessage("Save exported successfully!")
    } else {
      setMessage("Failed to export save data")
    }
  }

  const handleImport = () => {
    if (!importText.trim()) {
      setMessage("Please enter save data")
      return
    }

    const trimmedData = importText.trim()

    // Check if the data looks like JSON
    if (!trimmedData.startsWith('{') || !trimmedData.endsWith('}')) {
      setMessage("Invalid format: Save data must be valid JSON starting with { and ending with }")
      return
    }

    // Check for common non-JSON content
    if (trimmedData.includes('##') || trimmedData.includes('Error') || trimmedData.includes('<!DOCTYPE')) {
      setMessage("Invalid format: Please paste actual save data, not error messages or HTML")
      return
    }

    const success = onImport(trimmedData)
    if (success) {
      setMessage("Save imported successfully!")
      setImportText("")
      setShowImport(false)
    } else {
      setMessage("Failed to import save data - check format and try again")
    }
  }

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear all save data? This cannot be undone!")) {
      const success = onClear()
      if (success) {
        setMessage("Save data cleared successfully!")
      } else {
        setMessage("Failed to clear save data")
      }
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setImportText(content)
      }
      reader.readAsText(file)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([exportData], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `data-continuum-save-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportData)
      setMessage("Copied to clipboard!")
    } catch {
      setMessage("Failed to copy to clipboard")
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-zinc-300 border-b border-zinc-700/50 pb-2">
        Save Management
      </div>

      {message && (
        <div className="text-[10px] text-blue-200 bg-blue-500/10 border border-blue-500/30 rounded px-2 py-1">
          {message}
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={handleExport}
          className="w-full px-3 py-2 text-[11px] bg-blue-500/15 border border-blue-500/50 text-blue-200 rounded hover:bg-blue-500/25 transition-colors"
        >
          Export Save
        </button>

        <button
          onClick={() => setShowImport(!showImport)}
          className="w-full px-3 py-2 text-[11px] bg-green-500/15 border border-green-500/50 text-green-200 rounded hover:bg-green-500/25 transition-colors"
        >
          Import Save
        </button>

        <button
          onClick={handleClear}
          className="w-full px-3 py-2 text-[11px] bg-red-500/15 border border-red-500/50 text-red-200 rounded hover:bg-red-500/25 transition-colors"
        >
          Clear Save Data
        </button>
      </div>

      {showExport && (
        <div className="space-y-2 p-3 bg-zinc-800/30 rounded border border-zinc-700/50">
          <div className="text-[11px] text-zinc-300 font-medium">Export Data</div>
          <textarea
            value={exportData}
            readOnly
            className="w-full h-20 p-2 text-[10px] bg-zinc-900/60 border border-zinc-700/50 rounded text-zinc-200 resize-none"
            placeholder="Save data will appear here..."
          />
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              className="flex-1 px-2 py-1 text-[10px] bg-blue-500/15 border border-blue-500/50 text-blue-200 rounded hover:bg-blue-500/25 transition-colors"
            >
              Copy
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 px-2 py-1 text-[10px] bg-green-500/15 border border-green-500/50 text-green-200 rounded hover:bg-green-500/25 transition-colors"
            >
              Download
            </button>
            <button
              onClick={() => setShowExport(false)}
              className="flex-1 px-2 py-1 text-[10px] bg-zinc-700/30 border border-zinc-600/50 text-zinc-400 rounded hover:bg-zinc-600/30 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showImport && (
        <div className="space-y-2 p-3 bg-zinc-800/30 rounded border border-zinc-700/50">
          <div className="text-[11px] text-zinc-300 font-medium">Import Data</div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="w-full h-20 p-2 text-[10px] bg-zinc-900/60 border border-zinc-700/50 rounded text-zinc-200 resize-none"
            placeholder="Paste save data here..."
          />
          <div className="flex gap-2">
            <label className="flex-1 px-2 py-1 text-[10px] bg-purple-500/15 border border-purple-500/50 text-purple-200 rounded hover:bg-purple-500/25 transition-colors cursor-pointer text-center">
              Load File
              <input
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={handleImport}
              className="flex-1 px-2 py-1 text-[10px] bg-green-500/15 border border-green-500/50 text-green-200 rounded hover:bg-green-500/25 transition-colors"
            >
              Import
            </button>
            <button
              onClick={() => setShowImport(false)}
              className="flex-1 px-2 py-1 text-[10px] bg-zinc-700/30 border border-zinc-600/50 text-zinc-400 rounded hover:bg-zinc-600/30 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
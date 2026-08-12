"use client"
import { useState } from "react"
import { withBasePath } from "@/lib/basePath"

export function SendDigestButton() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle")
  const [detail, setDetail] = useState("")

  const handleClick = async () => {
    if (state === "sending") return
    setState("sending")
    setDetail("")
    try {
      const res = await fetch(withBasePath("/api/admin/send-digest"), { method: "POST" })
      const data = await res.json()
      if (data.ok) {
        setDetail(data.to ?? "")
        setState("done")
      } else {
        setDetail(data.error ?? "Unknown error")
        setState("error")
      }
    } catch (e) {
      setDetail(String(e))
      setState("error")
    }
  }

  if (state === "done") {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M5 13L9 17L19 7" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-xs font-medium text-green-700">Sent to {detail}</span>
        </div>
      </div>
    )
  }

  if (state === "error") {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="2"/>
            <path d="M12 8v4M12 16h.01" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="text-xs font-medium text-red-700">Failed: {detail}</span>
        </div>
        <button onClick={() => setState("idle")} className="text-xs text-gray-400 hover:text-gray-600 text-left px-1">
          Try again
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === "sending"}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
    >
      {state === "sending" ? (
        <>
          <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="30 60" />
          </svg>
          Sending…
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M3 8L10.89 13.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Send Digest Now
        </>
      )}
    </button>
  )
}

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

type WhisperWord = { word: string; start: number; end: number }

function splitSentences(text: string): string[] {
  return text.match(/[^.!?]+(?:[.!?]+\s*|$)/g)?.map(s => s.trim()).filter(Boolean) ?? [text]
}

// Greedily align lesson sentences to Whisper word timestamps.
// Returns one { start, end } per sentence.
function computeSentenceTimestamps(
  sentences: string[],
  whisperWords: WhisperWord[]
): Array<{ start: number; end: number }> {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
  const totalDuration = whisperWords[whisperWords.length - 1]?.end ?? 0

  // Build flat word list annotated with their sentence index
  const lessonWords: Array<{ text: string; sentIdx: number }> = []
  for (let si = 0; si < sentences.length; si++) {
    for (const w of sentences[si].split(/\s+/)) {
      const c = clean(w)
      if (c) lessonWords.push({ text: c, sentIdx: si })
    }
  }

  if (lessonWords.length === 0) {
    return sentences.map((_, i) => ({
      start: (i / sentences.length) * totalDuration,
      end:   ((i + 1) / sentences.length) * totalDuration,
    }))
  }

  const sentStart: number[] = new Array(sentences.length).fill(-1)
  const sentEnd:   number[] = new Array(sentences.length).fill(-1)
  let li = 0

  for (const ww of whisperWords) {
    if (li >= lessonWords.length) break
    const wwText = clean(ww.word)
    if (!wwText) continue

    // Lookahead up to 8 positions to handle narrator additions / minor differences
    const limit = Math.min(li + 8, lessonWords.length)
    let matched = -1
    for (let offset = li; offset < limit; offset++) {
      const lw = lessonWords[offset].text
      if (lw === wwText || lw.startsWith(wwText) || wwText.startsWith(lw)) {
        matched = offset
        break
      }
    }

    if (matched !== -1) {
      const si = lessonWords[matched].sentIdx
      if (sentStart[si] === -1) sentStart[si] = ww.start
      sentEnd[si] = ww.end
      li = matched + 1
    }
  }

  // Fill any gaps by interpolation
  const result: Array<{ start: number; end: number }> = []
  for (let si = 0; si < sentences.length; si++) {
    let start = sentStart[si] !== -1 ? sentStart[si] : (result[si - 1]?.end ?? 0)
    let end = sentEnd[si]
    if (end === -1) {
      let nextStart = totalDuration
      for (let ni = si + 1; ni < sentences.length; ni++) {
        if (sentStart[ni] !== -1) { nextStart = sentStart[ni]; break }
      }
      end = nextStart
    }
    result.push({ start, end })
  }
  return result
}

export async function POST(request: NextRequest) {
  try {
    const { lessonId } = await request.json()
    if (!lessonId) return NextResponse.json({ error: "lessonId required" }, { status: 400 })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 })

    const supabase = createServiceClient()

    // Fetch lesson
    const { data: lesson, error: lessonErr } = await supabase
      .from("lessons")
      .select("id, audio, paragraph1, paragraph2, callout")
      .eq("id", lessonId)
      .single()

    if (lessonErr || !lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    if (!lesson.audio)       return NextResponse.json({ error: "Lesson has no audio" }, { status: 400 })

    // Build sentence list (same order as the app player)
    const blocks: string[] = []
    if (lesson.paragraph1) blocks.push(lesson.paragraph1)
    if (lesson.paragraph2) blocks.push(lesson.paragraph2)
    if (lesson.callout)    blocks.push(lesson.callout)
    const sentences = blocks.flatMap(splitSentences)
    if (sentences.length === 0) return NextResponse.json({ error: "No text to sync" }, { status: 400 })

    // Download audio
    const audioRes = await fetch(lesson.audio)
    if (!audioRes.ok) return NextResponse.json({ error: "Failed to fetch audio" }, { status: 502 })
    const audioBuffer = await audioRes.arrayBuffer()

    // Call Whisper API
    const form = new FormData()
    form.append("file", new Blob([audioBuffer], { type: "audio/mpeg" }), "audio.mp3")
    form.append("model", "whisper-1")
    form.append("response_format", "verbose_json")
    form.append("timestamp_granularities[]", "word")

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })

    if (!whisperRes.ok) {
      const err = await whisperRes.text()
      return NextResponse.json({ error: `Whisper error: ${err}` }, { status: 502 })
    }

    const whisperData = await whisperRes.json()
    const words: WhisperWord[] = whisperData.words ?? []
    if (words.length === 0) return NextResponse.json({ error: "Whisper returned no word timestamps" }, { status: 502 })

    // Align sentences to words
    const timestamps = computeSentenceTimestamps(sentences, words)

    // Save to DB
    const { error: updateErr } = await supabase
      .from("lessons")
      .update({ audio_timestamps: timestamps })
      .eq("id", lessonId)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, sentenceCount: sentences.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

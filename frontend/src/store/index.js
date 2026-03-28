import { create } from 'zustand'

const API = '/api'

export const useStore = create((set, get) => ({
  // ── State ──
  files:       [],
  activeFile:  null,
  notes:       [],
  activeNote:  null,
  result:      null,
  activeMode:  null,
  chatHistory: [],
  lang:        localStorage.getItem('lang') || 'en',
  theme:       localStorage.getItem('theme') || 'light',
  loading:     {},   // { key: bool }
  xp:          parseInt(localStorage.getItem('xp') || '0'),
  tab:         'analyzer',

  // ── Loading helpers ──
  setLoading: (key, val) => set(s => ({ loading: { ...s.loading, [key]: val } })),
  isLoading:  (key) => get().loading[key] || false,

  // ── Theme ──
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
    set({ theme: next })
  },

  // ── Language ──
  setLang: (lang) => {
    localStorage.setItem('lang', lang)
    set({ lang })
  },

  // ── XP ──
  addXP: (amount) => {
    const xp = get().xp + amount
    localStorage.setItem('xp', xp)
    set({ xp })
  },

  // ── Tab navigation ──
  setTab: (tab) => set({ tab }),

  // ── Files ──
  fetchFiles: async () => {
    try {
      const res = await fetch(`${API}/files/list`)
      const data = await res.json()
      set({ files: data.files || [] })
    } catch (e) {
      console.error('fetchFiles:', e)
    }
  },

  uploadFile: async (file) => {
    get().setLoading('upload', true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res  = await fetch(`${API}/files/upload`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Upload failed')
      await get().fetchFiles()
      get().addXP(10)
      return data
    } finally {
      get().setLoading('upload', false)
    }
  },

  setActiveFile: (file) => set({ activeFile: file, result: null }),

  deleteFile: async (id) => {
    await fetch(`${API}/files/${id}`, { method: 'DELETE' })
    set(s => ({ files: s.files.filter(f => f.id !== id), activeFile: s.activeFile?.id === id ? null : s.activeFile }))
  },

  // ── Analysis ──
  setMode: (mode) => set({ activeMode: mode }),

  analyze: async () => {
    const { activeFile, activeMode, lang } = get()
    if (!activeFile || !activeMode) return

    get().setLoading('analyze', true)
    set({ result: null })
    try {
      // Get full text first
      const textRes  = await fetch(`${API}/files/${activeFile.id}/text`)
      const textData = await textRes.json()

      const res = await fetch(`${API}/analyze/document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text:     textData.text,
          filename: activeFile.name,
          mode:     activeMode,
          lang,
          parallel: false,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Analysis failed')

      set({ result: data.result })
      get().addXP(20)

      // Auto-generate notes from result
      setTimeout(() => get().generateNotesFromAnalysis(data.result, activeFile), 600)

    } finally {
      get().setLoading('analyze', false)
    }
  },

  generateFlashcards: async () => {
    const { activeFile, lang } = get()
    if (!activeFile) return []
    get().setLoading('flashcards', true)
    try {
      const textRes  = await fetch(`${API}/files/${activeFile.id}/text`)
      const textData = await textRes.json()
      const res = await fetch(`${API}/analyze/flashcards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textData.text, lang, count: 10 })
      })
      const data = await res.json()
      get().addXP(15)
      return data.flashcards || []
    } finally {
      get().setLoading('flashcards', false)
    }
  },

  generateQuiz: async () => {
    const { activeFile, lang } = get()
    if (!activeFile) return []
    get().setLoading('quiz', true)
    try {
      const textRes  = await fetch(`${API}/files/${activeFile.id}/text`)
      const textData = await textRes.json()
      const res = await fetch(`${API}/analyze/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textData.text, lang, count: 8 })
      })
      const data = await res.json()
      get().addXP(10)
      return data.questions || []
    } finally {
      get().setLoading('quiz', false)
    }
  },

  // ── Notes ──
  fetchNotes: async (q = '') => {
    const url = q ? `${API}/notes/?q=${encodeURIComponent(q)}` : `${API}/notes/`
    const res  = await fetch(url)
    const data = await res.json()
    set({ notes: data.notes || [] })
  },

  createNote: async (noteData) => {
    const res = await fetch(`${API}/notes/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData)
    })
    const note = await res.json()
    set(s => ({ notes: [note, ...s.notes] }))
    get().addXP(5)
    return note
  },

  updateNote: async (id, changes) => {
    const res = await fetch(`${API}/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes)
    })
    const updated = await res.json()
    set(s => ({ notes: s.notes.map(n => n.id === id ? updated : n), activeNote: s.activeNote?.id === id ? updated : s.activeNote }))
  },

  deleteNote: async (id) => {
    await fetch(`${API}/notes/${id}`, { method: 'DELETE' })
    set(s => ({ notes: s.notes.filter(n => n.id !== id), activeNote: s.activeNote?.id === id ? null : s.activeNote }))
  },

  setActiveNote: (note) => set({ activeNote: note }),

  generateNotesFromAnalysis: async (analysisText, file) => {
    if (!analysisText) return
    const sections = analysisText.split(/(?=##\s)/g).filter(Boolean).slice(0, 6)
    const notesData = sections.map(sec => {
      const lines   = sec.trim().split('\n')
      const heading = lines[0].replace(/^#+\s*/, '').trim()
      const body    = lines.slice(1).join('\n').trim()
      if (!heading || !body) return null
      return {
        title:     heading,
        content:   body,
        tag:       /formula|equation/i.test(heading) ? 'formula' : /cheat|sheet/i.test(heading) ? 'summary' : 'key',
        file_id:   file?.id || null,
        file_name: file?.name || null,
      }
    }).filter(Boolean)

    if (!notesData.length) return
    await fetch(`${API}/notes/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: notesData })
    })
    await get().fetchNotes()
  },

  enhanceNote: async (content, action, lang) => {
    const res = await fetch(`${API}/analyze/enhance-note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, action, lang })
    })
    const data = await res.json()
    return data.result || ''
  },

  // ── Chat ──
  sendChat: async (message) => {
    const { activeFile, lang, chatHistory } = get()
    get().setLoading('chat', true)

    let docText = '', docName = ''
    if (activeFile) {
      try {
        const r = await fetch(`${API}/files/${activeFile.id}/text`)
        const d = await r.json()
        docText = d.text || ''
        docName = activeFile.name
      } catch {}
    }

    const newHistory = [...chatHistory, { role: 'user', content: message }]
    set({ chatHistory: newHistory })

    try {
      const res = await fetch(`${API}/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: chatHistory.slice(-6), doc_text: docText, doc_name: docName, lang })
      })
      const data = await res.json()
      const reply = data.reply || 'No response'
      set(s => ({ chatHistory: [...s.chatHistory, { role: 'assistant', content: reply }] }))
      get().addXP(5)
      return reply
    } finally {
      get().setLoading('chat', false)
    }
  },

  clearChat: () => set({ chatHistory: [] }),
}))

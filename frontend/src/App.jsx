import { useEffect, useState, useRef } from 'react'
import { useStore } from './store/index.js'

// ── Icons (inline SVG components to avoid deps) ──
const Icon = ({ name, size = 16 }) => {
  const icons = {
    book:       'M4 6h16M4 10h16M4 14h10',
    folder:     'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
    cards:      'M3 4h18v14H3zM7 4v14M3 9h18',
    quiz:       'M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16zm-1-5h2v2h-2v-2zm0-8h2v5.5h-2V7z',
    chat:       'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
    chart:      'M3 3v18h18M7 16l4-4 4 4 4-4',
    notes:      'M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V8zM14 3l4 4M10 13h4M10 17h4M10 9h1',
    upload:     'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
    settings:   'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
    moon:       'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
    sun:        'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 5a7 7 0 100 14A7 7 0 0012 5z',
    x:          'M18 6L6 18M6 6l12 12',
    plus:       'M12 5v14M5 12h14',
    trash:      'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
    pin:        'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z',
    lightning:  'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    mic:        'M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8',
    download:   'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
    send:       'M22 2L11 13M22 2L15 22 11 13 2 9l20-7z',
    star:       'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    copy:       'M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2M8 4a2 2 0 002 2h4a2 2 0 002-2M8 4a2 2 0 012-2h4a2 2 0 012 2',
    clock:      'M12 2a10 10 0 100 20A10 10 0 0012 2zM12 6v6l4 2',
    graph:      'M2 2h4v20H2zM10 8h4v14h-4zM18 14h4v8h-4z',
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={icons[name] || icons.book} />
    </svg>
  )
}

// ── Toast system ──
let _toastId = 0
const toastListeners = []
const toast = (msg, type = 'info', dur = 3000) => {
  const id = ++_toastId
  toastListeners.forEach(fn => fn({ id, msg, type, dur }))
}

function ToastContainer() {
  const [toasts, setToasts] = useState([])
  useEffect(() => {
    const fn = (t) => {
      setToasts(prev => [t, ...prev])
      if (t.dur > 0) setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), t.dur)
    }
    toastListeners.push(fn)
    return () => { const i = toastListeners.indexOf(fn); if (i > -1) toastListeners.splice(i,1) }
  }, [])
  return (
    <div style={{ position:'fixed', bottom:20, right:20, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => setToasts(p => p.filter(x => x.id !== t.id))}>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ── File type config ──
const FT = {
  pdf:  { ic:'📄', bg:'#FAECE7', color:'#D85A30' },
  pptx: { ic:'📊', bg:'#FAEEDA', color:'#BA7517' },
  ppt:  { ic:'📊', bg:'#FAEEDA', color:'#BA7517' },
  docx: { ic:'📝', bg:'#E6F1FB', color:'#185FA5' },
  doc:  { ic:'📝', bg:'#E6F1FB', color:'#185FA5' },
  txt:  { ic:'📃', bg:'#F1EFE8', color:'#888780' },
  xlsx: { ic:'📈', bg:'#EAF3DE', color:'#639922' },
  xls:  { ic:'📈', bg:'#EAF3DE', color:'#639922' },
  png:  { ic:'🖼️', bg:'#FBEAF0', color:'#D4537E' },
  jpg:  { ic:'🖼️', bg:'#FBEAF0', color:'#D4537E' },
  jpeg: { ic:'🖼️', bg:'#FBEAF0', color:'#D4537E' },
}

const MODES = [
  { id:'full',      ic:'📚', label:'Full revision',  desc:'Every topic' },
  { id:'oneday',    ic:'☀️',  label:'1-day plan',     desc:'All topics fast' },
  { id:'crash',     ic:'⚡', label:'3-hr crash',     desc:'High-impact only' },
  { id:'cheat',     ic:'📋', label:'Cheat sheet',    desc:'One-page notes' },
  { id:'qa',        ic:'❓', label:'Q&A mode',       desc:'Exam questions' },
  { id:'lastnight', ic:'🌙', label:'Last night',     desc:'1-hr sprint' },
  { id:'beginner',  ic:'🌱', label:'Beginner+',      desc:'Deep learning' },
  { id:'strategy',  ic:'🎯', label:'Exam strategy',  desc:'Score plan' },
  { id:'summary',   ic:'📄', label:'Summary',        desc:'Quick overview' },
  { id:'mindmap',   ic:'🗺️',  label:'Mind map',       desc:'Visual structure' },
]

const TAG_COLORS = {
  key:     { bg:'var(--accent-bg)', color:'var(--accent)' },
  formula: { bg:'var(--purple-bg)', color:'var(--purple)' },
  example: { bg:'var(--green-bg)',  color:'var(--green)'  },
  warning: { bg:'var(--amber-bg)',  color:'var(--amber)'  },
  qa:      { bg:'var(--red-bg)',    color:'var(--red)'    },
  summary: { bg:'var(--accent-bg)', color:'var(--accent)' },
}

// ── Render result sections ──
function ResultView({ text }) {
  if (!text) return null
  const sections = text.split(/(?=##\s)/g).filter(Boolean)
  if (sections.length <= 1) {
    return <div className="result-card"><p style={{fontSize:13,lineHeight:1.7,whiteSpace:'pre-wrap'}}>{text.replace(/\*\*/g,'')}</p></div>
  }
  return (
    <>
      {sections.map((sec, i) => {
        const lines   = sec.trim().split('\n')
        const heading = lines[0].replace(/^#+\s*/, '')
        const body    = lines.slice(1).join('\n')
        const isCheat = /cheat|sheet|memory|quick/i.test(heading)
        const items   = body.split('\n').filter(l => l.trim()).map(b => b.replace(/^[-•*]\s*/, '').replace(/\*\*/g,''))
        if (isCheat) return (
          <div key={i} className="cheat-card" style={{animationDelay:`${i*0.05}s`}}>
            <h4>⚡ {heading}</h4>
            <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
              {items.map((c,j) => <span key={j} className="cheat-item">{c}</span>)}
            </div>
          </div>
        )
        return (
          <div key={i} className="result-card" style={{animationDelay:`${i*0.05}s`}}>
            <h4>{heading}</h4>
            <ul>{items.map((b,j) => <li key={j}>{b}</li>)}</ul>
          </div>
        )
      })}
    </>
  )
}

// ── Analyzer Page ──
function AnalyzerPage() {
  const { files, activeFile, activeMode, result, setActiveFile, setMode, analyze, isLoading, lang, setTab, generateNotesFromAnalysis } = useStore()
  const loading = isLoading('analyze')

  const copyResult = () => {
    if (!result) return
    navigator.clipboard.writeText(result).then(() => toast('Copied ✓', 'success'))
  }

  const exportResult = () => {
    if (!result) return
    const a = document.createElement('a')
    a.href     = URL.createObjectURL(new Blob([result], {type:'text/plain'}))
    a.download = `${activeFile?.name || 'analysis'}_${activeMode}.txt`
    a.click()
  }

  const saveToNotes = async () => {
    if (!result) return
    await generateNotesFromAnalysis(result, activeFile)
    toast('Saved to Notes 📝', 'success')
    setTab('notes')
  }

  const runAnalysis = async () => {
    if (!activeFile || !activeMode) return
    try {
      await analyze()
      toast('Analysis complete ✓', 'success')
    } catch (e) {
      toast(e.message || 'Analysis failed', 'error')
    }
  }

  return (
    <div className="az-layout">
      {/* Left Panel */}
      <div className="az-left">
        {/* File selector */}
        <div className="az-panel">
          <div className="az-panel-title">Active Document</div>
          {activeFile ? (
            <div className="doc-card">
              <div className="doc-icon" style={{background: FT[activeFile.ext]?.bg || '#f0f0f0'}}>
                {FT[activeFile.ext]?.ic || '📁'}
              </div>
              <div className="doc-info">
                <div className="doc-name">{activeFile.name}</div>
                <div className="doc-meta">{activeFile.size} · {activeFile.chars?.toLocaleString()} chars</div>
              </div>
              <span className="doc-change" onClick={() => setTab('files')}>Change</span>
            </div>
          ) : (
            <div style={{padding:'12px 0',textAlign:'center'}}>
              <FileUploadZone />
              <div style={{marginTop:8,fontSize:12,color:'var(--text3)'}}>or <span style={{color:'var(--accent)',cursor:'pointer'}} onClick={()=>setTab('files')}>choose from Files</span></div>
            </div>
          )}
        </div>

        {/* Mode grid */}
        <div className="az-panel">
          <div className="az-panel-title">Analysis Mode</div>
          <div className="mode-grid">
            {MODES.map(m => (
              <div key={m.id} className={`mode-card${activeMode===m.id?' sel':''}`} onClick={() => setMode(m.id)}>
                <div className="mc-ic">{m.ic}</div>
                <div className="mc-name">{m.label}</div>
                <div className="mc-desc">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Analyze button */}
        <div className="az-panel">
          <button
            className="az-btn"
            disabled={!activeFile || !activeMode || loading}
            onClick={runAnalysis}
          >
            {loading ? (
              <><div className="loading-dots" style={{display:'inline-flex',gap:4,marginRight:8}}>
                <div className="loading-dot" style={{width:6,height:6}}/>
                <div className="loading-dot" style={{width:6,height:6}}/>
                <div className="loading-dot" style={{width:6,height:6}}/>
              </div> Analyzing…</>
            ) : !activeFile ? '↑ Upload a file first'
              : !activeMode ? '← Select a mode'
              : <><Icon name="lightning" size={15}/> Analyze with AI</>
            }
          </button>
          <div style={{fontSize:11,color:'var(--text4)',textAlign:'center',marginTop:6}}>
            Powered by free LLMs via OpenRouter
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="az-right">
        {result && (
          <div className="result-hdr">
            <div className="result-label">
              <span>{MODES.find(m=>m.id===activeMode)?.ic}</span>
              <span>{MODES.find(m=>m.id===activeMode)?.label}</span>
            </div>
            <div className="result-actions">
              <button className="btn-sm" onClick={saveToNotes}><Icon name="notes" size={12}/> Save to Notes</button>
              <button className="btn-sm" onClick={copyResult}><Icon name="copy" size={12}/> Copy</button>
              <button className="btn-sm" onClick={exportResult}><Icon name="download" size={12}/> Export</button>
            </div>
          </div>
        )}
        <div className="az-result-area">
          {loading ? (
            <div className="loading-wrap">
              <div className="loading-dots">
                <div className="loading-dot"/><div className="loading-dot"/><div className="loading-dot"/>
              </div>
              <div className="loading-text">Analyzing with free AI models…</div>
              <div style={{fontSize:12,color:'var(--text4)'}}>Using OpenRouter free tier • No cost</div>
            </div>
          ) : result ? (
            <ResultView text={result} />
          ) : (
            <div className="empty-state">
              <div className="es-icon">📄</div>
              <p>Upload a document, choose a mode, and click Analyze.<br/><br/>
              <strong style={{color:'var(--green)'}}>100% Free</strong> — powered by Llama 3, Mistral, Gemma via OpenRouter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── File Upload Zone ──
function FileUploadZone() {
  const { uploadFile, setActiveFile } = useStore()
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  const handle = async (files) => {
    for (const file of files) {
      try {
        const data = await uploadFile(file)
        setActiveFile(data)
        toast(`✓ ${file.name} uploaded`, 'success')
      } catch (e) {
        toast(e.message || 'Upload failed', 'error')
      }
    }
  }

  return (
    <div
      className={`dropzone${dragging?' dragging':''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={e=>{e.preventDefault();setDragging(true)}}
      onDragLeave={()=>setDragging(false)}
      onDrop={e=>{e.preventDefault();setDragging(false);handle(Array.from(e.dataTransfer.files))}}
    >
      <input ref={inputRef} type="file" multiple accept=".pdf,.docx,.pptx,.txt,.xlsx,.png,.jpg,.jpeg" style={{display:'none'}}
        onChange={e=>handle(Array.from(e.target.files))} />
      <div className="dz-icon">📎</div>
      <div className="dz-text">Drop files or click to upload</div>
      <div className="dz-hint">PDF, DOCX, PPTX, TXT, XLSX, Images</div>
    </div>
  )
}

// ── Files Page ──
function FilesPage() {
  const { files, activeFile, setActiveFile, deleteFile, setTab, fetchFiles } = useStore()
  useEffect(() => { fetchFiles() }, [])

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div className="files-toolbar">
        <span style={{fontWeight:500}}>📁 My Files ({files.length})</span>
        <div style={{marginLeft:'auto'}}>
          <FileUploadZone />
        </div>
      </div>
      {!files.length ? (
        <div className="empty-state"><div className="es-icon">📭</div><p>No files yet. Upload documents above.</p></div>
      ) : (
        <div className="files-grid">
          {files.map(f => {
            const ft = FT[f.ext] || {ic:'📁',bg:'#f0f0f0',color:'#888'}
            const active = activeFile?.id === f.id
            return (
              <div key={f.id} className={`file-card${active?' selected':''}`}
                onClick={() => { setActiveFile(f); setTab('analyzer') }}>
                <div className="fc-actions">
                  <button className="fc-act-btn" onClick={e=>{e.stopPropagation();deleteFile(f.id)}} title="Delete">
                    <Icon name="trash" size={11}/>
                  </button>
                </div>
                <div className="fc-icon" style={{background:ft.bg}}>{ft.ic}</div>
                <div className="fc-name">{f.name}</div>
                <div className="fc-meta">{f.size} · {f.ext.toUpperCase()}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Flashcards Page ──
function FlashcardsPage() {
  const { activeFile, generateFlashcards, isLoading } = useStore()
  const [cards, setCards]     = useState([])
  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const loading = isLoading('flashcards')

  const generate = async () => {
    if (!activeFile) { toast('Select a file first', 'error'); return }
    const result = await generateFlashcards()
    if (result.length) { setCards(result); setCurrent(0); setFlipped(false); toast(`${result.length} flashcards generated ✓`, 'success') }
    else toast('Could not generate flashcards', 'error')
  }

  const shuffle = () => { setCards(prev => [...prev].sort(()=>Math.random()-.5)); setCurrent(0); setFlipped(false) }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div className="fc-controls">
        <span style={{fontWeight:500}}>🃏 Flashcards</span>
        <div style={{marginLeft:'auto',display:'flex',gap:6}}>
          <button className="btn-sm accent" onClick={generate} disabled={loading}>
            {loading ? 'Generating…' : <><Icon name="lightning" size={12}/> Generate</>}
          </button>
          {cards.length > 0 && <button className="btn-sm" onClick={shuffle}>🔀 Shuffle</button>}
        </div>
      </div>

      {loading ? (
        <div className="loading-wrap"><div className="loading-dots"><div className="loading-dot"/><div className="loading-dot"/><div className="loading-dot"/></div><div className="loading-text">Generating flashcards with free AI…</div></div>
      ) : !cards.length ? (
        <div className="empty-state"><div className="es-icon">🃏</div><p>Select a file then click Generate to create flashcards with free AI.</p></div>
      ) : (
        <>
          <div style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:12,borderBottom:'1px solid var(--border)'}}>
            <span style={{fontSize:13,color:'var(--text3)'}}>{current+1} / {cards.length}</span>
            <div className="quiz-prog-bar" style={{flex:1}}><div className="quiz-prog-fill" style={{width:`${((current+1)/cards.length*100).toFixed(0)}%`}}/></div>
          </div>
          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
            <div className="flashcard-scene" onClick={()=>setFlipped(!flipped)}>
              <div className={`flashcard${flipped?' flipped':''}`}>
                <div className="fc-face"><p>{cards[current]?.front}</p></div>
                <div className="fc-face back"><p>{cards[current]?.back}</p></div>
              </div>
            </div>
          </div>
          <div style={{padding:'0 20px 20px',display:'flex',justifyContent:'center',gap:12}}>
            <button className="btn-sm" onClick={()=>{if(current>0){setCurrent(c=>c-1);setFlipped(false)}}}>← Prev</button>
            <button className="btn-sm" onClick={()=>setFlipped(!flipped)}>↩ Flip</button>
            <button className="btn-sm accent" onClick={()=>{if(current<cards.length-1){setCurrent(c=>c+1);setFlipped(false)}else toast('End of cards! 🎉','success')}}>Next →</button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Quiz Page ──
function QuizPage() {
  const { activeFile, generateQuiz, isLoading } = useStore()
  const [questions, setQuestions] = useState([])
  const [answers,   setAnswers]   = useState({})
  const loading = isLoading('quiz')

  const generate = async () => {
    if (!activeFile) { toast('Select a file first', 'error'); return }
    const qs = await generateQuiz()
    if (qs.length) { setQuestions(qs); setAnswers({}); toast(`${qs.length} questions generated ✓`, 'success') }
    else toast('Could not generate quiz', 'error')
  }

  const selectOpt = (qi, letter, correct) => {
    setAnswers(prev => ({ ...prev, [qi]: letter }))
  }

  const submit = () => {
    const total   = questions.length
    const correct = Object.entries(answers).filter(([qi, a]) => a === (questions[parseInt(qi)].correct_answer||'a').charAt(0)).length
    const pct     = Math.round((correct/total)*100)
    toast(`Score: ${correct}/${total} (${pct}%) 🎯`, pct>=70?'success':'warning', 5000)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <span style={{fontWeight:500}}>❓ Quiz</span>
        <div style={{marginLeft:'auto',display:'flex',gap:6}}>
          <button className="btn-sm accent" onClick={generate} disabled={loading}>
            {loading ? 'Generating…' : <><Icon name="lightning" size={12}/> Generate Quiz</>}
          </button>
          {questions.length > 0 && <button className="btn-sm" onClick={submit}>Check Score 🎯</button>}
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:20}}>
        {loading ? (
          <div className="loading-wrap"><div className="loading-dots"><div className="loading-dot"/><div className="loading-dot"/><div className="loading-dot"/></div><div className="loading-text">Generating quiz…</div></div>
        ) : !questions.length ? (
          <div className="empty-state"><div className="es-icon">❓</div><p>Select a file then click Generate Quiz.</p></div>
        ) : (
          questions.map((q,i) => {
            const sel     = answers[i]
            const correct = (q.correct_answer||'a').charAt(0)
            return (
              <div key={i} className="quiz-card">
                <div style={{fontSize:11,fontWeight:600,color:'var(--text4)',marginBottom:8}}>QUESTION {i+1}</div>
                <div className="quiz-q">{q.question}</div>
                <div className="quiz-options">
                  {(q.options||[]).map((opt,j) => {
                    const letter = String.fromCharCode(97+j)
                    let cls = 'quiz-opt'
                    if (sel) { if (letter === correct) cls += ' correct'; else if (letter === sel) cls += ' wrong' }
                    return <button key={j} className={cls} onClick={() => !sel && selectOpt(i, letter, correct)}>{opt}</button>
                  })}
                </div>
                {sel && q.explanation && (
                  <div style={{marginTop:10,fontSize:12,color:sel===correct?'var(--green)':'var(--red)',lineHeight:1.5}}>
                    {sel===correct?'✓ Correct! ':'✗ Incorrect. '}{q.explanation}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── Tutor / Chat Page ──
function TutorPage() {
  const { chatHistory, sendChat, isLoading, activeFile, clearChat } = useStore()
  const [input, setInput] = useState('')
  const msgRef = useRef()
  const loading = isLoading('chat')

  useEffect(() => { if (msgRef.current) msgRef.current.scrollTop = msgRef.current.scrollHeight }, [chatHistory])

  const send = async () => {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    try {
      await sendChat(msg)
    } catch(e) {
      toast(e.message || 'Chat failed', 'error')
    }
  }

  const suggestions = ['Explain the main topics', 'Key formulas?', 'Give me exam tips', 'Common mistakes', 'Summarize this', 'Quiz me']

  return (
    <div className="tutor-page">
      {activeFile && (
        <div style={{padding:'8px 16px',background:'var(--accent-bg)',borderBottom:'1px solid var(--border)',fontSize:13,color:'var(--text2)',flexShrink:0}}>
          📖 Tutoring on: <strong>{activeFile.name}</strong>
        </div>
      )}
      <div style={{padding:'8px 12px',borderBottom:'1px solid var(--border)',display:'flex',gap:6,flexWrap:'wrap',flexShrink:0}}>
        {suggestions.map(s => (
          <button key={s} className="enhance-btn" onClick={() => { setInput(s); }}>{s}</button>
        ))}
      </div>
      <div className="tutor-msgs" ref={msgRef}>
        {!chatHistory.length && (
          <div className="msg-bubble msg-ai">
            👋 Hi! I'm your free AI study tutor powered by Llama 3 & Mistral. Ask me anything about your documents!
          </div>
        )}
        {chatHistory.map((msg, i) => (
          <div key={i} className={`msg-bubble msg-${msg.role === 'user' ? 'user' : 'ai'}`}
            dangerouslySetInnerHTML={{__html: msg.content.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')}} />
        ))}
        {loading && (
          <div className="msg-bubble msg-ai">
            <div className="loading-dots"><div className="loading-dot"/><div className="loading-dot"/><div className="loading-dot"/></div>
          </div>
        )}
      </div>
      <div className="tutor-input-area">
        <textarea
          className="tutor-input"
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}}
          placeholder="Ask anything about your document… (Enter to send)"
          rows={1}
          style={{resize:'none'}}
        />
        <button className="az-btn" style={{width:44,flexShrink:0}} onClick={send} disabled={loading}>
          <Icon name="send" size={15}/>
        </button>
        <button className="btn-sm" onClick={clearChat} title="Clear chat"><Icon name="trash" size={12}/></button>
      </div>
    </div>
  )
}

// ── Notes Page ──
function NotesPage() {
  const { notes, activeNote, createNote, updateNote, deleteNote, setActiveNote, fetchNotes, enhanceNote, lang } = useStore()
  const [view,       setView]       = useState('list')  // list | editor
  const [searchQ,    setSearchQ]    = useState('')
  const [editTitle,  setEditTitle]  = useState('')
  const [editContent,setEditContent]= useState('')
  const [editTag,    setEditTag]    = useState('key')
  const [enhancing,  setEnhancing]  = useState(false)
  const [enhanceOut, setEnhanceOut] = useState('')

  useEffect(() => { fetchNotes(searchQ) }, [searchQ])

  const openEditor = (note) => {
    setActiveNote(note)
    setEditTitle(note.title)
    setEditContent(note.content)
    setEditTag(note.tag)
    setView('editor')
    setEnhanceOut('')
  }

  const newNote = () => {
    openEditor({ id: null, title:'New Note', content:'', tag:'key' })
  }

  const save = async () => {
    if (activeNote?.id) {
      await updateNote(activeNote.id, { title: editTitle, content: editContent, tag: editTag })
    } else {
      await createNote({ title: editTitle, content: editContent, tag: editTag })
    }
    await fetchNotes()
    toast('Note saved ✓', 'success', 2000)
    setView('list')
  }

  const handleEnhance = async (action) => {
    setEnhancing(true)
    setEnhanceOut('')
    try {
      const result = await enhanceNote(editContent, action, lang)
      if (action === 'expand' || action === 'simplify' || action === 'rewrite') {
        setEditContent(result)
      } else {
        setEnhanceOut(result)
      }
    } catch(e) {
      toast('Enhancement failed', 'error')
    } finally {
      setEnhancing(false)
    }
  }

  const exportAll = () => {
    const md = notes.map(n => `# ${n.title}\n\n${n.content}\n\n---\n`).join('\n')
    const a  = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([md], {type:'text/markdown'}))
    a.download = 'StudyAI_Notes.md'
    a.click()
  }

  const pinned = notes.filter(n => n.pinned)
  const rest   = notes.filter(n => !n.pinned)

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      {/* Toolbar */}
      <div className="files-toolbar">
        <span style={{fontWeight:500}}>📝 Notes ({notes.length})</span>
        <div style={{display:'flex',gap:6,marginLeft:'auto'}}>
          <input
            style={{height:28,padding:'0 10px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--bg2)',color:'var(--text1)',fontSize:12,outline:'none'}}
            placeholder="Search notes…"
            value={searchQ}
            onChange={e=>setSearchQ(e.target.value)}
          />
          {view==='list' ? (
            <>
              <button className="btn-sm accent" onClick={newNote}><Icon name="plus" size={12}/> New Note</button>
              <button className="btn-sm" onClick={exportAll}><Icon name="download" size={12}/> Export All</button>
            </>
          ) : (
            <>
              <button className="btn-sm accent" onClick={save}>Save</button>
              <button className="btn-sm" onClick={()=>setView('list')}>← Back</button>
            </>
          )}
        </div>
      </div>

      {view === 'list' ? (
        <div style={{flex:1,overflowY:'auto',padding:16}}>
          {!notes.length ? (
            <div className="empty-state"><div className="es-icon">📝</div><p>No notes yet. Analyze a document to auto-generate notes, or click New Note.</p></div>
          ) : (
            <>
              {pinned.length > 0 && <div style={{fontSize:10,fontWeight:600,letterSpacing:'.8px',textTransform:'uppercase',color:'var(--text4)',marginBottom:6}}>📌 Pinned</div>}
              {[...pinned, ...rest].map(n => {
                const tc = TAG_COLORS[n.tag] || TAG_COLORS.key
                return (
                  <div key={n.id} className="note-item" onClick={() => openEditor(n)}>
                    <span style={{...tc, fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:20,marginBottom:5,display:'inline-block',textTransform:'uppercase',letterSpacing:'.5px'}}>{n.tag}</span>
                    <div style={{fontWeight:500,fontSize:13,marginBottom:4}}>{n.title}</div>
                    <div style={{fontSize:12,color:'var(--text2)',lineHeight:1.5,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{n.content}</div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6}}>
                      <span style={{fontSize:10,color:'var(--text4)'}}>{n.file_name ? `📄 ${n.file_name.slice(0,20)}` : ''}</span>
                      <div className="note-item-actions" style={{display:'flex',gap:4}}>
                        <button className="note-action-btn" onClick={e=>{e.stopPropagation();updateNote(n.id,{pinned:!n.pinned}).then(()=>fetchNotes())}} title="Pin">
                          <Icon name="pin" size={10}/>
                        </button>
                        <button className="note-action-btn" style={{color:'var(--red)'}} onClick={e=>{e.stopPropagation();if(confirm('Delete?'))deleteNote(n.id).then(()=>fetchNotes())}} title="Delete">
                          <Icon name="trash" size={10}/>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      ) : (
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          {/* Editor */}
          <div style={{padding:'8px 12px',borderBottom:'1px solid var(--border)',display:'flex',gap:6,flexWrap:'wrap',flexShrink:0}}>
            <select value={editTag} onChange={e=>setEditTag(e.target.value)} style={{height:26,padding:'0 8px',border:'1px solid var(--border)',borderRadius:6,background:'var(--surface)',color:'var(--text1)',fontSize:11,cursor:'pointer'}}>
              <option value="key">Key Concept</option>
              <option value="formula">Formula</option>
              <option value="example">Example</option>
              <option value="warning">Watch Out</option>
              <option value="qa">Q&A</option>
              <option value="summary">Summary</option>
            </select>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:16}}>
            <input
              value={editTitle}
              onChange={e=>setEditTitle(e.target.value)}
              style={{width:'100%',border:'none',outline:'none',fontFamily:'var(--ff-head)',fontSize:20,fontWeight:500,background:'transparent',color:'var(--text1)',marginBottom:12}}
              placeholder="Note title…"
            />
            <textarea
              value={editContent}
              onChange={e=>setEditContent(e.target.value)}
              style={{width:'100%',minHeight:200,border:'none',outline:'none',fontSize:13,lineHeight:1.7,background:'transparent',color:'var(--text1)',resize:'none',fontFamily:'var(--ff-body)'}}
              placeholder="Start writing your note…"
            />
          </div>
          {/* AI Enhance */}
          <div style={{padding:'10px 12px',borderTop:'1px solid var(--border)',background:'var(--bg2)',flexShrink:0}}>
            <div style={{fontSize:10,fontWeight:600,letterSpacing:'.8px',textTransform:'uppercase',color:'var(--text4)',marginBottom:6}}>✨ AI Enhance</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
              {['expand','simplify','summary','missing','rewrite','bullets'].map(a => (
                <button key={a} className="enhance-btn" onClick={()=>handleEnhance(a)} disabled={enhancing}>
                  {a}
                </button>
              ))}
            </div>
            {enhancing && <div style={{fontSize:12,color:'var(--text3)',marginTop:6}}>AI thinking…</div>}
            {enhanceOut && <div style={{fontSize:12,color:'var(--text2)',marginTop:8,lineHeight:1.6,maxHeight:100,overflowY:'auto',background:'var(--surface)',padding:8,borderRadius:'var(--radius)'}}>{enhanceOut}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Progress Page ──
function ProgressPage() {
  const { files, notes, xp } = useStore()
  const streak = parseInt(localStorage.getItem('streak') || '1')
  const analyses = parseInt(localStorage.getItem('analyses') || '0')

  const stats = [
    { val: files.length,  label: 'Files uploaded', ic: '📁' },
    { val: notes.length,  label: 'Notes created',  ic: '📝' },
    { val: xp,            label: 'Total XP',        ic: '⭐' },
    { val: streak + '🔥', label: 'Day streak',      ic: '🔥' },
  ]

  const badges = [
    { id:'uploader', name:'First Upload',  ic:'📁', earned: files.length >= 1 },
    { id:'analyzer', name:'Analyzer',      ic:'🔬', earned: xp >= 50 },
    { id:'scholar',  name:'Scholar',       ic:'🎓', earned: xp >= 200 },
    { id:'notes',    name:'Note Taker',    ic:'📝', earned: notes.length >= 5 },
    { id:'streak',   name:'7-Day Streak',  ic:'🔥', earned: streak >= 7 },
  ]

  return (
    <div style={{flex:1,overflowY:'auto',padding:24}}>
      <div className="stats-grid">
        {stats.map((s,i) => (
          <div key={i} className="stat-card">
            <div style={{fontSize:28,marginBottom:4}}>{s.ic}</div>
            <div className="stat-card-val">{s.val}</div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:20,marginTop:16}}>
        <h4 style={{fontFamily:'var(--ff-head)',fontSize:16,fontWeight:500,marginBottom:16}}>🏅 Badges</h4>
        <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
          {badges.map(b => (
            <div key={b.id} className="badge-item" style={{opacity:b.earned?1:0.35,filter:b.earned?'none':'grayscale(1)'}}>
              <span style={{fontSize:20}}>{b.ic}</span>
              <span style={{fontSize:12}}>{b.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{marginTop:16,padding:16,background:'var(--green-bg)',border:'1px solid var(--green)',borderRadius:'var(--radius-lg)',fontSize:13,color:'var(--green)'}}>
        ✅ <strong>100% Free</strong> — This app uses OpenRouter free tier models (Llama 3, Mistral, Gemma). No API costs for you or users.
      </div>
    </div>
  )
}

// ── Settings Modal ──
function SettingsModal({ onClose }) {
  const [key, setKey] = useState(localStorage.getItem('openrouter_key') || '')
  const save = () => {
    localStorage.setItem('openrouter_key', key)
    // The key is used by backend via env var; this is just for reference
    toast('Settings noted. Set OPENROUTER_API_KEY in Render env vars.', 'info', 5000)
    onClose()
  }
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(2px)'}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="modal-box">
        <h2 className="modal-title">⚙️ Settings</h2>
        <div style={{background:'var(--accent-bg)',border:'1px solid var(--accent)',borderRadius:'var(--radius)',padding:12,marginBottom:16,fontSize:12,color:'var(--accent)'}}>
          <strong>🔑 API Key Setup:</strong> The OpenRouter API key is set as an environment variable <code>OPENROUTER_API_KEY</code> in your Render dashboard — not stored in browser. This keeps it secure.
        </div>
        <label className="modal-label">OpenRouter API Key (for reference)</label>
        <input className="modal-input" type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder="sk-or-…" />
        <div style={{fontSize:11,color:'var(--text3)',marginBottom:14}}>Get free key at <a href="https://openrouter.ai" target="_blank" style={{color:'var(--accent)'}}>openrouter.ai</a> · Free models included</div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Close</button>
          <button className="btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  )
}

// ── Main App ──
export default function App() {
  const { tab, setTab, theme, toggleTheme, lang, setLang, xp, files, fetchFiles, notes, fetchNotes } = useStore()
  const [notesOpen,    setNotesOpen]    = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    fetchFiles()
    fetchNotes()
  }, [])

  const TABS = [
    { id:'analyzer',  label:'Analyzer',   ic:'book' },
    { id:'files',     label:'Files',      ic:'folder' },
    { id:'flashcards',label:'Flashcards', ic:'cards' },
    { id:'quiz',      label:'Quiz',       ic:'quiz' },
    { id:'tutor',     label:'Tutor',      ic:'chat' },
    { id:'notes',     label:'Notes',      ic:'notes' },
    { id:'progress',  label:'Progress',   ic:'chart' },
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>
      {/* Topbar */}
      <header className="topbar">
        <div className="logo">
          <div className="logo-mark">AI</div>
          <span className="logo-name">Knowledge Pro</span>
          <span className="logo-badge">FREE</span>
        </div>
        <nav className="nav-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`ntab${tab===t.id?' active':''}`} onClick={()=>setTab(t.id)}>
              <Icon name={t.ic} size={14}/> <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="tb-right">
          <select
            value={lang}
            onChange={e=>setLang(e.target.value)}
            style={{height:28,padding:'0 8px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--bg2)',color:'var(--text1)',fontSize:12,cursor:'pointer',outline:'none'}}
          >
            <option value="en">🌐 EN</option>
            <option value="hi">🇮🇳 HI</option>
            <option value="te">🇮🇳 TE</option>
            <option value="ta">🇮🇳 TA</option>
            <option value="es">🇪🇸 ES</option>
            <option value="fr">🇫🇷 FR</option>
            <option value="de">🇩🇪 DE</option>
            <option value="zh">🇨🇳 ZH</option>
            <option value="ar">🇸🇦 AR</option>
          </select>
          <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
            <Icon name={theme==='dark'?'sun':'moon'} size={15}/>
          </button>
          <button className="icon-btn" onClick={()=>setSettingsOpen(true)} title="Settings">
            <Icon name="settings" size={15}/>
          </button>
          <div className="xp-chip">⭐ {xp} XP</div>
        </div>
      </header>

      {/* Main content */}
      <div style={{flex:1,overflow:'hidden',display:'flex'}}>
        <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
          <div style={{flex:1,overflow:'hidden',display: tab==='analyzer'  ?'flex':'none',flexDirection:'column'}}><AnalyzerPage/></div>
          <div style={{flex:1,overflow:'hidden',display: tab==='files'     ?'flex':'none',flexDirection:'column'}}><FilesPage/></div>
          <div style={{flex:1,overflow:'hidden',display: tab==='flashcards'?'flex':'none',flexDirection:'column'}}><FlashcardsPage/></div>
          <div style={{flex:1,overflow:'hidden',display: tab==='quiz'      ?'flex':'none',flexDirection:'column'}}><QuizPage/></div>
          <div style={{flex:1,overflow:'hidden',display: tab==='tutor'     ?'flex':'none',flexDirection:'column'}}><TutorPage/></div>
          <div style={{flex:1,overflow:'hidden',display: tab==='notes'     ?'flex':'none',flexDirection:'column'}}><NotesPage/></div>
          <div style={{flex:1,overflow:'hidden',display: tab==='progress'  ?'flex':'none',flexDirection:'column'}}><ProgressPage/></div>
        </div>
      </div>

      {settingsOpen && <SettingsModal onClose={()=>setSettingsOpen(false)}/>}
      <ToastContainer/>
    </div>
  )
}

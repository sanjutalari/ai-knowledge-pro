// ══ DATA LAYER — StudyAI Pro (OpenRouter Edition) ══
const DB = {
  FT: {
    pdf:  { label:'PDF',  bg:'#FAECE7', tc:'#712B13', dot:'#D85A30', ic:'📄' },
    pptx: { label:'PPT',  bg:'#FAEEDA', tc:'#633806', dot:'#BA7517', ic:'📊' },
    ppt:  { label:'PPT',  bg:'#FAEEDA', tc:'#633806', dot:'#BA7517', ic:'📊' },
    docx: { label:'DOC',  bg:'#E6F1FB', tc:'#0C447C', dot:'#185FA5', ic:'📝' },
    doc:  { label:'DOC',  bg:'#E6F1FB', tc:'#0C447C', dot:'#185FA5', ic:'📝' },
    txt:  { label:'TXT',  bg:'#F1EFE8', tc:'#444441', dot:'#888780', ic:'📃' },
    xlsx: { label:'XLS',  bg:'#EAF3DE', tc:'#27500A', dot:'#639922', ic:'📈' },
    xls:  { label:'XLS',  bg:'#EAF3DE', tc:'#27500A', dot:'#639922', ic:'📈' },
    png:  { label:'IMG',  bg:'#FBEAF0', tc:'#72243E', dot:'#D4537E', ic:'🖼️' },
    jpg:  { label:'IMG',  bg:'#FBEAF0', tc:'#72243E', dot:'#D4537E', ic:'🖼️' },
    jpeg: { label:'IMG',  bg:'#FBEAF0', tc:'#72243E', dot:'#D4537E', ic:'🖼️' },
  },

  // Free models via OpenRouter
  OR_MODELS: [
    { id:'meta-llama/llama-3.1-8b-instruct:free',     label:'Llama 3.1 8B — Fast & Free',     badge:'FREE' },
    { id:'mistralai/mistral-7b-instruct:free',         label:'Mistral 7B — Smart & Free',       badge:'FREE' },
    { id:'google/gemma-2-9b-it:free',                  label:'Gemma 2 9B — Google Free',        badge:'FREE' },
    { id:'microsoft/phi-3-mini-128k-instruct:free',    label:'Phi-3 Mini 128K — Long Context',  badge:'FREE' },
    { id:'qwen/qwen-2.5-7b-instruct:free',             label:'Qwen 2.5 7B — Multilingual',      badge:'FREE' },
  ],

  DEFAULT_FOLDERS: [
    { id:'cs',   label:'Computer Science', ic:'💻', color:'#534AB7', parent:null, children:[] },
    { id:'math', label:'Mathematics',      ic:'📐', color:'#1D9E75', parent:null, children:[] },
    { id:'phy',  label:'Physics',          ic:'⚛️',  color:'#185FA5', parent:null, children:[] },
    { id:'chem', label:'Chemistry',        ic:'🧪', color:'#D85A30', parent:null, children:[] },
    { id:'bio',  label:'Biology',          ic:'🧬', color:'#639922', parent:null, children:[] },
    { id:'eco',  label:'Economics',        ic:'📉', color:'#BA7517', parent:null, children:[] },
    { id:'eng',  label:'English',          ic:'📚', color:'#D4537E', parent:null, children:[] },
    { id:'hist', label:'History',          ic:'🏛️',  color:'#888780', parent:null, children:[] },
  ],

  MODES: [
    { id:'full',      ic:'📚', label:'Full revision',  desc:'Every topic' },
    { id:'oneday',    ic:'☀️',  label:'1-day plan',     desc:'All topics fast' },
    { id:'crash',     ic:'⚡', label:'3-hr crash',     desc:'High-impact only' },
    { id:'cheat',     ic:'📋', label:'Cheat sheet',    desc:'One-page notes' },
    { id:'qa',        ic:'❓', label:'Q&A mode',       desc:'Exam questions' },
    { id:'lastnight', ic:'🌙', label:'Last night',     desc:'1-hr sprint' },
    { id:'beginner',  ic:'🌱', label:'Beginner+',      desc:'Deep learning' },
    { id:'strategy',  ic:'🎯', label:'Exam strategy',  desc:'Score plan' },
  ],

  PROMPTS: {
    full:      `Analyze ALL topics in this document and create a complete revision report. Structure output with ## for each topic heading. For each topic include: simple definition, why it matters, step-by-step explanation, real-life example, code example if applicable, common mistakes, 2-3 exam points. Use bullet points throughout. End with ## Quick Cheat Sheet section listing all key terms and formulas.`,
    oneday:    `Cover ALL topics for 1-day revision. ## heading per topic. Each: definition (1-2 lines), key concepts as bullets, one example, exam points, common mistakes. Concise. End with ## Final Cheat Sheet.`,
    crash:     `Crash revision — high-weightage topics only. ## per topic. Ultra-short: definition, 3 key points, one example, must-remember line. End with ## Memory Sheet of all critical facts.`,
    cheat:     `Create a one-page cheat sheet. ## sections for each topic. Only: definitions, formulas, syntax, keywords, common mistakes. Extremely short. No explanations. Easy to memorize.`,
    qa:        `Generate exam Q&A. ## sections: 2-mark questions with answers, 5-mark questions with answers, 10-mark questions with detailed answers, important programs/algorithms, viva questions. Exam-ready answers.`,
    lastnight: `Last-night revision only. ## per topic. ONLY: key definitions, important formulas, diagrams in text, tricky points, common mistakes, repeated exam questions. Very short bullet points.`,
    beginner:  `Teach from zero. ## per topic. Simple definition, step-by-step explanation, real-life example, code example if applicable, exam points, 2 practice questions with answers.`,
    strategy:  `Smart Exam Strategy report. Create ## sections: Easy scoring topics, High-weightage topics, Risky topics, Time allocation table (topic | time | priority), Recommended writing order, Quick win topics. Priority score each topic 1-10.`,
  },

  LANGS: {
    en: 'Analyze and respond in English.',
    hi: 'विश्लेषण करें और हिंदी में जवाब दें।',
    te: 'విశ్లేషించండి మరియు తెలుగులో సమాధానం ఇవ్వండి.',
    ta: 'பகுப்பாய்வு செய்து தமிழில் பதிலளிக்கவும்.',
    es: 'Analiza y responde en Español.',
    fr: 'Analysez et répondez en Français.',
    de: 'Analysieren und auf Deutsch antworten.',
    zh: '用中文分析并回答。',
    ar: 'قم بالتحليل والرد باللغة العربية.',
  },

  NOTE_TAGS: [
    { id:'key',     label:'Key Concept', color:'blue' },
    { id:'formula', label:'Formula',     color:'purple' },
    { id:'example', label:'Example',     color:'green' },
    { id:'warning', label:'Watch Out',   color:'amber' },
    { id:'qa',      label:'Q&A',         color:'red' },
    { id:'summary', label:'Summary',     color:'blue' },
  ],

  // State
  files: [], folders: [], sessions: [], flashcards: [], quizzes: [],
  notes: [], undoStack: [],
  stats: { analyses:0, flashcardsReviewed:0, quizzesTaken:0, quizScore:0, streak:0, xp:0, lastActive:null, badges:[] },
  settings: { theme:'light', lang:'en', sidebarOpen:true, model:'meta-llama/llama-3.1-8b-instruct:free' },

  init() {
    this.files      = JSON.parse(localStorage.getItem('sa_files')      || '[]');
    this.folders    = JSON.parse(localStorage.getItem('sa_folders')    || JSON.stringify(this.DEFAULT_FOLDERS));
    this.sessions   = JSON.parse(localStorage.getItem('sa_sessions')   || '[]');
    this.flashcards = JSON.parse(localStorage.getItem('sa_flashcards') || '[]');
    this.quizzes    = JSON.parse(localStorage.getItem('sa_quizzes')    || '[]');
    this.notes      = JSON.parse(localStorage.getItem('sa_notes_v2')   || '[]');
    this.stats      = JSON.parse(localStorage.getItem('sa_stats')      || JSON.stringify(this.stats));
    this.settings   = JSON.parse(localStorage.getItem('sa_settings')   || JSON.stringify(this.settings));

    // Migrate old notes
    const oldNotes = JSON.parse(localStorage.getItem('sa_notes') || '[]');
    if (oldNotes.length && !this.notes.length) {
      this.notes = oldNotes.map(n => ({
        id: n.id || this.uid(), title: n.text?.substring(0,40) || 'Note',
        content: n.text || '', tag: 'key', folder: null, fileId: null,
        fileName: n.file || null, created: n.id || Date.now(), updated: n.id || Date.now(),
        versions: [], linkedNotes: [], pinned: false,
      }));
    }

    // Validate model
    const validIds = this.OR_MODELS.map(m => m.id);
    if (!validIds.includes(this.settings.model)) {
      this.settings.model = this.OR_MODELS[0].id;
    }
    this.undoStack = [];
    if (!this.files.length) this._loadDemo();
  },

  save() {
    localStorage.setItem('sa_files',      JSON.stringify(this.files));
    localStorage.setItem('sa_folders',    JSON.stringify(this.folders));
    localStorage.setItem('sa_sessions',   JSON.stringify(this.sessions));
    localStorage.setItem('sa_flashcards', JSON.stringify(this.flashcards));
    localStorage.setItem('sa_quizzes',    JSON.stringify(this.quizzes));
    localStorage.setItem('sa_notes_v2',   JSON.stringify(this.notes));
    localStorage.setItem('sa_stats',      JSON.stringify(this.stats));
    localStorage.setItem('sa_settings',   JSON.stringify(this.settings));
  },

  // Note helpers
  addNote(d) {
    const note = {
      id: this.uid(), title: d.title||'Untitled', content: d.content||'',
      tag: d.tag||'key', folder: d.folder||null, fileId: d.fileId||null,
      fileName: d.fileName||null, created: Date.now(), updated: Date.now(),
      versions: [], linkedNotes: d.linkedNotes||[], pinned: false,
    };
    this.notes.unshift(note); this.save(); return note;
  },

  updateNote(id, changes) {
    const idx = this.notes.findIndex(n => n.id === id);
    if (idx === -1) return;
    const note = this.notes[idx];
    note.versions = note.versions || [];
    if (changes.content && note.content !== changes.content) {
      note.versions.unshift({ content: note.content, updated: note.updated });
      if (note.versions.length > 10) note.versions.pop();
    }
    Object.assign(note, changes, { updated: Date.now() });
    this.save();
  },

  deleteNote(id) { this.notes = this.notes.filter(n => n.id !== id); this.save(); },

  searchNotes(q) {
    if (!q) return this.notes;
    const ql = q.toLowerCase();
    return this.notes.filter(n =>
      n.title.toLowerCase().includes(ql) ||
      n.content.toLowerCase().includes(ql) ||
      (n.fileName||'').toLowerCase().includes(ql)
    );
  },

  getRelatedNotes(noteId, limit=3) {
    const note = this.notes.find(n => n.id === noteId);
    if (!note) return [];
    const words = (note.title+' '+note.content).toLowerCase().split(/\W+/).filter(w=>w.length>3);
    return this.notes
      .filter(n => n.id !== noteId)
      .map(n => ({ note:n, score: words.filter(w=>(n.title+' '+n.content).toLowerCase().includes(w)).length }))
      .filter(x => x.score > 0)
      .sort((a,b) => b.score - a.score)
      .slice(0, limit).map(x => x.note);
  },

  // File helpers
  getft(name) {
    const e = (name||'').split('.').pop().toLowerCase();
    return this.FT[e] || { label:e.toUpperCase()||'FILE', bg:'#F1EFE8', tc:'#444441', dot:'#888780', ic:'📁' };
  },
  ext(n)     { return (n||'').split('.').pop().toLowerCase(); },
  fmtSize(b) { if(!b)return'—'; if(b<1024)return b+'B'; if(b<1048576)return Math.round(b/1024)+'KB'; return (b/1048576).toFixed(1)+'MB'; },
  fmtDate(ts){ return new Date(ts).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'}); },
  uid()      { return 'id_'+Date.now()+'_'+Math.random().toString(36).slice(2,7); },

  getFolderById(id) { return this._findFolder(this.folders, id); },
  _findFolder(arr, id) {
    for (const f of arr) {
      if (f.id===id) return f;
      if (f.children) { const found=this._findFolder(f.children,id); if(found)return found; }
    }
    return null;
  },
  getAllFolders() {
    const all=[]; const c=(arr)=>arr.forEach(f=>{all.push(f);if(f.children)c(f.children);}); c(this.folders); return all;
  },

  addXP(amount) { this.stats.xp=(this.stats.xp||0)+amount; this.save(); },

  updateStreak() {
    const today=new Date().toDateString();
    if(this.stats.lastActive!==today){ this.stats.streak=(this.stats.streak||0)+1; this.stats.lastActive=today; this.save(); }
  },

  checkBadges() {
    const badges=this.stats.badges||[];
    const checks=[
      {id:'first_upload', name:'First Upload',  ic:'📁', cond:this.files.length>=1},
      {id:'five_analyses',name:'5 Analyses',    ic:'🔬', cond:this.stats.analyses>=5},
      {id:'flashmaster',  name:'Flash Master',  ic:'🃏', cond:this.stats.flashcardsReviewed>=20},
      {id:'quizace',      name:'Quiz Ace',      ic:'🏆', cond:this.stats.quizzesTaken>=5},
      {id:'streak7',      name:'7-Day Streak',  ic:'🔥', cond:this.stats.streak>=7},
      {id:'scholar',      name:'Scholar',       ic:'🎓', cond:this.stats.xp>=500},
      {id:'note_taker',   name:'Note Taker',    ic:'📝', cond:this.notes.length>=5},
    ];
    let newBadge=null;
    checks.forEach(b=>{ if(b.cond&&!badges.includes(b.id)){badges.push(b.id);newBadge=b;} });
    this.stats.badges=badges; if(newBadge)this.save(); return newBadge;
  },

  _loadDemo() {
    this.files = [
      {id:'d1',name:'OS_Unit1.pdf',        size:1240000,type:'pdf', folder:'cs',  starred:true, added:Date.now()-86400000*3,rawText:'Operating System topics: Process Management including process states, PCB, context switching. Memory Management: paging, segmentation, virtual memory. CPU Scheduling: FCFS, SJF, Round Robin, Priority scheduling. Deadlock: detection, prevention, avoidance using Bankers algorithm. File Systems: FAT, NTFS, inodes.'},
      {id:'d2',name:'Data_Structures.pptx',size:840000, type:'pptx',folder:'cs',  starred:false,added:Date.now()-86400000*2,rawText:'Data Structures: Arrays - static, dynamic. Linked Lists - singly, doubly, circular. Stacks and Queues - applications, implementations. Trees: BST, AVL, B-tree, Heap. Graphs: BFS, DFS, Dijkstra, Floyd. Hashing: collision resolution.'},
      {id:'d3',name:'Calculus_Notes.docx', size:320000, type:'docx',folder:'math',starred:false,added:Date.now()-86400000,  rawText:'Calculus: Limits and continuity. Derivatives - chain rule, product rule, quotient rule. Integration - definite, indefinite, by parts, substitution. Differential equations. Series - Taylor, Maclaurin.'},
      {id:'d4',name:'Thermodynamics.pdf',  size:2100000,type:'pdf', folder:'phy', starred:true, added:Date.now()-86400000*5,rawText:'Thermodynamics: Zeroth law. First law - Q=dU+W. Second law - entropy, Carnot theorem. Third law - absolute zero. Heat engines, refrigerators. Gas laws: Boyle, Charles, Gay-Lussac.'},
    ];
    this.notes = [
      {id:'n1',title:'Process States in OS',content:'5 states: New→Ready→Running→Waiting→Terminated\n• PCB stores all process info\n• Context switching saves/restores CPU state',tag:'key',fileId:'d1',fileName:'OS_Unit1.pdf',created:Date.now()-86400000,updated:Date.now()-86400000,versions:[],linkedNotes:['n2'],pinned:true},
      {id:'n2',title:'Deadlock Conditions',content:'All 4 must hold:\n1. Mutual Exclusion\n2. Hold and Wait\n3. No Preemption\n4. Circular Wait',tag:'formula',fileId:'d1',fileName:'OS_Unit1.pdf',created:Date.now()-3600000,updated:Date.now()-3600000,versions:[],linkedNotes:['n1'],pinned:false},
    ];
    this.save();
  }
};

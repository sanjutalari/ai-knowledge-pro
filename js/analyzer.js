// ══ ANALYZER — OpenRouter Edition ══
const Analyzer = {
  activeFile: null,
  activeMode: null,
  lastResult: null,

  init() { this._renderModeGrid(); },

  _renderModeGrid() {
    const grid = document.getElementById('modeGrid');
    if (!grid) return;
    grid.innerHTML = DB.MODES.map((m,i) =>
      `<div class="mode-card${this.activeMode===m.id?' sel':''}"
        onclick="Analyzer.selectMode('${m.id}')"
        style="animation-delay:${i*0.05}s">
        <div class="mc-ic">${m.ic}</div>
        <div class="mc-name">${m.label}</div>
        <div class="mc-desc">${m.desc}</div>
      </div>`
    ).join('');
  },

  selectMode(id) {
    this.activeMode = id;
    this._renderModeGrid();
    this._updateBtn();
  },

  setActiveFile(f) {
    this.activeFile = f;
    if (!f) return;
    const ft = DB.getft(f.name);
    const card = document.getElementById('azDocCard');
    if (card) {
      card.innerHTML = `<div class="az-panel-title">Active File</div>
        <div class="doc-card animate__animated animate__fadeInLeft">
          <div class="doc-icon" style="background:${ft.bg}">${ft.ic}</div>
          <div class="doc-info">
            <div class="doc-name">${f.name}</div>
            <div class="doc-meta">${ft.label} · ${DB.fmtSize(f.size)} · ${DB.fmtDate(f.added)}</div>
          </div>
          <span class="doc-change" onclick="Nav.go('files')">Change</span>
        </div>`;
    }
    this._updateBtn();
    Tutor.setDoc(f);
  },

  _updateBtn() {
    const btn = document.getElementById('azBtn');
    if (!btn) return;
    btn.disabled = !(this.activeFile && this.activeMode);
    if (!this.activeFile)      btn.innerHTML = '<i class="bi bi-upload"></i> Upload first';
    else if (!this.activeMode) btn.innerHTML = '<i class="bi bi-hand-index"></i> Select a mode';
    else                       btn.innerHTML = '<i class="bi bi-lightning-charge-fill"></i> Analyze Free';
  },

  async runAnalysis() {
    if (!this.activeFile || !this.activeMode) return;
    const result = document.getElementById('azResult');
    const hdr    = document.getElementById('azResultHdr');
    if (hdr) hdr.style.display = 'none';

    result.innerHTML = `<div class="loading-wrap">
      <div class="loading-dots">
        <div class="loading-dot" style="background:var(--accent)"></div>
        <div class="loading-dot" style="background:var(--purple)"></div>
        <div class="loading-dot" style="background:var(--green)"></div>
      </div>
      <div class="loading-text">Analyzing with free AI…</div>
      <div style="font-size:12px;color:var(--text4);margin-top:4px">
        <i class="bi bi-stars text-success"></i> OpenRouter · ${DB.OR_MODELS.find(m=>m.id===DB.settings.model)?.label||'Free Model'}
      </div>
      <div class="loading-bar"><div class="loading-bar-fill" id="lbf" style="width:0%"></div></div>
    </div>`;

    let prog = 0;
    const iv = setInterval(() => {
      prog = Math.min(prog + Math.random()*8, 88);
      const el = document.getElementById('lbf');
      if (el) el.style.width = prog + '%';
    }, 400);

    try {
      const lang   = DB.settings.lang || 'en';
      const prompt = DB.PROMPTS[this.activeMode] + '\n\n' + (DB.LANGS[lang]||'');
      const f      = this.activeFile;
      const model  = DB.settings.model || DB.OR_MODELS[0].id;

      const body = {
        model,
        max_tokens: 1800,
        messages: [{
          role: 'user',
          content: `${prompt}\n\nDocument: ${f.name}\nContent:\n${f.rawText||f.name}\n\nStructure with ## headings. Use bullet points. End with ## Quick Cheat Sheet.`
        }]
      };

      // Call via server proxy (keeps API key server-side)
      const res  = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      clearInterval(iv);

      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

      const text = data.choices?.[0]?.message?.content || 'No response received.';
      const mode = DB.MODES.find(m => m.id === this.activeMode);
      this.lastResult = { text, mode: mode.label, file: f.name };

      this._renderResult(text);

      if (hdr) {
        hdr.style.display = 'flex';
        document.getElementById('azResultLabel').textContent = `${mode.ic} ${mode.label}`;
      }

      DB.stats.analyses = (DB.stats.analyses||0) + 1;
      DB.addXP(20); DB.updateStreak();
      const badge = DB.checkBadges();
      if (badge) UI.toast(`🏆 Badge unlocked: ${badge.name}!`, 'success', 4000);
      Progress.refresh(); UI.renderSidebar();

      setTimeout(() => Notes.generateFromAnalysis(text, f.name), 600);

    } catch(err) {
      clearInterval(iv);
      result.innerHTML = `<div class="result-card" style="border-color:var(--red)">
        <h4 style="color:var(--red)"><i class="bi bi-exclamation-triangle"></i> Error</h4>
        <p style="font-size:13px;color:var(--text2);margin-bottom:8px">${err.message}</p>
        <p style="font-size:12px;color:var(--text4)">
          Check: Is <code>OPENROUTER_API_KEY</code> set in your Render environment variables?<br>
          Visit <a href="/api/health" target="_blank">/api/health</a> to verify the server config.
        </p>
      </div>`;
      UI.toast(err.message, 'error', 6000);
    }
  },

  _renderResult(text) {
    const result   = document.getElementById('azResult');
    const sections = text.split(/(?=##\s)/g).filter(Boolean);

    // Quick action bar
    let quickBar = `<div class="quick-actions-bar">
      <button class="quick-action-btn" onclick="Analyzer.quickAction('summarize')"><i class="bi bi-file-text"></i> Summarize</button>
      <button class="quick-action-btn" onclick="Analyzer.quickAction('keypoints')"><i class="bi bi-list-check"></i> Key Points</button>
      <button class="quick-action-btn" onclick="Analyzer.quickAction('deepdive')"><i class="bi bi-search"></i> Deep Dive</button>
      <button class="quick-action-btn" onclick="Analyzer.showMindMap()"><i class="bi bi-diagram-3"></i> Mind Map</button>
    </div>`;

    if (sections.length > 1) {
      result.innerHTML = quickBar + sections.map((sec, i) => {
        const lines   = sec.trim().split('\n');
        const heading = lines[0].replace(/^#+\s*/, '');
        const body    = lines.slice(1).join('\n');
        const isCheat = /cheat|sheet|memory|quick/i.test(heading);
        const delay   = `animation-delay:${i*0.06}s`;
        if (isCheat) {
          const items = body.split('\n').filter(l=>l.trim()).map(b=>b.replace(/^[-•*]\s*/,'').replace(/\*\*/g,''));
          return `<div class="cheat-card" style="${delay}">
            <h4>⚡ ${heading}</h4>
            <div style="display:flex;flex-wrap:wrap;gap:4px">${items.map(c=>`<div class="cheat-item">${c}</div>`).join('')}</div>
          </div>`;
        }
        const items = body.split('\n').filter(l=>/^[-•*]/.test(l.trim())).map(b=>b.replace(/^[-•*]\s*/,'').replace(/\*\*/g,''));
        return `<div class="result-card" style="${delay}">
          <h4>${heading}</h4>
          <ul>${items.map(b=>`<li>${b}</li>`).join('')}</ul>
        </div>`;
      }).join('');
    } else {
      result.innerHTML = quickBar + `<div class="result-card"><p style="font-size:13px;color:var(--text2);white-space:pre-wrap;line-height:1.7">${text.replace(/\*\*/g,'')}</p></div>`;
    }
  },

  // ── Quick Summary Actions ──
  async quickAction(action) {
    if (!this.lastResult) { UI.toast('Run analysis first', 'error'); return; }
    const prompts = {
      summarize: `Summarize the following analysis in 5-8 concise bullet points. Focus on the most important takeaways:\n\n${this.lastResult.text}`,
      keypoints: `Extract the top 10 key points from this analysis. Number them 1-10. Each should be one clear sentence:\n\n${this.lastResult.text}`,
      deepdive:  `Provide a deeper analysis of the topics covered below. Add more examples, connections between concepts, and practical applications:\n\n${this.lastResult.text}`,
    };
    const result = document.getElementById('azResult');
    const origHtml = result.innerHTML;
    result.innerHTML = `<div class="loading-wrap"><div class="loading-dots"><div class="loading-dot" style="background:var(--accent)"></div><div class="loading-dot" style="background:var(--purple)"></div><div class="loading-dot" style="background:var(--green)"></div></div><div class="loading-text">Generating ${action}…</div></div>`;
    try {
      const res = await fetch('/api/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ model: DB.settings.model||DB.OR_MODELS[0].id, max_tokens:1200, messages:[{role:'user',content:prompts[action]}] })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.choices?.[0]?.message?.content || 'No response.';
      this.lastResult.text = text;
      this._renderResult(text);
      const hdr = document.getElementById('azResultHdr');
      if (hdr) hdr.style.display = 'flex';
    } catch(err) {
      result.innerHTML = origHtml;
      UI.toast('Error: ' + err.message, 'error');
    }
  },

  // ── Mind Map Modal ──
  showMindMap() {
    if (!this.lastResult) { UI.toast('Run analysis first', 'error'); return; }
    const sections = this.lastResult.text.split(/(?=##\s)/g).filter(Boolean);
    const topics = sections.map(sec => {
      const lines = sec.trim().split('\n');
      const heading = lines[0].replace(/^#+\s*/, '').trim();
      const bullets = lines.slice(1).filter(l => /^[-•*]/.test(l.trim())).map(b => b.replace(/^[-•*]\s*/,'').replace(/\*\*/g,'').trim()).slice(0,4);
      return { heading, bullets };
    }).filter(t => t.heading);

    const docName = this.activeFile?.name || 'Document';
    const w = 900, h = 600;
    const cx = w/2, cy = h/2;

    let svg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:100%">`;
    // Central node
    svg += `<rect x="${cx-80}" y="${cy-20}" width="160" height="40" rx="20" fill="var(--accent)" opacity="0.9"/>`;
    svg += `<text x="${cx}" y="${cy+5}" text-anchor="middle" fill="white" font-size="12" font-weight="600">${docName.slice(0,20)}</text>`;

    const colors = ['#534AB7','#1D9E75','#185FA5','#D85A30','#639922','#BA7517','#D4537E','#888780','#4A90D9','#E74C3C'];
    topics.forEach((t, i) => {
      const angle = (i / topics.length) * Math.PI * 2 - Math.PI/2;
      const r1 = 160;
      const tx = cx + r1 * Math.cos(angle);
      const ty = cy + r1 * Math.sin(angle);
      const color = colors[i % colors.length];

      // Branch line
      svg += `<line x1="${cx}" y1="${cy}" x2="${tx}" y2="${ty}" stroke="${color}" stroke-width="2" opacity="0.5"/>`;
      // Topic node
      const tw = Math.min(t.heading.length * 7 + 20, 160);
      svg += `<rect x="${tx-tw/2}" y="${ty-14}" width="${tw}" height="28" rx="14" fill="${color}" opacity="0.85"/>`;
      svg += `<text x="${tx}" y="${ty+4}" text-anchor="middle" fill="white" font-size="10" font-weight="500">${t.heading.slice(0,22)}</text>`;

      // Bullet sub-nodes
      t.bullets.forEach((b, j) => {
        const subAngle = angle + ((j - t.bullets.length/2 + 0.5) * 0.3);
        const r2 = 100;
        const bx = tx + r2 * Math.cos(subAngle);
        const by = ty + r2 * Math.sin(subAngle);
        svg += `<line x1="${tx}" y1="${ty}" x2="${bx}" y2="${by}" stroke="${color}" stroke-width="1" opacity="0.3"/>`;
        const bw = Math.min(b.length * 5.5 + 16, 140);
        svg += `<rect x="${bx-bw/2}" y="${by-10}" width="${bw}" height="20" rx="10" fill="${color}" opacity="0.2"/>`;
        svg += `<text x="${bx}" y="${by+3}" text-anchor="middle" fill="var(--text2)" font-size="8">${b.slice(0,25)}</text>`;
      });
    });
    svg += '</svg>';

    UI.showModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <h3 style="font-family:var(--ff-head);margin:0"><i class="bi bi-diagram-3" style="color:var(--accent)"></i> Mind Map</h3>
        <div style="display:flex;gap:6px">
          <button class="btn-sm" onclick="Analyzer._exportMindMap()"><i class="bi bi-download"></i> Export</button>
          <button class="btn-cancel" onclick="UI.closeModal()">Close</button>
        </div>
      </div>
      <div class="mindmap-container" id="mindmapSvg">${svg}</div>
      <div style="font-size:11px;color:var(--text4);text-align:center;margin-top:8px">${topics.length} topics · ${topics.reduce((s,t)=>s+t.bullets.length,0)} sub-points</div>
    `);
  },

  _exportMindMap() {
    const svg = document.getElementById('mindmapSvg')?.innerHTML;
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mindmap_' + (this.activeFile?.name || 'study') + '.svg';
    a.click();
    UI.toast('Mind map exported as SVG ✓', 'success');
  },

  copyResult()   { if(!this.lastResult)return; navigator.clipboard.writeText(this.lastResult.text).then(()=>UI.toast('Copied ✓','success')); },
  exportResult() {
    if(!this.lastResult)return;
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([this.lastResult.text],{type:'text/plain'}));
    a.download=`${this.lastResult.file}_${this.lastResult.mode}.txt`; a.click();
  },
  saveToNotes() {
    if(!this.lastResult){UI.toast('Run analysis first','error');return;}
    Notes.generateFromAnalysis(this.lastResult.text,this.lastResult.file);
    if(!document.getElementById('notesPanel').classList.contains('open'))Notes.toggle();
    UI.toast('Saved to Notes 📝','success');
  },
  saveSession() {
    if(!this.lastResult){UI.toast('Run analysis first','error');return;}
    DB.sessions.unshift({id:DB.uid(),name:this.activeFile?.name||'Session',mode:this.lastResult.mode,date:new Date().toLocaleDateString(),result:this.lastResult.text});
    DB.save();DB.addXP(10);UI.toast('Session saved ✓','success');
  },

  // ── TTS WITH CONTROLS ──
  _ttsState: { speaking: false, paused: false, rate: 1 },

  toggleTTS() {
    if(!this.lastResult){UI.toast('No analysis to read','error');return;}
    if(window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      this._ttsState.speaking = false;
      this._ttsState.paused = false;
      this._hideTTSControls();
      UI.toast('TTS stopped','info');
    } else {
      this._startTTS();
    }
  },

  _startTTS() {
    const text = this.lastResult.text.replace(/[#*]/g, '');
    const u = new SpeechSynthesisUtterance(text);
    u.rate = this._ttsState.rate;
    u.onend = () => { this._ttsState.speaking = false; this._hideTTSControls(); };
    window.speechSynthesis.speak(u);
    this._ttsState.speaking = true;
    this._ttsState.paused = false;
    this._showTTSControls();
  },

  _showTTSControls() {
    let bar = document.getElementById('ttsControlBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'ttsControlBar';
      bar.className = 'tts-control-bar';
      document.body.appendChild(bar);
    }
    bar.innerHTML = `
      <button class="tts-btn" onclick="Analyzer._ttsPauseResume()" title="Pause/Resume"><i class="bi bi-${this._ttsState.paused?'play':'pause'}-fill"></i></button>
      <button class="tts-btn" onclick="Analyzer.toggleTTS()" title="Stop"><i class="bi bi-stop-fill"></i></button>
      <span class="tts-label">🔊 Reading aloud</span>
      <div class="tts-speed">
        <button class="tts-speed-btn ${this._ttsState.rate===0.75?'active':''}" onclick="Analyzer._ttsSpeed(0.75)">0.75x</button>
        <button class="tts-speed-btn ${this._ttsState.rate===1?'active':''}" onclick="Analyzer._ttsSpeed(1)">1x</button>
        <button class="tts-speed-btn ${this._ttsState.rate===1.5?'active':''}" onclick="Analyzer._ttsSpeed(1.5)">1.5x</button>
        <button class="tts-speed-btn ${this._ttsState.rate===2?'active':''}" onclick="Analyzer._ttsSpeed(2)">2x</button>
      </div>`;
    bar.style.display = 'flex';
  },

  _hideTTSControls() {
    const bar = document.getElementById('ttsControlBar');
    if (bar) bar.style.display = 'none';
  },

  _ttsPauseResume() {
    if (this._ttsState.paused) {
      window.speechSynthesis.resume();
      this._ttsState.paused = false;
    } else {
      window.speechSynthesis.pause();
      this._ttsState.paused = true;
    }
    this._showTTSControls();
  },

  _ttsSpeed(rate) {
    this._ttsState.rate = rate;
    if (this._ttsState.speaking) {
      window.speechSynthesis.cancel();
      this._startTTS();
    }
    this._showTTSControls();
  },
};

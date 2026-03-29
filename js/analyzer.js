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
    if (sections.length > 1) {
      result.innerHTML = sections.map((sec, i) => {
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
      result.innerHTML = `<div class="result-card"><p style="font-size:13px;color:var(--text2);white-space:pre-wrap;line-height:1.7">${text.replace(/\*\*/g,'')}</p></div>`;
    }
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
  toggleTTS() {
    if(!this.lastResult){UI.toast('No analysis to read','error');return;}
    if(window.speechSynthesis.speaking){window.speechSynthesis.cancel();UI.toast('TTS stopped','info');}
    else{const u=new SpeechSynthesisUtterance(this.lastResult.text.replace(/[#*]/g,''));window.speechSynthesis.speak(u);UI.toast('Reading aloud…','info');}
  },
};

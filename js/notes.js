// ══ NOTES PRO — Advanced Note-Taking System ══
const Notes = {
  _tab: 'list',           // list | editor | graph
  _editId: null,          // currently editing note id
  _searchQ: '',
  _recording: false,
  _mediaRecorder: null,
  _audioChunks: [],

  init() {
    this.render();
    this._initContextMenu();
    this._initVoiceIfAvailable();
  },

  // ── Render dispatcher ──
  render() {
    const panel = document.getElementById('notesPanel');
    if (!panel) return;
    if (this._tab === 'editor' && this._editId) {
      this._renderEditor();
    } else if (this._tab === 'graph') {
      this._renderGraph();
    } else {
      this._renderList();
    }
    this._updateTabHighlight();
  },

  toggle() {
    const panel = document.getElementById('notesPanel');
    const btn   = document.getElementById('notesToggleBtn');
    if (!panel) return;
    const open = panel.classList.toggle('open');
    btn?.classList.toggle('active', open);
    if (open) this.render();
  },

  switchTab(tab) {
    this._tab = tab;
    this.render();
  },

  _updateTabHighlight() {
    document.querySelectorAll('.notes-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === this._tab);
    });
  },

  // ── LIST VIEW ──
  _renderList() {
    const body = document.getElementById('notesBody');
    if (!body) return;
    const notes = DB.searchNotes(this._searchQ);
    const pinned = notes.filter(n => n.pinned);
    const rest   = notes.filter(n => !n.pinned);

    body.innerHTML = `
      <div class="notes-list">
        ${this._renderNoteFooter()}
        ${!notes.length ? `<div class="empty-state" style="padding:30px 16px">
          <div class="es-icon">📝</div>
          <p>No notes yet. Right-click any text in the document or click + to add one.</p>
        </div>` : ''}
        ${pinned.length ? `<div style="padding:4px 8px 2px;font-size:10px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:var(--text4)">📌 Pinned</div>` : ''}
        ${pinned.map(n => this._noteCard(n)).join('')}
        ${rest.length && pinned.length ? `<div style="padding:4px 8px 2px;font-size:10px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:var(--text4)">All Notes</div>` : ''}
        ${rest.map(n => this._noteCard(n)).join('')}
      </div>`;
  },

  _noteCard(n) {
    const tag = DB.NOTE_TAGS.find(t => t.id === n.tag) || DB.NOTE_TAGS[0];
    const preview = n.content.replace(/\n/g, ' ').substring(0, 100);
    const timeAgo = this._timeAgo(n.updated || n.created);
    return `<div class="note-item" onclick="Notes.openEditor('${n.id}')" data-id="${n.id}">
      <span class="note-item-tag tag-${tag.color}">${tag.label}</span>
      <div class="note-item-text"><strong>${this._esc(n.title)}</strong><br>${this._esc(preview)}${preview.length >= 100 ? '…' : ''}</div>
      <div class="note-item-meta">
        <span>${timeAgo}${n.fileName ? ' · ' + n.fileName.slice(0,16) : ''}</span>
        <div class="note-item-actions">
          <button class="note-action-btn" onclick="event.stopPropagation();Notes.togglePin('${n.id}')" title="${n.pinned ? 'Unpin' : 'Pin'}"><i class="bi bi-pin${n.pinned ? '-fill' : ''}"></i></button>
          <button class="note-action-btn" onclick="event.stopPropagation();Notes.aiEnhanceNote('${n.id}','summary')" title="AI Summary"><i class="bi bi-stars"></i></button>
          <button class="note-action-btn danger" onclick="event.stopPropagation();Notes.del('${n.id}')" title="Delete"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    </div>`;
  },

  _renderNoteFooter() {
    return `<div class="notes-footer-inline" style="padding:0 0 8px">
      <div class="note-input-wrap">
        <textarea id="noteInput" placeholder="Quick note… (Shift+Enter to add)" onkeydown="Notes._quickKeydown(event)" rows="2"></textarea>
        <button class="add-note-btn" onclick="Notes.add()" title="Add note"><i class="bi bi-plus-lg"></i></button>
      </div>
      <div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap">
        <button class="enhance-btn" onclick="Notes.generateFromDoc()" title="Generate from current doc"><i class="bi bi-lightning-charge-fill"></i> AI Generate</button>
        <button class="enhance-btn" onclick="Notes.openVoiceModal()" title="Voice note"><i class="bi bi-mic-fill"></i> Voice</button>
        <button class="enhance-btn" onclick="Notes.exportAll()" title="Export all notes"><i class="bi bi-download"></i> Export</button>
      </div>
    </div>`;
  },

  // ── EDITOR VIEW ──
  openEditor(id) {
    this._editId = id;
    this._tab = 'editor';
    this.render();
    // Open panel if closed
    const panel = document.getElementById('notesPanel');
    if (!panel.classList.contains('open')) this.toggle();
  },

  newNote(prefill = '') {
    const note = DB.addNote({
      title: 'New Note',
      content: prefill,
      tag: 'key',
      fileId: Analyzer.activeFile?.id || null,
      fileName: Analyzer.activeFile?.name || null,
    });
    this._editId = note.id;
    this._tab = 'editor';
    this.render();
    const panel = document.getElementById('notesPanel');
    if (!panel.classList.contains('open')) this.toggle();
    setTimeout(() => document.getElementById('noteTitleInput')?.select(), 50);
    return note;
  },

  _renderEditor() {
    const body = document.getElementById('notesBody');
    if (!body) return;
    const note = DB.notes.find(n => n.id === this._editId);
    if (!note) { this._tab = 'list'; this._renderList(); return; }

    const related = DB.getRelatedNotes(note.id);
    const tagOpts = DB.NOTE_TAGS.map(t =>
      `<option value="${t.id}" ${t.id === note.tag ? 'selected' : ''}>${t.label}</option>`
    ).join('');

    body.innerHTML = `
      <div class="note-editor active">
        <div class="editor-toolbar">
          <button class="tool-btn" onclick="Notes._tab='list';Notes.render()" title="Back"><i class="bi bi-arrow-left"></i></button>
          <select id="noteTagSel" class="tool-btn" style="padding:0 6px" onchange="Notes._tagChange(this.value)">${tagOpts}</select>
          <button class="tool-btn" onclick="Notes.saveEditor()" title="Save"><i class="bi bi-check-lg"></i> Save</button>
          <button class="tool-btn" onclick="Notes.showVersionHistory('${note.id}')" title="History"><i class="bi bi-clock-history"></i></button>
          <button class="tool-btn" onclick="Notes.exportNote('${note.id}')" title="Export"><i class="bi bi-download"></i></button>
          <button class="tool-btn" onclick="Notes.togglePin('${note.id}')" title="${note.pinned?'Unpin':'Pin'}"><i class="bi bi-pin${note.pinned?'-fill':''}"></i></button>
        </div>

        <div class="editor-area">
          <input id="noteTitleInput" type="text" value="${this._esc(note.title)}"
            placeholder="Note title…"
            style="width:100%;border:none;outline:none;font-family:var(--ff-head);font-size:18px;font-weight:500;background:transparent;color:var(--text1);margin-bottom:10px;padding:0"
            oninput="Notes._autoSaveDebounce()">
          <div id="noteEditorContent" contenteditable="true"
            placeholder="Start writing…"
            style="min-height:200px;outline:none;font-size:13px;line-height:1.7;color:var(--text1)"
            oninput="Notes._autoSaveDebounce()">${this._contentToHtml(note.content)}</div>
        </div>

        <div class="ai-enhance-panel">
          <div class="ai-enhance-title">✨ AI Enhance</div>
          <div class="ai-enhance-actions">
            <button class="enhance-btn" onclick="Notes.aiEnhanceNote('${note.id}','expand')"><i class="bi bi-arrows-expand"></i> Expand</button>
            <button class="enhance-btn" onclick="Notes.aiEnhanceNote('${note.id}','simplify')"><i class="bi bi-arrow-down-short"></i> Simplify</button>
            <button class="enhance-btn" onclick="Notes.aiEnhanceNote('${note.id}','flashcards')"><i class="bi bi-card-text"></i> Flashcards</button>
            <button class="enhance-btn" onclick="Notes.aiEnhanceNote('${note.id}','quiz')"><i class="bi bi-question-circle"></i> Quiz</button>
            <button class="enhance-btn" onclick="Notes.aiEnhanceNote('${note.id}','summary')"><i class="bi bi-file-text"></i> Summarize</button>
            <button class="enhance-btn" onclick="Notes.aiEnhanceNote('${note.id}','missing')"><i class="bi bi-lightbulb"></i> What's missing?</button>
          </div>
          <div id="enhanceOutput" style="margin-top:8px;font-size:12px;color:var(--text2);line-height:1.6;max-height:120px;overflow-y:auto"></div>
        </div>

        ${related.length ? `
        <div style="padding:10px 12px;border-top:1px solid var(--border)">
          <div style="font-size:10px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:var(--text4);margin-bottom:6px">🔗 Related Notes</div>
          ${related.map(r => `<div onclick="Notes.openEditor('${r.id}')" style="font-size:12px;padding:4px 0;cursor:pointer;color:var(--accent)">${r.title}</div>`).join('')}
        </div>` : ''}

        ${note.versions?.length ? `
        <div style="padding:8px 12px;border-top:1px solid var(--border)">
          <div style="font-size:10px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:var(--text4);margin-bottom:4px">
            📋 ${note.versions.length} version${note.versions.length > 1 ? 's' : ''} saved
            <button onclick="Notes.showVersionHistory('${note.id}')" style="font-size:10px;color:var(--accent);background:none;border:none;cursor:pointer;margin-left:6px">View</button>
          </div>
        </div>` : ''}
      </div>`;

    // Set up auto-save
    this._autoSaveTimer = null;
  },

  _autoSaveDebounce() {
    clearTimeout(this._autoSaveTimer);
    this._autoSaveTimer = setTimeout(() => this.saveEditor(true), 1200);
  },

  saveEditor(silent = false) {
    const note = DB.notes.find(n => n.id === this._editId);
    if (!note) return;
    const title   = document.getElementById('noteTitleInput')?.value.trim() || 'Untitled';
    const content = document.getElementById('noteEditorContent')?.innerText || '';
    const tag     = document.getElementById('noteTagSel')?.value || note.tag;
    DB.updateNote(note.id, { title, content, tag });
    if (!silent) UI.toast('Note saved ✓', 'success', 2000);
  },

  _tagChange(val) {
    if (this._editId) {
      DB.updateNote(this._editId, { tag: val });
    }
  },

  // ── GRAPH VIEW ──
  _renderGraph() {
    const body = document.getElementById('notesBody');
    if (!body) return;
    const notes = DB.notes.slice(0, 20);
    if (!notes.length) {
      body.innerHTML = `<div class="empty-state" style="padding:30px 16px"><div class="es-icon">🕸️</div><p>Add some notes to see the knowledge graph</p></div>`;
      return;
    }

    body.innerHTML = `
      <div style="padding:10px 12px;font-size:12px;color:var(--text3)">Click a node to open that note</div>
      <div class="graph-canvas" id="graphCanvas"></div>
      <div style="padding:8px 12px;font-size:11px;color:var(--text4)">Showing ${notes.length} notes · Lines = linked notes</div>`;

    const canvas = document.getElementById('graphCanvas');
    if (!canvas) return;
    const w = canvas.offsetWidth, h = canvas.offsetHeight;

    // Position nodes in a rough circle
    const positions = notes.map((_, i) => {
      const angle = (i / notes.length) * Math.PI * 2 - Math.PI / 2;
      const r = Math.min(w, h) * 0.35;
      return {
        x: w/2 + r * Math.cos(angle),
        y: h/2 + r * Math.sin(angle)
      };
    });

    // Draw SVG lines
    let svgLines = `<svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">`;
    notes.forEach((note, i) => {
      (note.linkedNotes || []).forEach(lid => {
        const j = notes.findIndex(n => n.id === lid);
        if (j !== -1) {
          svgLines += `<line x1="${positions[i].x}" y1="${positions[i].y}" x2="${positions[j].x}" y2="${positions[j].y}" stroke="var(--border2)" stroke-width="1.5"/>`;
        }
      });
    });
    svgLines += '</svg>';
    canvas.innerHTML = svgLines;

    // Draw nodes
    notes.forEach((note, i) => {
      const tag = DB.NOTE_TAGS.find(t => t.id === note.tag) || DB.NOTE_TAGS[0];
      const el  = document.createElement('div');
      el.className = 'graph-node' + (note.id === this._editId ? ' current' : '');
      el.textContent = note.title.substring(0, 18);
      el.style.left = (positions[i].x - 50) + 'px';
      el.style.top  = (positions[i].y - 16) + 'px';
      el.style.width = '100px';
      el.onclick = () => { this.openEditor(note.id); this.switchTab('editor'); };
      canvas.appendChild(el);
    });
  },

  // ── QUICK ADD ──
  add(text) {
    const input = document.getElementById('noteInput');
    const t = text || input?.value.trim();
    if (!t) return;

    const note = DB.addNote({
      title: t.substring(0, 50),
      content: t,
      tag: 'key',
      fileId: Analyzer.activeFile?.id || null,
      fileName: Analyzer.activeFile?.name || null,
    });

    if (input) input.value = '';
    DB.addXP(5);
    const badge = DB.checkBadges();
    if (badge) UI.toast(`🏆 ${badge.name}!`, 'success', 4000);
    this.render();
    if (!document.getElementById('notesPanel').classList.contains('open')) this.toggle();
    UI.toast('Note saved 📝', 'success', 2000);
    return note;
  },

  _quickKeydown(e) {
    if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); this.add(); }
  },

  del(id) {
    if (!confirm('Delete this note?')) return;
    DB.deleteNote(id);
    if (this._editId === id) { this._editId = null; this._tab = 'list'; }
    this.render();
    UI.toast('Note deleted', 'info', 2000);
  },

  togglePin(id) {
    const note = DB.notes.find(n => n.id === id);
    if (!note) return;
    DB.updateNote(id, { pinned: !note.pinned });
    this.render();
    UI.toast(note.pinned ? 'Unpinned' : 'Pinned 📌', 'info', 1500);
  },

  search(q) {
    this._searchQ = q;
    this._tab = 'list';
    this.render();
  },

  // ── AI GENERATION ──
  async generateFromDoc() {
    const f = Analyzer.activeFile;
    if (!f) { UI.toast('Select a document first', 'error'); return; }
    UI.toast('Generating notes from document…', 'info');

    try {
      const apiKey = 'server';
      // API key handled server-side via OPENROUTER_API_KEY env var

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: DB.settings.model || DB.OR_MODELS[0].id,
          max_tokens: 1200,
          messages: [{ role: 'user', content:
            `From the document below, extract 5-8 key notes. Return ONLY a JSON array:
[{"title":"Note title","content":"Note content with key points","tag":"key|formula|example|warning|qa|summary"}]

Document: ${f.rawText || f.name}

Tags: key=key concept, formula=formula/equation, example=example, warning=common mistake, qa=Q&A, summary=summary.
Return only the JSON array, no other text.`
          }]
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.choices?.[0]?.message?.content || '[]';
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());

      parsed.forEach(n => {
        DB.addNote({
          title:    n.title || 'Note',
          content:  n.content || '',
          tag:      n.tag || 'key',
          fileId:   f.id,
          fileName: f.name,
        });
      });

      DB.addXP(20);
      this._tab = 'list';
      this.render();
      if (!document.getElementById('notesPanel').classList.contains('open')) this.toggle();
      UI.toast(`✓ ${parsed.length} notes generated!`, 'success');
    } catch (err) {
      UI.toast('AI Error: ' + err.message, 'error');
    }
  },

  // Auto-generate notes from analysis result
  generateFromAnalysis(analysisText, fileName) {
    if (!analysisText) return;
    // Extract sections from the analysis
    const sections = analysisText.split(/(?=##\s)/g).filter(Boolean);
    sections.slice(0, 6).forEach(sec => {
      const lines   = sec.trim().split('\n');
      const heading = lines[0].replace(/^#+\s*/, '').trim();
      const body    = lines.slice(1).join('\n').trim();
      if (!heading || !body) return;
      DB.addNote({
        title:    heading,
        content:  body,
        tag:      /formula|formula|equation/i.test(heading) ? 'formula' :
                  /cheat|sheet|quick/i.test(heading) ? 'summary' :
                  /q&a|question/i.test(heading) ? 'qa' : 'key',
        fileId:   Analyzer.activeFile?.id || null,
        fileName: fileName || Analyzer.activeFile?.name || null,
      });
    });
    DB.addXP(10);
    this.render();
    UI.toast('📝 Notes auto-created from analysis', 'info', 3000);
  },

  // ── AI ENHANCEMENT ──
  async aiEnhanceNote(id, action) {
    const note = DB.notes.find(n => n.id === id);
    if (!note) return;

    const apiKey = 'server';
    // API key handled server-side via OPENROUTER_API_KEY env var

    const prompts = {
      expand:    `Expand this note with more detail, examples, and context:\n\n${note.content}`,
      simplify:  `Simplify this note to the most essential points, keep it very concise:\n\n${note.content}`,
      summary:   `Write a 2-3 sentence summary of this note:\n\n${note.content}`,
      missing:   `What key concepts or information is missing from this note? Give 3-5 suggestions:\n\n${note.title}\n${note.content}`,
      flashcards:`Create 3 flashcard Q&A pairs from this note. Format as Q: ... A: ...\n\n${note.content}`,
      quiz:      `Generate 3 quiz questions (with answers) testing understanding of this note:\n\n${note.content}`,
    };

    const outputEl = document.getElementById('enhanceOutput');
    if (outputEl) outputEl.innerHTML = '<i class="bi bi-hourglass-split"></i> Thinking…';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: DB.settings.model || DB.OR_MODELS[0].id,
          max_tokens: 600,
          messages: [{ role: 'user', content: prompts[action] || prompts.summary }]
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const result = data.choices?.[0]?.message?.content || '';

      if (action === 'expand' || action === 'simplify') {
        // Apply to note content
        DB.updateNote(id, { content: result });
        this._renderEditor();
        UI.toast(`Note ${action}ed ✓`, 'success');
      } else {
        if (outputEl) outputEl.textContent = result;
      }
    } catch (err) {
      if (outputEl) outputEl.textContent = 'Error: ' + err.message;
    }
  },

  // ── VOICE NOTES ──
  openVoiceModal() {
    UI.showModal(`
      <div style="text-align:center">
        <h3 style="font-family:var(--ff-head);margin-bottom:16px">🎙️ Voice Note</h3>
        <div class="voice-recorder">
          <div id="voiceStatus" style="font-size:13px;color:var(--text3)">Click to start recording</div>
          <button class="record-btn" id="recordBtn" onclick="Notes._toggleRecording()">
            <i class="bi bi-mic-fill"></i>
          </button>
          <div id="voiceTranscript" style="font-size:12px;color:var(--text2);min-height:40px;width:100%;text-align:left;line-height:1.5"></div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
          <button class="btn-cancel" onclick="UI.closeModal();Notes._stopRecording()">Cancel</button>
          <button class="btn-primary" onclick="Notes._saveVoiceNote()">Save Note</button>
        </div>
      </div>`);
  },

  _toggleRecording() {
    if (this._recording) {
      this._stopRecording();
    } else {
      this._startRecording();
    }
  },

  async _startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this._mediaRecorder = new MediaRecorder(stream);
      this._audioChunks = [];
      this._mediaRecorder.ondataavailable = e => this._audioChunks.push(e.data);
      this._mediaRecorder.onstop = () => this._transcribeAudio();
      this._mediaRecorder.start();
      this._recording = true;
      document.getElementById('recordBtn')?.classList.add('recording');
      document.getElementById('voiceStatus').textContent = '🔴 Recording… Click to stop';
    } catch {
      UI.toast('Microphone access denied', 'error');
    }
  },

  _stopRecording() {
    if (this._mediaRecorder && this._recording) {
      this._mediaRecorder.stop();
      this._mediaRecorder.stream.getTracks().forEach(t => t.stop());
      this._recording = false;
      document.getElementById('recordBtn')?.classList.remove('recording');
      document.getElementById('voiceStatus').textContent = 'Processing…';
    }
  },

  _transcribeAudio() {
    // Use Web Speech API for transcription (fallback)
    document.getElementById('voiceStatus').textContent = 'Transcription ready (Web Speech API not available in all browsers)';
    document.getElementById('voiceTranscript').textContent =
      '[Voice recorded. Note: Real-time transcription requires Web Speech API. Your audio was captured — type your note manually below.]';
  },

  _saveVoiceNote() {
    const transcript = document.getElementById('voiceTranscript')?.textContent || '';
    if (transcript && transcript.length > 10) {
      this.add(transcript);
    } else {
      this.newNote('Voice note recorded ' + new Date().toLocaleTimeString());
    }
    UI.closeModal();
    this._stopRecording();
  },

  _initVoiceIfAvailable() {
    // Web Speech API live recognition for quick notes
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      this._speechAvailable = true;
    }
  },

  // ── VERSION HISTORY ──
  showVersionHistory(id) {
    const note = DB.notes.find(n => n.id === id);
    if (!note || !note.versions?.length) {
      UI.toast('No version history yet', 'info');
      return;
    }
    const versionsHtml = note.versions.map((v, i) => `
      <div class="version-item" onclick="Notes._restoreVersion('${id}',${i})">
        <div class="version-dot"></div>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:500;color:var(--text1)">${v.content.substring(0,60)}…</div>
          <div class="version-time">${new Date(v.updated).toLocaleString()}</div>
        </div>
        <span style="font-size:11px;color:var(--accent)">Restore</span>
      </div>`).join('');

    UI.showModal(`
      <h3 style="font-family:var(--ff-head);margin-bottom:16px">🕐 Version History</h3>
      <p style="font-size:12px;color:var(--text3);margin-bottom:12px">${note.versions.length} saved versions</p>
      <div style="max-height:300px;overflow-y:auto">${versionsHtml}</div>
      <div style="display:flex;justify-content:flex-end;margin-top:12px">
        <button class="btn-cancel" onclick="UI.closeModal()">Close</button>
      </div>`);
  },

  _restoreVersion(id, versionIdx) {
    const note = DB.notes.find(n => n.id === id);
    if (!note || !note.versions[versionIdx]) return;
    const v = note.versions[versionIdx];
    DB.updateNote(id, { content: v.content });
    UI.closeModal();
    this.render();
    UI.toast('Version restored ✓', 'success');
  },

  // ── EXPORT ──
  exportNote(id) {
    const note = DB.notes.find(n => n.id === id);
    if (!note) return;
    const md = `# ${note.title}\n\n${note.content}\n\n---\n*Exported from StudyAI Pro*`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = note.title.replace(/[^a-z0-9]/gi, '_') + '.md';
    a.click();
    UI.toast('Note exported as Markdown ✓', 'success');
  },

  exportAll() {
    if (!DB.notes.length) { UI.toast('No notes to export', 'error'); return; }
    const md = DB.notes.map(n =>
      `# ${n.title}\n\n${n.content}\n\n---\n`
    ).join('\n');
    const blob = new Blob([`# StudyAI Notes Export\n\nExported: ${new Date().toLocaleDateString()}\n\n${md}`], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'StudyAI_Notes.md';
    a.click();
    UI.toast('All notes exported ✓', 'success');
  },

  // ── SMART HIGHLIGHTING ──
  saveHighlightedText(text) {
    if (!text || text.length < 3) return;
    this.add(text);
    UI.toast('Highlight saved to notes 📝', 'success', 2000);
  },

  // ── CONTEXT MENU (unchanged + enhanced) ──
  _initContextMenu() {
    const ctx = document.getElementById('ctxMenu');
    if (!ctx) return;

    document.addEventListener('contextmenu', e => {
      const docBody = document.getElementById('azDocBody');
      const result  = document.getElementById('azResult');
      const inDoc   = docBody?.contains(e.target) || result?.contains(e.target);
      if (!inDoc) return;

      e.preventDefault();
      const sel = window.getSelection()?.toString().trim();

      ctx.innerHTML = `
        <div class="ctx-item" onclick="Notes.add(${JSON.stringify(sel||'')});Notes._closeCtx()">
          <i class="bi bi-journal-plus"></i> ${sel ? 'Save to Notes: "' + sel.slice(0,25) + (sel.length>25?'…':'')+'"' : 'Add Note'}
        </div>
        <div class="ctx-item" onclick="Notes._openFeedback(${JSON.stringify(sel||'')});Notes._closeCtx()">
          <i class="bi bi-chat-dots"></i> Ask Tutor about this
        </div>
        ${sel ? `<div class="ctx-item" onclick="Notes._askAIExpand(${JSON.stringify(sel)});Notes._closeCtx()">
          <i class="bi bi-stars"></i> AI Explain this
        </div>` : ''}
        <div class="ctx-sep"></div>
        <div class="ctx-item" onclick="Notes._copyText(${JSON.stringify(sel||'')});Notes._closeCtx()">
          <i class="bi bi-clipboard"></i> Copy
        </div>
        <div class="ctx-item" onclick="Notes._highlight();Notes._closeCtx()">
          <i class="bi bi-highlighter"></i> Highlight
        </div>
        <div class="ctx-sep"></div>
        <div class="ctx-item" onclick="Notes._closeCtx()">
          <i class="bi bi-x-lg"></i> Close
        </div>`;

      const x = Math.min(e.clientX, window.innerWidth - 230);
      const y = Math.min(e.clientY, window.innerHeight - 260);
      ctx.style.left = x + 'px';
      ctx.style.top  = y + 'px';
      ctx.style.display = 'block';
    });

    document.addEventListener('click', () => this._closeCtx());
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this._closeCtx(); });
  },

  _closeCtx() {
    const ctx = document.getElementById('ctxMenu');
    if (ctx) ctx.style.display = 'none';
  },

  _copyText(text) {
    if (text) navigator.clipboard.writeText(text).then(() => UI.toast('Copied!', 'success', 1500));
  },

  _highlight() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    try {
      const range = sel.getRangeAt(0);
      const mark  = document.createElement('mark');
      mark.className = 'sa-highlight';
      mark.title = 'Click to save to notes';
      mark.onclick = () => Notes.add(mark.textContent);
      range.surroundContents(mark);
      sel.removeAllRanges();
      UI.toast('Highlighted! Click to save to notes.', 'info', 2500);
    } catch {
      UI.toast('Select a continuous text range to highlight', 'warning');
    }
  },

  async _askAIExpand(text) {
    const apiKey = 'server';
    if (!apiKey) { UI.toast('Add API key in Settings', 'error'); return; }
    UI.toast('Asking AI…', 'info', 2000);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: DB.settings.model || DB.OR_MODELS[0].id, max_tokens: 400,
          messages: [{ role: 'user', content: `Explain this concept clearly in 3-4 sentences: "${text}"` }]
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const explanation = data.choices?.[0]?.message?.content || '';
      UI.showModal(`
        <h3 style="font-family:var(--ff-head);margin-bottom:12px">🤖 AI Explanation</h3>
        <div style="background:var(--bg2);padding:10px;border-radius:var(--radius);margin-bottom:6px;font-size:12px;color:var(--text3)">Selected: "${text.substring(0,60)}${text.length>60?'…':''}"</div>
        <p style="font-size:13.5px;line-height:1.7;color:var(--text1)">${explanation}</p>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
          <button class="btn-cancel" onclick="UI.closeModal()">Close</button>
          <button class="btn-primary" onclick="Notes.add(${JSON.stringify(text+'\n\n'+explanation)});UI.closeModal()">Save to Notes</button>
        </div>`);
    } catch (err) {
      UI.toast('Error: ' + err.message, 'error');
    }
  },

  _openFeedback(selectedText) {
    UI.showModal(`
      <h3 style="font-family:var(--ff-head);margin-bottom:12px">💬 Ask Tutor</h3>
      <textarea id="fbText" style="width:100%;min-height:80px;padding:8px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg2);color:var(--text1);font-family:var(--ff-body);font-size:13px;outline:none;resize:vertical" placeholder="What's unclear?">${selectedText ? 'About: "' + selectedText.slice(0,80) + '"' : ''}</textarea>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
        <button class="btn-cancel" onclick="UI.closeModal()">Cancel</button>
        <button class="btn-primary" onclick="Notes._sendFeedback()"><i class="bi bi-mortarboard"></i> Ask Tutor</button>
      </div>`);
    setTimeout(() => document.getElementById('fbText')?.focus(), 60);
  },

  _sendFeedback() {
    const text = document.getElementById('fbText')?.value.trim();
    if (!text) return;
    UI.closeModal();
    Nav.go('tutor');
    setTimeout(() => Tutor.sendMessage(text), 200);
  },

  // ── Utilities ──
  _esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); },
  _contentToHtml(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'); },
  _timeAgo(ts) {
    const d = Date.now() - ts;
    if (d < 60000) return 'just now';
    if (d < 3600000) return Math.round(d/60000) + 'm ago';
    if (d < 86400000) return Math.round(d/3600000) + 'h ago';
    return Math.round(d/86400000) + 'd ago';
  },
};

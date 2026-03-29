// ══ NAV ══
const Nav = {
  current: 'analyzer',
  go(page) {
    if (this.current === page) return;
    const prev = document.getElementById('pg-' + this.current);
    if (prev) { prev.style.opacity='0'; prev.style.transform='translateY(6px)'; setTimeout(()=>prev.classList.remove('active'),120); }
    document.querySelectorAll('.ntab').forEach(b => b.classList.toggle('active', b.dataset.page === page));
    this.current = page;
    setTimeout(() => {
      const next = document.getElementById('pg-' + page);
      if (next) { next.classList.add('active'); next.style.opacity='0'; next.style.transform='translateY(6px)'; requestAnimationFrame(()=>{ next.style.transition='opacity .2s ease,transform .2s ease'; next.style.opacity='1'; next.style.transform='translateY(0)'; }); }
    }, 130);
    if (page === 'files')    FM.render();
    if (page === 'progress') Progress.refresh();
    if (page === 'flashcards' && !Flashcards.cards.length && DB.flashcards.length) {
      Flashcards.cards = DB.flashcards; Flashcards.render();
    }
  }
};

// ══ FILE MANAGER ══
const FM = {
  selected: new Set(), viewMode:'grid', sortBy:'date', _filter:'all',

  setFilter(f,el){this._filter=f;document.querySelectorAll('.filter-chip').forEach(c=>c.classList.remove('active'));if(el)el.classList.add('active');this.render();},
  setSortBy(by){this.sortBy=by;this.render();},
  setViewMode(m){this.viewMode=m;document.getElementById('vb-grid')?.classList.toggle('active',m==='grid');document.getElementById('vb-list')?.classList.toggle('active',m==='list');this.render();},

  render() {
    const wrap = document.getElementById('fmFiles');
    if (!wrap) return;
    const q = (App.state.searchQ||'').toLowerCase();
    let files = [...DB.files];
    if (q) files = files.filter(f=>f.name.toLowerCase().includes(q));
    const view = App.state.fmView||'all';
    if (view==='recent') files=files.slice(0,12);
    else if (view==='starred') files=files.filter(f=>f.starred);
    else if (view.startsWith('type:')) files=files.filter(f=>f.type===view.slice(5));
    else if (view.startsWith('folder:')) files=files.filter(f=>f.folder===view.slice(7));
    files.sort((a,b)=>{if(this.sortBy==='name')return a.name.localeCompare(b.name);if(this.sortBy==='size')return b.size-a.size;if(this.sortBy==='type')return(a.type||'').localeCompare(b.type||'');return b.added-a.added;});

    if (!files.length) {
      wrap.innerHTML = '<div class="empty-state"><div class="es-icon">📭</div><p>No files here yet. Upload documents to get started.</p></div>';
      return;
    }

    wrap.innerHTML = `<div class="files-grid">${files.map((f,i) => {
      const ft = DB.getft(f.name);
      return `<div class="file-card${this.selected.has(f.id)?' selected':''}"
        onclick="FM.select('${f.id}',event)" ondblclick="FM._openAnalyzer('${f.id}')"
        style="animation-delay:${i*0.04}s">
        <div class="fc-actions">
          <button class="fc-act-btn" onclick="event.stopPropagation();FM._starFile('${f.id}')" title="${f.starred?'Unstar':'Star'}"><i class="bi bi-star${f.starred?'-fill':''}" style="color:${f.starred?'var(--amber)':''}"></i></button>
          <button class="fc-act-btn" onclick="event.stopPropagation();FM.deleteFile('${f.id}')" title="Delete"><i class="bi bi-trash" style="color:var(--red)"></i></button>
        </div>
        <div class="fc-icon" style="background:${ft.bg}">${ft.ic}</div>
        <div class="fc-name">${f.name}</div>
        <div class="fc-meta">${DB.fmtSize(f.size)} · ${ft.label}</div>
      </div>`;
    }).join('')}</div>`;
  },

  select(id,e){if(e&&(e.ctrlKey||e.metaKey)){this.selected.has(id)?this.selected.delete(id):this.selected.add(id);}else{this.selected.clear();this.selected.add(id);}this.render();},
  _openAnalyzer(id){const f=DB.files.find(x=>x.id===id);if(!f)return;Analyzer.setActiveFile(f);Nav.go('analyzer');},
  _starFile(id){const f=DB.files.find(x=>x.id===id);if(!f)return;f.starred=!f.starred;DB.save();this.render();UI.renderSidebar();UI.toast(f.starred?'⭐ Starred':'Unstarred','info',1500);},
  deleteFile(id){if(!confirm('Delete this file?'))return;DB.files=DB.files.filter(f=>f.id!==id);this.selected.delete(id);DB.save();this.render();UI.renderSidebar();UI.toast('Deleted','info',1500);},
  openInAnalyzer(){const id=[...this.selected][0];if(!id)return;const f=DB.files.find(x=>x.id===id);if(!f)return;Analyzer.setActiveFile(f);Nav.go('analyzer');},
  moveSelected(){
    const all=DB.getAllFolders();
    UI.showModal(`<h3 class="modal-title">Move to Folder</h3>
      <select id="moveFolderSel" class="modal-input" style="cursor:pointer">
        <option value="">No folder</option>
        ${all.map(f=>`<option value="${f.id}">${f.ic} ${f.label}</option>`).join('')}
      </select>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="UI.closeModal()">Cancel</button>
        <button class="btn-primary" onclick="FM._confirmMove()">Move</button>
      </div>`);
  },
  _confirmMove(){const fid=document.getElementById('moveFolderSel').value;this.selected.forEach(id=>{const f=DB.files.find(x=>x.id===id);if(f)f.folder=fid||null;});DB.save();UI.closeModal();this.render();UI.renderSidebar();UI.toast('Moved','success');},
};

// ══ TUTOR — OpenRouter ══
const Tutor = {
  doc: null, history: [],

  setDoc(f) {
    this.doc = f;
    const banner=document.getElementById('tutorDocBanner'), name=document.getElementById('tutorDocName');
    if(f&&banner&&name){banner.style.display='flex';name.textContent=f.name;}
    const el=document.getElementById('tutorSuggestions');
    if(el){
      el.innerHTML='';
      ['Explain main topics','Key formulas?','Exam tips','Common mistakes','Summarize this','Quiz me'].forEach(s=>{
        const chip=document.createElement('button');
        chip.className='enhance-btn';chip.textContent=s;chip.onclick=()=>this.sendMessage(s);el.appendChild(chip);
      });
    }
  },

  async sendMessage(text) {
    const input=document.getElementById('tutorInput');
    const msg=text||input?.value.trim();
    if(!msg)return;
    if(input){input.value='';input.style.height='auto';}

    this._addMsg('user',msg);
    const typing=this._addTyping();
    const sendBtn=document.getElementById('tutorSendBtn');
    if(sendBtn)sendBtn.disabled=true;

    try {
      const docContext = this.doc
        ? `You are a study tutor for "${this.doc.name}". Content: ${this.doc.rawText||this.doc.name}. `
        : 'You are a helpful study tutor. ';
      const lang = DB.settings.lang||'en';
      const messages = [
        ...this.history.slice(-8).map(h=>({role:h.role==='user'?'user':'assistant',content:h.text})),
        {role:'user',content:msg}
      ];
      const body = {
        model: DB.settings.model || DB.OR_MODELS[0].id,
        max_tokens: 600,
        messages: [{role:'user',content:`${docContext}${DB.LANGS[lang]||''}\n\n${msg}`}]
      };

      const res = await fetch('/api/chat', {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)
      });
      const data = await res.json();
      typing.remove();
      if(data.error)throw new Error(data.error.message);
      const reply=data.choices?.[0]?.message?.content||'Sorry, no response.';
      this._addMsg('ai',reply);
      this.history.push({role:'user',text:msg},{role:'ai',text:reply});
      DB.addXP(5);
    } catch(err) {
      typing.remove();
      this._addMsg('ai','⚠ '+err.message);
    }
    if(sendBtn)sendBtn.disabled=false;
  },

  _addMsg(role,text) {
    const wrap=document.getElementById('tutorMessages');
    if(!wrap)return;
    const el=document.createElement('div');
    el.className=`msg-bubble msg-${role}`;
    el.innerHTML=text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
    wrap.appendChild(el);
    wrap.scrollTop=wrap.scrollHeight;
    return el;
  },

  _addTyping() {
    const wrap=document.getElementById('tutorMessages');
    const el=document.createElement('div');
    el.className='msg-bubble msg-ai';
    el.innerHTML='<div class="loading-dots" style="padding:2px 0"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div>';
    wrap?.appendChild(el);
    wrap.scrollTop=wrap.scrollHeight;
    return el;
  },

  keydown(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();this.sendMessage();}},
};

// ══ FLASHCARDS — OpenRouter ══
const Flashcards = {
  cards:[], _current:0, _flipped:false,

  async generateFromDoc(f) {
    if(!f){UI.toast('Upload a document first','error');return;}
    const wrap=document.getElementById('flashcardsContent');
    wrap.innerHTML=`<div class="loading-wrap"><div class="loading-dots"><div class="loading-dot" style="background:var(--accent)"></div><div class="loading-dot" style="background:var(--purple)"></div><div class="loading-dot" style="background:var(--green)"></div></div><div class="loading-text">Generating flashcards with free AI…</div></div>`;
    try {
      const lang=DB.settings.lang||'en';
      const body={
        model:DB.settings.model||DB.OR_MODELS[0].id,
        max_tokens:1000,
        messages:[{role:'user',content:`Create 12 flashcards from this document. ${DB.LANGS[lang]||''}\nDocument: ${f.rawText||f.name}\nReturn ONLY a JSON array, no other text:\n[{"front":"question","back":"answer"}]`}]
      };
      const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const data=await res.json();
      if(data.error)throw new Error(data.error.message);
      const text=data.choices?.[0]?.message?.content||'[]';
      const clean=text.replace(/```json|```/g,'').trim();
      const start=clean.indexOf('['),end=clean.lastIndexOf(']')+1;
      this.cards=start!==-1?JSON.parse(clean.slice(start,end)):[];
      if(!this.cards.length)throw new Error('No flashcards returned. Try again.');
      DB.flashcards=[...DB.flashcards,...this.cards.map(c=>({...c,docId:f.id,added:Date.now()}))];
      DB.save();DB.addXP(15);
      DB.stats.flashcardsReviewed=(DB.stats.flashcardsReviewed||0)+this.cards.length;DB.save();
      this._current=0;this._flipped=false;
      this.render();
      UI.toast(`${this.cards.length} flashcards generated ✓`,'success');
    } catch(err) {
      wrap.innerHTML=`<div class="empty-state"><div class="es-icon">⚠️</div><p>${err.message}</p></div>`;
    }
  },

  render() {
    const wrap=document.getElementById('flashcardsContent');
    if(!wrap)return;
    if(!this.cards.length){wrap.innerHTML=`<div class="empty-state"><div class="es-icon">🃏</div><p>No flashcards yet. Select a file and click Generate.</p></div>`;return;}
    const c=this.cards[this._current];
    const pct=((this._current+1)/this.cards.length*100).toFixed(0);
    wrap.innerHTML=`
      <div style="padding:14px 20px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--border)">
        <span style="font-size:13px;color:var(--text3)">${this._current+1} / ${this.cards.length}</span>
        <div class="quiz-prog-bar" style="flex:1"><div class="quiz-prog-fill" style="width:${pct}%"></div></div>
        <button class="btn-sm" onclick="Flashcards.shuffle()"><i class="bi bi-shuffle"></i></button>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px">
        <div class="flashcard-scene" onclick="Flashcards.flip()">
          <div class="flashcard${this._flipped?' flipped':''}">
            <div class="fc-face"><p>${c.front}</p></div>
            <div class="fc-face back"><p>${c.back}</p></div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--text4);margin-top:10px;animation:pulse 2s infinite">
          <i class="bi bi-arrow-repeat"></i> Click card to flip
        </div>
      </div>
      <div style="padding:0 20px 20px;display:flex;justify-content:center;gap:12px">
        <button class="btn-sm" onclick="Flashcards.prev()"><i class="bi bi-chevron-left"></i> Prev</button>
        <button class="btn-sm" onclick="Flashcards.flip()"><i class="bi bi-arrow-repeat"></i> Flip</button>
        <button class="btn-sm accent" onclick="Flashcards.next()">Next <i class="bi bi-chevron-right"></i></button>
      </div>`;
  },

  flip(){this._flipped=!this._flipped;document.querySelector('.flashcard')?.classList.toggle('flipped',this._flipped);},
  prev(){if(this._current>0){this._current--;this._flipped=false;this.render();}},
  next(){if(this._current<this.cards.length-1){this._current++;this._flipped=false;this.render();}else UI.toast('All done! 🎉','success');},
  shuffle(){this.cards=[...this.cards].sort(()=>Math.random()-.5);this._current=0;this._flipped=false;this.render();UI.toast('Shuffled ✓','info',1500);},
};

// ══ QUIZ — OpenRouter ══
const Quiz = {
  questions:[], answers:{}, _type:'mcq',
  setType(t){this._type=t;},

  async generateFromDoc(f) {
    if(!f){UI.toast('Upload a document first','error');return;}
    const wrap=document.getElementById('quizContent');
    this.answers={};
    wrap.innerHTML=`<div class="loading-wrap"><div class="loading-dots"><div class="loading-dot" style="background:var(--accent)"></div><div class="loading-dot" style="background:var(--purple)"></div><div class="loading-dot" style="background:var(--green)"></div></div><div class="loading-text">Generating quiz with free AI…</div></div>`;
    try {
      const lang=DB.settings.lang||'en';
      const body={
        model:DB.settings.model||DB.OR_MODELS[0].id,
        max_tokens:1400,
        messages:[{role:'user',content:`Create 8 multiple choice questions. ${DB.LANGS[lang]||''}\nDocument: ${f.rawText||f.name}\nReturn ONLY JSON array, no other text:\n[{"question":"...","options":["a)...","b)...","c)...","d)..."],"correct_answer":"a","explanation":"..."}]`}]
      };
      const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const data=await res.json();
      if(data.error)throw new Error(data.error.message);
      const text=data.choices?.[0]?.message?.content||'[]';
      const clean=text.replace(/```json|```/g,'').trim();
      const start=clean.indexOf('['),end=clean.lastIndexOf(']')+1;
      this.questions=start!==-1?JSON.parse(clean.slice(start,end)):[];
      if(!this.questions.length)throw new Error('No questions returned. Try again.');
      DB.addXP(10);this.render();
    } catch(err) {
      wrap.innerHTML=`<div class="empty-state"><div class="es-icon">⚠️</div><p>${err.message}</p></div>`;
    }
  },

  render() {
    const wrap=document.getElementById('quizContent');
    if(!wrap)return;
    if(!this.questions.length){wrap.innerHTML='<div class="empty-state"><div class="es-icon">❓</div><p>No quiz loaded.</p></div>';return;}
    wrap.innerHTML=`
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px">
        <span style="font-size:13px;color:var(--text3)">${this.questions.length} questions</span>
        <button class="btn-sm accent" onclick="Quiz.submit()" style="margin-left:auto">Check Score 🎯</button>
      </div>
      <div class="quiz-page">${this.questions.map((q,i)=>this._renderQ(q,i)).join('')}</div>`;
  },

  _renderQ(q,i) {
    return `<div class="quiz-card" style="animation-delay:${i*0.05}s">
      <div style="font-size:11px;font-weight:600;color:var(--text4);letter-spacing:.5px;margin-bottom:8px">QUESTION ${i+1}</div>
      <div class="quiz-q">${q.question}</div>
      <div class="quiz-options">
        ${(q.options||[]).map((o,j)=>`<button class="quiz-opt" id="opt_${i}_${j}" onclick="Quiz.selectOpt(${i},${j},'${(q.correct_answer||'a').charAt(0)}')">${o}</button>`).join('')}
      </div>
      <div id="fb_${i}" style="margin-top:10px;font-size:12px;display:none;line-height:1.5"></div>
    </div>`;
  },

  selectOpt(qi,oi,correct) {
    if(this.answers[qi]!==undefined)return;
    const letter=String.fromCharCode(97+oi);
    this.answers[qi]=letter;
    for(let j=0;j<4;j++){
      const el=document.getElementById(`opt_${qi}_${j}`);
      if(!el)continue;
      el.disabled=true;
      if(String.fromCharCode(97+j)===correct)el.classList.add('correct');
      else if(j===oi)el.classList.add('wrong');
    }
    const fb=document.getElementById('fb_'+qi);
    const q=this.questions[qi];
    if(fb){fb.style.display='block';fb.style.color=letter===correct?'var(--green)':'var(--red)';fb.textContent=(letter===correct?'✓ Correct! ':'✗ Incorrect. ')+(q.explanation||'');}
  },

  submit() {
    const total=this.questions.length;
    const correct=Object.entries(this.answers).filter(([qi,a])=>a===(this.questions[parseInt(qi)].correct_answer||'a').charAt(0)).length;
    const pct=Math.round((correct/total)*100);
    DB.stats.quizzesTaken=(DB.stats.quizzesTaken||0)+1;
    DB.stats.quizScore=Math.round(((DB.stats.quizScore||0)+pct)/2);
    DB.addXP(correct*5);DB.save();
    UI.toast(`Score: ${correct}/${total} (${pct}%) 🎯`,pct>=70?'success':'warning',4000);
  },
};

// ══ PROGRESS ══
const Progress = {
  refresh() {
    UI.renderSidebar();
    const wrap=document.getElementById('progressContent');
    if(!wrap)return;
    const {analyses=0,flashcardsReviewed=0,quizzesTaken=0,quizScore=0,streak=0,xp=0,badges=[]}=DB.stats;
    const allBadges=[
      {id:'first_upload',name:'First Upload',ic:'📁'},{id:'five_analyses',name:'5 Analyses',ic:'🔬'},
      {id:'flashmaster',name:'Flash Master',ic:'🃏'},{id:'quizace',name:'Quiz Ace',ic:'🏆'},
      {id:'streak7',name:'7-Day Streak',ic:'🔥'},{id:'scholar',name:'Scholar',ic:'🎓'},
      {id:'note_taker',name:'Note Taker',ic:'📝'},
    ];
    wrap.innerHTML=`
      <div class="stats-grid">
        ${[
          [analyses,'Analyses','🔬'],[DB.notes.length,'Notes','📝'],
          [flashcardsReviewed,'Flashcards','🃏'],[quizzesTaken,'Quizzes','❓'],
          [streak+'🔥','Day streak','🔥'],[xp+'⭐','Total XP','⭐'],
        ].map(([v,l,ic],i)=>`<div class="stat-card" style="animation-delay:${i*0.07}s">
          <div style="font-size:26px;margin-bottom:4px">${ic}</div>
          <div class="stat-card-val">${v}</div><div class="stat-card-label">${l}</div>
        </div>`).join('')}
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;margin-bottom:16px">
        <h4 style="font-family:var(--ff-head);font-size:16px;font-weight:500;margin-bottom:16px">📚 Activity by Subject</h4>
        ${DB.getAllFolders().slice(0,6).map(f=>{
          const cnt=DB.files.filter(x=>x.folder===f.id).length;
          const pct=DB.files.length?Math.round((cnt/DB.files.length)*100):0;
          return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <span style="font-size:12px;width:140px;color:var(--text2)">${f.ic} ${f.label}</span>
            <div style="flex:1;height:6px;background:var(--bg3);border-radius:3px;overflow:hidden">
              <div style="height:100%;background:${f.color};border-radius:3px;width:${pct}%;transition:width .7s ease"></div>
            </div>
            <span style="font-size:12px;color:var(--text3);width:20px;text-align:right">${cnt}</span>
          </div>`;
        }).join('')}
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;margin-bottom:16px">
        <h4 style="font-family:var(--ff-head);font-size:16px;font-weight:500;margin-bottom:16px">🏅 Badges</h4>
        <div class="badge-grid">
          ${allBadges.map(b=>`<div class="badge-item${badges.includes(b.id)?'':' locked'}">
            <span style="font-size:20px">${b.ic}</span><span style="font-size:12px">${b.name}</span>
          </div>`).join('')}
        </div>
      </div>
      <div style="background:var(--green-bg);border:1px solid var(--green);border-radius:var(--radius-lg);padding:14px 18px;font-size:13px;color:var(--green)">
        ✅ <strong>100% Free</strong> — Using OpenRouter free tier: Llama 3.1 8B, Mistral 7B, Gemma 2 9B. Zero cost for you and users.
      </div>`;
  },
};

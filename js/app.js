// ══ UI ══
const UI = {
  showModal(html) {
    const overlay=document.getElementById('modalOverlay'),box=document.getElementById('modalBox');
    if(!overlay||!box)return;
    box.innerHTML=html;
    overlay.classList.add('open');
    setTimeout(()=>box.querySelector('input,textarea,select')?.focus(),60);
  },
  closeModal(){document.getElementById('modalOverlay')?.classList.remove('open');},

  toast(msg,type='info',duration=3000) {
    const root=document.getElementById('toastRoot');
    if(!root)return;
    const el=document.createElement('div');
    el.className=`toast ${type}`;
    const icons={success:'bi-check-circle-fill',error:'bi-x-circle-fill',info:'bi-info-circle-fill',warning:'bi-exclamation-triangle-fill'};
    el.innerHTML=`<i class="bi ${icons[type]||'bi-info-circle-fill'}"></i><span>${msg}</span>`;
    root.prepend(el);
    const hide=()=>{el.style.opacity='0';el.style.transform='translateX(10px)';el.style.transition='all .25s';setTimeout(()=>el.remove(),260);};
    if(duration>0)setTimeout(hide,duration);
    el.onclick=hide;
  },

  renderSidebar() {
    const xp=DB.stats?.xp||0;
    const el=document.getElementById('xpCount');if(el)el.textContent=xp;
    const sbStats=document.getElementById('sbStats');
    if(sbStats)sbStats.innerHTML=`
      <div class="stat-row"><span>Files</span><span class="stat-val">${DB.files.length}</span></div>
      <div class="stat-row"><span>Notes</span><span class="stat-val">${DB.notes.length}</span></div>
      <div class="stat-row"><span>XP</span><span class="stat-val">${xp}⭐</span></div>`;
    const cA=document.getElementById('cnt-all'),cR=document.getElementById('cnt-recent'),cS=document.getElementById('cnt-starred');
    if(cA)cA.textContent=DB.files.length;
    if(cR)cR.textContent=Math.min(DB.files.length,12);
    if(cS)cS.textContent=DB.files.filter(f=>f.starred).length;
    const tt=document.getElementById('typeTree');
    if(tt){
      const types=[...new Set(DB.files.map(f=>f.type).filter(Boolean))];
      tt.innerHTML=types.length
        ?types.map(t=>{const ft=DB.getft('.'+t);return`<div class="tree-row" onclick="App.setView('type:${t}')"><span style="width:8px;height:8px;border-radius:50%;background:${ft.dot};flex-shrink:0"></span><span>${ft.label}</span><span class="tree-count">${DB.files.filter(f=>f.type===t).length}</span></div>`;}).join('')
        :'<div style="font-size:11px;color:var(--text4);padding:4px 8px">No files yet</div>';
    }
    const ft=document.getElementById('folderTree');
    if(ft)ft.innerHTML=this._renderFolderTree(DB.folders,0);
    const sc=document.getElementById('streakCard');
    if(sc)sc.innerHTML=`🔥 ${DB.stats?.streak||0}-day streak &nbsp;·&nbsp; ⭐ ${xp} XP`;
    this.applyActiveNav();
  },

  _renderFolderTree(folders,depth){
    return folders.map(f=>{
      const cnt=DB.files.filter(x=>x.folder===f.id).length;
      const hasKids=f.children&&f.children.length;
      return`<div>
        <div class="tree-row" onclick="App.setView('folder:${f.id}')" style="padding-left:${8+depth*10}px">
          <span style="font-size:14px">${f.ic}</span>
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.label}</span>
          <span class="tree-count">${cnt}</span>
        </div>
        ${hasKids?`<div>${this._renderFolderTree(f.children,depth+1)}</div>`:''}
      </div>`;
    }).join('');
  },

  applyActiveNav(){
    const view=App.state?.fmView||'all';
    document.querySelectorAll('[data-view]').forEach(r=>r.classList.toggle('active',r.dataset.view===view));
  },

  initDropZone(){
    const dz=document.getElementById('dropZone');if(!dz)return;
    ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('dragging');}));
    ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,()=>dz.classList.remove('dragging')));
    dz.addEventListener('drop',e=>{e.preventDefault();App._processFiles(Array.from(e.dataTransfer.files));});
  },
};

// ══ APP ══
const App = {
  state:{page:'analyzer',fmView:'all',searchQ:'',hlMode:false},

  init() {
    DB.init();
    this.applyTheme(DB.settings.theme||'light');
    const langSel=document.getElementById('langSel');if(langSel)langSel.value=DB.settings.lang||'en';
    this._updateLangBadge(DB.settings.lang||'en');
    this._populateModelSel();

    Analyzer.init();Notes.init();Progress.refresh();UI.renderSidebar();UI.initDropZone();
    if(DB.files.length)Analyzer.setActiveFile(DB.files[0]);
    DB.updateStreak();

    if(window.location.protocol==='file:'){
      UI.toast('⚠ Run server.py → open http://localhost:8000','error',0);return;
    }

    // Check server health
    fetch('/api/health').then(r=>r.json()).then(d=>{
      if(!d.key_set){
        UI.toast('⚠ OPENROUTER_API_KEY not set on server. Add it in Render Environment Variables.','error',0);
      } else {
        UI.toast('Welcome to StudyAI Pro 📚 — Powered by free AI','info',2500);
      }
    }).catch(()=>{
      UI.toast('Welcome to StudyAI Pro 📚','info',2500);
    });

    document.getElementById('modalOverlay')?.addEventListener('click',e=>{if(e.target===e.currentTarget)UI.closeModal();});
  },

  _populateModelSel(){
    const sel=document.getElementById('modelSel');if(!sel)return;
    sel.innerHTML=DB.OR_MODELS.map(m=>
      `<option value="${m.id}"${DB.settings.model===m.id?' selected':''}>${m.label}</option>`
    ).join('');
    sel.onchange=()=>{DB.settings.model=sel.value;DB.save();};
  },

  setView(view){this.state.fmView=view;Nav.go('files');FM.selected.clear();FM.render();UI.applyActiveNav();},
  search(q){this.state.searchQ=q;if(Nav.current!=='files')Nav.go('files');FM.render();},
  handleUpload(event){this._processFiles(Array.from(event.target.files));event.target.value='';},

  _processFiles(files) {
    if(!files.length)return;
    let done=0;
    files.forEach(file=>{
      if(DB.files.find(x=>x.name===file.name&&x.size===file.size)){done++;return;}
      const id=DB.uid();
      const entry={id,name:file.name,size:file.size,type:DB.ext(file.name),folder:null,starred:false,added:Date.now(),rawText:null,b64:null};
      const reader=new FileReader();
      const isPDF=file.type==='application/pdf'||file.name.endsWith('.pdf');
      const isImg=/\.(png|jpg|jpeg)$/i.test(file.name);
      if(isPDF){
        reader.onload=ev=>{entry.b64=ev.target.result.split(',')[1];DB.files.unshift(entry);DB.save();if(++done===files.length)this._afterUpload(entry);};
        reader.readAsDataURL(file);
      }else if(isImg){
        reader.onload=ev=>{entry.b64=ev.target.result.split(',')[1];entry.rawText='[Image]';DB.files.unshift(entry);DB.save();if(++done===files.length)this._afterUpload(entry);};
        reader.readAsDataURL(file);
      }else{
        reader.onload=ev=>{entry.rawText=ev.target.result.substring(0,10000);DB.files.unshift(entry);DB.save();if(++done===files.length)this._afterUpload(entry);};
        reader.readAsText(file);
      }
    });
  },

  _afterUpload(entry){
    UI.renderSidebar();FM.render();Analyzer.setActiveFile(entry);
    DB.addXP(10);const badge=DB.checkBadges();
    if(badge)UI.toast(`🏆 Badge: ${badge.name}!`,'success',4000);
    UI.toast(`✓ ${entry.name} uploaded`,'success');Progress.refresh();
  },

  toggleSidebar(){const sb=document.getElementById('sidebar');if(!sb)return;sb.classList.toggle('collapsed');DB.settings.sidebarOpen=!sb.classList.contains('collapsed');DB.save();},

  toggleTheme(){const next=DB.settings.theme==='dark'?'light':'dark';this.applyTheme(next);DB.settings.theme=next;DB.save();},
  applyTheme(theme){
    document.documentElement.setAttribute('data-theme',theme);
    const btn=document.getElementById('themeToggle');
    if(btn)btn.innerHTML=theme==='dark'?'<i class="bi bi-sun-fill"></i>':'<i class="bi bi-moon-fill"></i>';
  },

  setLang(lang){DB.settings.lang=lang;DB.save();this._updateLangBadge(lang);UI.toast('Language: '+lang.toUpperCase(),'info',1500);},
  _updateLangBadge(lang){const el=document.getElementById('langBadge');if(el)el.textContent=lang.toUpperCase();},

  showSettings() {
    UI.showModal(`
      <h2 class="modal-title">⚙️ Settings</h2>
      <div style="background:var(--green-bg);border:1px solid var(--green);border-radius:var(--radius);padding:12px;margin-bottom:14px;font-size:12px;color:var(--green)">
        <strong>🆓 100% Free</strong> — No API key needed in the browser!<br>
        Set <code>OPENROUTER_API_KEY</code> in Render environment variables.<br>
        Get free key at <a href="https://openrouter.ai" target="_blank" style="color:var(--green)">openrouter.ai</a>
      </div>
      <label class="modal-label">Free AI Model</label>
      <select class="modal-input" id="settingsModel" style="cursor:pointer">
        ${DB.OR_MODELS.map(m=>`<option value="${m.id}"${DB.settings.model===m.id?' selected':''}>${m.label}</option>`).join('')}
      </select>
      <label class="modal-label">Language</label>
      <select class="modal-input" id="settingsLang" style="cursor:pointer">
        <option value="en" ${DB.settings.lang==='en'?'selected':''}>🌐 English</option>
        <option value="hi" ${DB.settings.lang==='hi'?'selected':''}>🇮🇳 Hindi</option>
        <option value="te" ${DB.settings.lang==='te'?'selected':''}>🇮🇳 Telugu</option>
        <option value="ta" ${DB.settings.lang==='ta'?'selected':''}>🇮🇳 Tamil</option>
        <option value="es" ${DB.settings.lang==='es'?'selected':''}>🇪🇸 Spanish</option>
        <option value="fr" ${DB.settings.lang==='fr'?'selected':''}>🇫🇷 French</option>
        <option value="de" ${DB.settings.lang==='de'?'selected':''}>🇩🇪 German</option>
        <option value="zh" ${DB.settings.lang==='zh'?'selected':''}>🇨🇳 Chinese</option>
        <option value="ar" ${DB.settings.lang==='ar'?'selected':''}>🇸🇦 Arabic</option>
      </select>
      <label class="modal-label">Health Check</label>
      <a href="/api/health" target="_blank" class="modal-input" style="display:block;text-decoration:none;color:var(--accent);cursor:pointer">
        Open /api/health → verify API key is loaded ↗
      </a>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="UI.closeModal()">Cancel</button>
        <button class="btn-primary" onclick="App._saveSettings()">Save</button>
      </div>`);
  },

  _saveSettings(){
    const model=document.getElementById('settingsModel')?.value;
    const lang=document.getElementById('settingsLang')?.value;
    if(model){DB.settings.model=model;document.getElementById('modelSel').value=model;}
    if(lang){DB.settings.lang=lang;App.setLang(lang);}
    DB.save();UI.closeModal();UI.toast('Settings saved ✓','success');
  },

  showNewFolderModal(){
    UI.showModal(`
      <h2 class="modal-title">New Folder</h2>
      <label class="modal-label">Folder name</label>
      <input class="modal-input" id="folderName" placeholder="e.g. Chemistry">
      <label class="modal-label">Icon (emoji)</label>
      <input class="modal-input" id="folderIcon" placeholder="e.g. 🧪" maxlength="4">
      <div class="modal-actions">
        <button class="btn-cancel" onclick="UI.closeModal()">Cancel</button>
        <button class="btn-primary" onclick="App._createFolder()">Create</button>
      </div>`);
  },

  _createFolder(){
    const name=document.getElementById('folderName')?.value.trim();
    const ic=document.getElementById('folderIcon')?.value.trim()||'📁';
    if(!name)return;
    DB.folders.push({id:DB.uid(),label:name,ic,color:'#534AB7',parent:null,children:[]});
    DB.save();UI.closeModal();UI.renderSidebar();UI.toast('Folder created ✓','success');
  },
};

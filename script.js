'use strict';

/* ═══════════════════════════════════
   STATE
═══════════════════════════════════ */
const S = {
  subjects: ls('cs3_subjects', []),
  notes:    ls('cs3_notes', []),
  cfg:      ls('cs3_cfg', { focus:25, short:5, long:15, cycles:4 }),
  today: {
    min:  lsi('cs3_tmin', 0),
    pomo: lsi('cs3_tpomo', 0),
  },
  streak: lsi('cs3_streak', 1),
  // timer
  activeId: null,
  running: false,
  phase: 'focus',
  secs: 0,
  totalSecs: 0,
  pomoDone: 0,
  sessMins: 0,
  tick: null,
  // notes
  activeNoteId: null,
  // nav
  currentView: 'dash',
};

const CIRC = 2 * Math.PI * 68; // ≈ 427

/* ═══════════════════════════════════
   HELPERS
═══════════════════════════════════ */
function ls(k, def) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; }
  catch { return def; }
}
function lsi(k, def) {
  const v = parseInt(localStorage.getItem(k));
  return isNaN(v) ? def : v;
}
function save() {
  localStorage.setItem('cs3_subjects', JSON.stringify(S.subjects));
  localStorage.setItem('cs3_notes',    JSON.stringify(S.notes));
  localStorage.setItem('cs3_cfg',      JSON.stringify(S.cfg));
  localStorage.setItem('cs3_tmin',     S.today.min);
  localStorage.setItem('cs3_tpomo',    S.today.pomo);
  localStorage.setItem('cs3_streak',   S.streak);
}
const $ = id => document.getElementById(id);

const TYPE_CFG = {
  leitura:   { l: '📖 Leitura',   cls: 't-leitura',   ico: '📖' },
  revisao:   { l: '🔁 Revisão',   cls: 't-revisao',   ico: '🔁' },
  exercicio: { l: '✏️ Exercício', cls: 't-exercicio', ico: '✏️' },
  projeto:   { l: '🚀 Projeto',   cls: 't-projeto',   ico: '🚀' },
};
const DIFF_CFG = {
  baixa: { l: 'Baixa', cls: 'd-baixa', c: 'var(--green)' },
  media: { l: 'Média', cls: 'd-media', c: 'var(--orange)' },
  alta:  { l: 'Alta',  cls: 'd-alta',  c: 'var(--red)' },
};

let toastTimer;
function toast(ico, msg) {
  clearTimeout(toastTimer);
  $('t-ico').textContent = ico;
  $('t-msg').textContent = msg;
  const t = $('toast');
  t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ═══════════════════════════════════
   NAVIGATION
═══════════════════════════════════ */
function nav(v) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn[id^="nb-"]').forEach(b => b.classList.remove('active'));
  const viewEl = $(`view-${v}`);
  const btnEl  = $(`nb-${v}`);
  if (viewEl) viewEl.classList.add('active');
  if (btnEl)  btnEl.classList.add('active');
  S.currentView = v;
  if (v === 'pomo')  renderPomoView();
  if (v === 'notes') renderNotesList();
}

/* ═══════════════════════════════════
   RENDER DASHBOARD
═══════════════════════════════════ */
function renderDash() {
  const active = S.subjects.filter(s => !s.done);
  const done   = S.subjects.filter(s => s.done);
  const list   = $('subj-list');
  const doneS  = $('done-section');
  const doneL  = $('done-list');

  list.innerHTML = active.length === 0
    ? `<div class="empty-state">
        <div class="empty-ico">📚</div>
        <div class="empty-t">Sem matérias ainda</div>
        <div class="empty-d">Adicione sua primeira matéria<br>e inicie uma sessão de foco.</div>
        <button class="empty-btn" onclick="openAdd()">＋ Adicionar matéria</button>
       </div>`
    : active.map(s => subjCard(s, false)).join('');

  if (done.length) {
    doneS.style.display = 'block';
    doneL.innerHTML = done.map(s => subjCard(s, true)).join('');
  } else {
    doneS.style.display = 'none';
  }

  bindSubjCards();
  updateStats();
}

function subjCard(s, isDone) {
  const t   = TYPE_CFG[s.type] || TYPE_CFG.leitura;
  const d   = DIFF_CFG[s.diff] || DIFF_CFG.baixa;
  const isRun = S.activeId === s.id;
  const pct = s.estTime
    ? Math.min(100, Math.round((s.studiedMin / s.estTime) * 100))
    : 0;

  return `
  <div class="subj-card ${isRun ? 'running' : ''} ${isDone ? 'completed' : ''}" data-id="${s.id}">
    <div class="subj-icon ${t.cls}">${t.ico}</div>
    <div class="subj-body">
      <div class="subj-name">${s.name}</div>
      <div class="subj-meta">
        <span class="tag ${d.cls}">${d.l}</span>
        <span style="font-size:11px;color:var(--muted)">${s.studiedMin || 0}${s.estTime ? '/' + s.estTime : ''}min</span>
        ${s.estTime
          ? `<div class="subj-prog-wrap"><div class="subj-prog"><div class="subj-prog-fill" style="width:${pct}%;background:${d.c}"></div></div></div>`
          : ''}
      </div>
    </div>
    <div class="subj-btns">
      ${!isDone ? `<button class="sbn sbn-play"  data-a="play"  data-id="${s.id}" title="Estudar">▶</button>` : ''}
      ${!isDone ? `<button class="sbn sbn-check" data-a="check" data-id="${s.id}" title="Concluir">✓</button>` : ''}
      <button class="sbn sbn-note" data-a="note" data-id="${s.id}" title="Nota">📝</button>
      <button class="sbn sbn-del"  data-a="del"  data-id="${s.id}" title="Remover">✕</button>
    </div>
  </div>`;
}

function bindSubjCards() {
  document.querySelectorAll('[data-a]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const a  = btn.dataset.a;
      if (a === 'play')  startSession(id);
      if (a === 'check') completeSubj(id);
      if (a === 'del')   deleteSubj(id);
      if (a === 'note')  openNoteForSubject(id);
    });
  });
  document.querySelectorAll('.subj-card').forEach(c => {
    c.addEventListener('click', () => startSession(c.dataset.id));
  });
}

function updateStats() {
  $('d-min').textContent  = S.today.min;
  $('d-pomo').textContent = S.today.pomo;
  $('d-done').textContent = S.subjects.filter(s => s.done).length;
  const pct = Math.min(100, Math.round((S.today.min / 120) * 100));
  $('d-prog').style.width = pct + '%';
  $('d-pct').textContent  = pct + '%';
}

/* ═══════════════════════════════════
   SUBJECT CRUD
═══════════════════════════════════ */
let _type = 'leitura', _diff = 'baixa';

function openAdd() {
  $('f-name').value     = '';
  $('f-time').value     = '';
  $('f-notes').value    = '';
  _type = 'leitura'; _diff = 'baixa';
  setChips('type-chips', _type);
  setChips('diff-chips', _diff);
  $('opt-f').classList.remove('show');
  $('opt-tgl').textContent = '▸ Opções avançadas';
  openModal('add-modal');
  setTimeout(() => $('f-name').focus(), 350);
}

function setChips(id, val) {
  document.querySelectorAll(`#${id} .chip`).forEach(c =>
    c.classList.toggle('on', c.dataset.v === val)
  );
}

document.querySelectorAll('#type-chips .chip').forEach(c =>
  c.addEventListener('click', () => { _type = c.dataset.v; setChips('type-chips', _type); })
);
document.querySelectorAll('#diff-chips .chip').forEach(c =>
  c.addEventListener('click', () => { _diff = c.dataset.v; setChips('diff-chips', _diff); })
);

$('opt-tgl').addEventListener('click', () => {
  const f = $('opt-f');
  f.classList.toggle('show');
  $('opt-tgl').textContent = f.classList.contains('show')
    ? '▾ Opções avançadas'
    : '▸ Opções avançadas';
});

$('btn-add').addEventListener('click', openAdd);

$('add-cancel').addEventListener('click', () => closeModal('add-modal'));
$('add-modal').addEventListener('click', e => {
  if (e.target === $('add-modal')) closeModal('add-modal');
});

$('add-ok').addEventListener('click', () => {
  const name = $('f-name').value.trim();
  if (!name) {
    $('f-name').style.borderColor = 'var(--red)';
    $('f-name').focus();
    return;
  }
  $('f-name').style.borderColor = '';

  const s = {
    id:         Date.now().toString(),
    name,
    type:       _type,
    diff:       _diff,
    estTime:    parseInt($('f-time').value)     || 0,
    notes:      $('f-notes').value,
    studiedMin: 0,
    sessions:   0,
    done:       false,
    noteId:     null,
  };

  S.subjects.unshift(s);

  if (s.notes) {
    const note = createNote(s.name, s.notes);
    s.noteId = note.id;
  }

  save();
  renderDash();
  closeModal('add-modal');
  toast('✓', `"${s.name}" adicionada!`);
});

$('f-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('add-ok').click();
});

function completeSubj(id) {
  const s = S.subjects.find(x => x.id === id);
  if (!s) return;
  s.done = !s.done;
  if (s.done && S.activeId === id) stopTimer();
  save();
  renderDash();
  toast(s.done ? '✅' : '↩️', s.done ? `"${s.name}" concluída!` : `"${s.name}" reativada`);
}

function deleteSubj(id) {
  if (S.activeId === id) stopTimer();
  S.subjects = S.subjects.filter(x => x.id !== id);
  save();
  renderDash();
  toast('🗑', 'Matéria removida');
}

/* ═══════════════════════════════════
   TIMER
═══════════════════════════════════ */
function startSession(id) {
  if (S.running) pauseTimer();
  const already = S.activeId === id;
  S.activeId = id;
  if (!already) {
    S.pomoDone = 0;
    S.sessMins = 0;
    S.phase    = 'focus';
    loadPhase();
  }
  renderDash();
  renderPomoView();
  updateBar();
  startTimer();
  nav('pomo');
}

function loadPhase() {
  const d = {
    focus: S.cfg.focus * 60,
    short: S.cfg.short * 60,
    long:  S.cfg.long  * 60,
  };
  S.totalSecs = d[S.phase];
  S.secs      = S.totalSecs;
  updateTimerUI();
  updateRing();
  renderDots();
}

function startTimer() {
  S.running = true;
  clearInterval(S.tick);
  S.tick = setInterval(doTick, 1000);
  setPlayBtn(true);
  $('ring-wrap') && $('ring-wrap').classList.add('running');
  $('pomo-dot').classList.add('show');
}

function pauseTimer() {
  S.running = false;
  clearInterval(S.tick);
  setPlayBtn(false);
  $('ring-wrap') && $('ring-wrap').classList.remove('running');
}

function stopTimer() {
  pauseTimer();
  S.activeId = null;
  S.phase    = 'focus';
  S.pomoDone = 0;
  S.sessMins = 0;
  $('pomo-dot').classList.remove('show');
  $('pomo-bar').classList.remove('visible');
  save();
  renderDash();
  renderPomoView();
}

function doTick() {
  if (S.secs <= 0) { phaseEnd(); return; }
  S.secs--;

  if (S.phase === 'focus' && S.secs % 60 === 59) {
    const s = S.subjects.find(x => x.id === S.activeId);
    if (s) s.studiedMin = (s.studiedMin || 0) + 1;
    S.today.min++;
    S.sessMins++;
    save();
    updateStats();
    if (S.currentView === 'dash')  renderDash();
    if (S.currentView === 'pomo')  renderPomoView();
  }

  updateTimerUI();
  updateRing();
  updateBar();
}

function phaseEnd() {
  clearInterval(S.tick);
  S.running = false;
  $('ring-wrap') && $('ring-wrap').classList.remove('running');
  setPlayBtn(false);

  if (S.phase === 'focus') {
    S.pomoDone++;
    S.today.pomo++;
    S.sessMins++;
    save();
    updateStats();

    const isLong = S.pomoDone % S.cfg.cycles === 0;
    $('end-min').textContent    = S.sessMins;
    $('end-pomo').textContent   = S.pomoDone;
    $('end-streak').textContent = S.streak;
    $('end-sub').textContent    = isLong
      ? `${S.cfg.cycles} pomodoros concluídos! Pausa longa de ${S.cfg.long} min.`
      : `Ótimo foco! Pausa curta de ${S.cfg.short} min.`;
    $('end-emoji').textContent  = isLong ? '🏆' : '🎯';
    S.phase = isLong ? 'long' : 'short';
    openModal('end-modal');
  } else {
    S.phase = 'focus';
    loadPhase();
    toast('☕', 'Pausa encerrada! Vamos focar.');
  }

  renderDash();
  renderPomoView();
  updateBar();
}

function updateTimerUI() {
  const mm  = String(Math.floor(S.secs / 60)).padStart(2, '0');
  const ss  = String(S.secs % 60).padStart(2, '0');
  const t   = `${mm}:${ss}`;
  const ph  = S.phase === 'focus' ? 'foco'
            : S.phase === 'short' ? 'pausa curta'
            : 'pausa longa';

  if ($('ring-time'))  $('ring-time').textContent  = t;
  if ($('ring-phase')) $('ring-phase').textContent = ph;
  $('bar-time').textContent  = t;
  $('bar-phase').textContent = ph;
}

function updateRing() {
  const pct = S.secs / S.totalSecs;
  const off = CIRC * (1 - pct);
  if ($('ring-fg')) $('ring-fg').style.strokeDashoffset = off;
  $('bar-fill').style.width = (pct * 100) + '%';
}

function renderDots() {
  const n = S.cfg.cycles;
  let h = '';
  for (let i = 0; i < n; i++) {
    const cls = i < S.pomoDone ? 'done' : i === S.pomoDone ? 'cur' : '';
    h += `<div class="pomo-dot ${cls}"></div>`;
  }
  if ($('pomo-dots')) $('pomo-dots').innerHTML = h;
}

function setPlayBtn(playing) {
  [$('pc-pp'), $('bar-pp')].forEach(btn => {
    if (btn) btn.textContent = playing ? '⏸' : '▶';
  });
}

function updateBar() {
  const s = S.subjects.find(x => x.id === S.activeId);
  $('bar-subject').textContent = s ? s.name : '—';
  updateTimerUI();
  updateRing();
  $('pomo-bar').classList.toggle('visible', !!S.activeId);
}

function renderPomoView() {
  const s = S.subjects.find(x => x.id === S.activeId);
  if (!s) {
    $('pomo-no-subj').style.display  = 'block';
    $('pomo-active').style.display   = 'none';
  } else {
    $('pomo-no-subj').style.display  = 'none';
    $('pomo-active').style.display   = 'flex';
    $('pomo-subj-name').textContent  = s.name;
    // atualiza card de progresso
    $('psi-pomos').textContent = S.today.pomo + ' pomodoro' + (S.today.pomo !== 1 ? 's' : '');
    $('psi-time').textContent  = (s.studiedMin || 0) + ' min nesta matéria';
    // mostra barra de meta só se o usuário definiu tempo estimado
    const goalRow = $('psi-goal-row');
    if (s.estTime) {
      goalRow.style.display = 'block';
      const pct = Math.min(100, Math.round(((s.studiedMin || 0) / s.estTime) * 100));
      $('psi-goal-val').textContent  = `${s.studiedMin || 0} / ${s.estTime} min`;
      $('psi-goal-fill').style.width = pct + '%';
    } else {
      goalRow.style.display = 'none';
    }
    updateTimerUI();
    updateRing();
    renderDots();
  }
}

/* Pomodoro controls */
$('pc-pp').addEventListener('click', () => {
  if (!S.activeId) return;
  S.running ? pauseTimer() : startTimer();
});
$('pc-restart').addEventListener('click', () => {
  if (!S.activeId) return;
  pauseTimer();
  S.phase    = 'focus';
  S.pomoDone = 0;
  loadPhase();
  renderDash();
  renderPomoView();
});
$('pc-stop').addEventListener('click', () => stopTimer());
$('bar-pp').addEventListener('click', () => {
  if (!S.activeId) return;
  S.running ? pauseTimer() : startTimer();
});
$('bar-stop').addEventListener('click', () => stopTimer());

/* End modal */
$('end-cont').addEventListener('click', () => {
  closeModal('end-modal');
  loadPhase();
  startTimer();
  renderPomoView();
  updateBar();
  toast('☕', S.phase !== 'focus' ? 'Pausa iniciada!' : 'Vamos lá!');
});
$('end-stop').addEventListener('click', () => {
  closeModal('end-modal');
  stopTimer();
});

/* ═══════════════════════════════════
   SETTINGS
═══════════════════════════════════ */
function openCfg() {
  $('s-focus').value  = S.cfg.focus;
  $('s-short').value  = S.cfg.short;
  $('s-long').value   = S.cfg.long;
  $('s-cycles').value = S.cfg.cycles;
  openModal('cfg-modal');
}

function step(id, d) {
  const el = $(id);
  el.value = Math.max(
    parseInt(el.min) || 1,
    Math.min(parseInt(el.max) || 999, parseInt(el.value) + d)
  );
}

$('cfg-cancel').addEventListener('click', () => closeModal('cfg-modal'));
$('cfg-modal').addEventListener('click', e => {
  if (e.target === $('cfg-modal')) closeModal('cfg-modal');
});
$('cfg-ok').addEventListener('click', () => {
  S.cfg.focus  = parseInt($('s-focus').value)  || 25;
  S.cfg.short  = parseInt($('s-short').value)  || 5;
  S.cfg.long   = parseInt($('s-long').value)   || 15;
  S.cfg.cycles = parseInt($('s-cycles').value) || 4;
  save();
  if (!S.running && S.activeId) loadPhase();
  closeModal('cfg-modal');
  toast('✓', 'Configurações salvas');
});

/* ═══════════════════════════════════
   NOTES
═══════════════════════════════════ */
let _noteSaveTimer;

function createNote(title = 'Nova nota', content = '') {
  const note = {
    id:        Date.now().toString(),
    title:     title || 'Nova nota',
    content,
    updatedAt: Date.now(),
  };
  S.notes.unshift(note);
  save();
  return note;
}

function delNote() {
  if (!S.activeNoteId) return;
  S.notes = S.notes.filter(n => n.id !== S.activeNoteId);
  S.subjects.forEach(s => { if (s.noteId === S.activeNoteId) s.noteId = null; });
  S.activeNoteId = null;
  save();
  renderNotesList();
  showNoteEditor(null);
  toast('🗑', 'Nota removida');
}

function openNoteForSubject(subjId) {
  const s = S.subjects.find(x => x.id === subjId);
  if (!s) return;
  if (!s.noteId) {
    const n = createNote(s.name, s.notes || '');
    s.noteId = n.id;
    save();
  }
  nav('notes');
  renderNotesList();
  openNote(s.noteId);
}

function openNote(id) {
  const n = S.notes.find(x => x.id === id);
  if (!n) return;
  S.activeNoteId = id;
  showNoteEditor(n);
  renderNotesList();
}

function showNoteEditor(n) {
  if (!n) {
    $('notes-empty').style.display    = 'flex';
    $('notes-edit-area').style.display = 'none';
    return;
  }
  $('notes-empty').style.display    = 'none';
  $('notes-edit-area').style.display = 'flex';
  $('note-title').value   = n.title;
  $('note-content').value = n.content;
}

function renderNotesList() {
  const list = $('notes-list');
  if (!S.notes.length) {
    list.innerHTML = `<div style="padding:20px;text-align:center;font-size:12px;color:var(--muted)">Nenhuma nota ainda</div>`;
    return;
  }
  list.innerHTML = S.notes.map(n => `
    <div class="note-item ${n.id === S.activeNoteId ? 'active' : ''}" data-nid="${n.id}">
      <div class="note-item-title">${n.title || 'Sem título'}</div>
      <div class="note-item-preview">${(n.content || '').substring(0, 50) || '…'}</div>
      <div class="note-item-date">${relTime(n.updatedAt)}</div>
    </div>`).join('');

  list.querySelectorAll('.note-item').forEach(el => {
    el.addEventListener('click', () => openNote(el.dataset.nid));
  });
}

function relTime(ts) {
  const d = Date.now() - ts;
  if (d < 60000)    return 'Agora';
  if (d < 3600000)  return Math.floor(d / 60000) + 'min atrás';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h atrás';
  return new Date(ts).toLocaleDateString('pt-BR');
}

function noteInput() {
  clearTimeout(_noteSaveTimer);
  _noteSaveTimer = setTimeout(() => {
    const n = S.notes.find(x => x.id === S.activeNoteId);
    if (!n) return;
    n.title     = $('note-title').value || 'Sem título';
    n.content   = $('note-content').value;
    n.updatedAt = Date.now();
    save();
    renderNotesList();
  }, 600);
}

$('note-title').addEventListener('input', noteInput);
$('note-content').addEventListener('input', noteInput);

$('notes-new-btn').addEventListener('click', () => {
  const n = createNote();
  renderNotesList();
  openNote(n.id);
  setTimeout(() => $('note-title').focus(), 50);
});

function noteFmt(cmd) {
  $('note-content').focus();
  document.execCommand(cmd);
}

/* ═══════════════════════════════════
   MODAL HELPERS
═══════════════════════════════════ */
function openModal(id)  { $(id).classList.add('open'); }
function closeModal(id) { $(id).classList.remove('open'); }

/* ═══════════════════════════════════
   INIT
═══════════════════════════════════ */
function init() {
  renderDash();
  renderNotesList();
  updateTimerUI();
  updateRing();
  renderDots();
  updateBar();
  if (S.activeId) renderPomoView();
}

init();

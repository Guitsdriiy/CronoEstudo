/* ═══ CONSTANTS ══════════════════════════════════════════════════════ */
const COLORS=['#6c5ce7','#e17055','#00b894','#fdcb6e','#0984e3','#e84393','#00cec9','#a29bfe'];

/* ═══ STATE ══════════════════════════════════════════════════════════ */
var S={
  subjects:[],notes:[],goalMin:120,streak:0,studiedMin:0,
  pomodoros:0,sessions:0,selColor:COLORS[0],selFlag:'',
  curIdx:null,lastIdx:null,aiBusy:false,history:[],sys:'',
  activeFilter:'all',firstTime:true,
  timer:{on:false,paused:false,cycle:0,phase:'focus',rem:0,total:0,sessMin:0,iv:null},
  cfg:{f:50,b:10,c:3,l:30}
};

/* ═══ HELPERS ════════════════════════════════════════════════════════ */
function el(id){return document.getElementById(id)||null}
function setText(id,v){var e=el(id);if(e)e.textContent=v}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function pad(n){return String(n).padStart(2,'0')}
function fmtMin(m){var h=Math.floor(m/60),r=m%60;return h?(h+'h'+(r?r+'min':'')):(r+'min')}
var _tt;
function toast(msg){var e=el('toast');if(!e)return;e.textContent=msg;e.classList.add('on');clearTimeout(_tt);_tt=setTimeout(function(){e.classList.remove('on')},2400)}
function autoResize(t){t.style.height='auto';t.style.height=Math.min(t.scrollHeight,120)+'px'}

function mdToHtml(text){
  var t=text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  t=t.replace(/\*\*([^*\n]+?)\*\*/g,'<strong>$1</strong>');
  t=t.replace(/\*([^*\n]+?)\*/g,'<em>$1</em>');
  t=t.replace(/`([^`\n]+?)`/g,'<code>$1</code>');
  t=t.replace(/^#{1,3} (.+)$/gm,'<h4>$1</h4>');
  t=t.replace(/^[-•*] (.+)$/gm,'<li>$1</li>');
  // Safe list wrapping — split by newline, group consecutive <li>
  var lines=t.split('\n');
  var out=[];var inList=false;
  for(var i=0;i<lines.length;i++){
    var ln=lines[i];
    if(ln.startsWith('<li>')){
      if(!inList){out.push('<ul>');inList=true}
      out.push(ln);
    } else {
      if(inList){out.push('</ul>');inList=false}
      out.push(ln);
    }
  }
  if(inList)out.push('</ul>');
  t=out.join('\n');
  // Paragraphs
  var parts=t.split(/\n{2,}/);
  t=parts.map(function(p){
    p=p.trim();if(!p)return'';
    if(p.charAt(0)==='<')return p;
    return'<p>'+p.replace(/\n/g,'<br>')+'</p>';
  }).join('');
  return t;
}

/* ═══ ONBOARDING ═════════════════════════════════════════════════════ */
var onbStep=0;
function showOnb(){
  if(!S.firstTime)return;
  var m=el('onb-modal');if(m)m.classList.add('on');
}
function nextOnb(){
  var slides=document.querySelectorAll('.onb-slide');
  var dots=document.querySelectorAll('.onb-dot');
  slides[onbStep].classList.remove('on');
  dots[onbStep].classList.remove('on');
  onbStep++;
  if(onbStep>=slides.length){finishOnb();return}
  slides[onbStep].classList.add('on');
  dots[onbStep].classList.add('on');
  var btn=el('onb-next');
  if(btn)btn.textContent=onbStep===slides.length-1?'Começar ✓':'Próximo →';
}
function finishOnb(){
  S.firstTime=false;
  var m=el('onb-modal');if(m)m.classList.remove('on');
}

/* ═══ NAVIGATION ═════════════════════════════════════════════════════ */
function goPage(name,btn){
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('on')});
  var pg=el('pg-'+name);if(pg)pg.classList.add('on');
  document.querySelectorAll('.ni').forEach(function(b){b.classList.remove('on')});
  if(btn)btn.classList.add('on');
  var sc=el('scroll');if(sc)sc.scrollTop=0;
}
function goChat(idx){
  S.curIdx=idx;
  var s=S.subjects[idx];if(!s)return;
  setText('cb-name',s.name);
  setText('cb-sub',s.flag+' · Professor IA');
  var dot=el('cb-dot');if(dot)dot.style.background=s.color;
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('on')});
  var pg=el('pg-chat');if(pg)pg.classList.add('on');
  var sc=el('scroll');if(sc)sc.scrollTop=0;
  if(S.lastIdx!==idx||S.history.length===0){
    S.lastIdx=idx;S.history=[];
    var msgs=el('cmsgs');if(msgs)msgs.innerHTML='';
    initChat(s);
  }
}
function chatBack(){goPage('home',el('nb-home'))}

/* ═══ SUBJECTS ═══════════════════════════════════════════════════════ */
function renderSubjects(){
  var list=el('slist'),emp=el('empty-st');
  if(!list)return;
  list.innerHTML='';
  if(!S.subjects.length){if(emp)emp.classList.add('on');return}
  if(emp)emp.classList.remove('on');
  S.subjects.forEach(function(s,i){
    var d=document.createElement('div');
    d.className='scard';
    d.style.setProperty('--sc',s.color);
    d.innerHTML=
      '<div class="sdot" style="background:'+s.color+'"></div>'+
      '<div class="sbody">'+
        '<div class="sname">'+esc(s.name)+'</div>'+
        '<div class="sflag">'+esc(s.flag)+'</div>'+
        (s.ctx?'<div class="snote">'+esc(s.ctx)+'</div>':'')+
      '</div>'+
      '<div class="sside">'+
        '<div class="smins">'+(s.min>0?fmtMin(s.min):'—')+'</div>'+
        '<button class="delbtn" title="Excluir">🗑</button>'+
      '</div>';
    d.querySelector('.delbtn').addEventListener('click',function(e){e.stopPropagation();delSubj(i)});
    d.addEventListener('click',function(){openCfg(i)});
    list.appendChild(d);
  });
}
function delSubj(i){
  var name=S.subjects[i].name;
  S.subjects.splice(i,1);
  if(S.lastIdx===i){S.lastIdx=null;S.history=[]}
  renderSubjects();toast('"'+name+'" removida');
}
// NOTE: openAddSheet does NOT call openOv — directly manipulates DOM
function openAddSheet(){
  S.selFlag='';S.selColor=COLORS[0];
  var inp=el('inp-name');if(inp)inp.value='';
  var ctx=el('inp-ctx');if(ctx)ctx.value='';
  document.querySelectorAll('.flagbtn').forEach(function(b){b.classList.remove('on')});
  var sw=el('swatches');if(!sw)return;
  sw.innerHTML='';
  COLORS.forEach(function(c){
    var e=document.createElement('div');
    e.className='sw'+(c===S.selColor?' on':'');
    e.style.background=c;
    e.addEventListener('click',function(){
      S.selColor=c;
      document.querySelectorAll('.sw').forEach(function(x){x.classList.remove('on')});
      e.classList.add('on');
    });
    sw.appendChild(e);
  });
  var ov=el('ov-add');if(ov)ov.classList.add('on');
  setTimeout(function(){var i=el('inp-name');if(i)i.focus()},380);
}
function pickFlag(btn,flag){
  S.selFlag=flag;
  document.querySelectorAll('.flagbtn').forEach(function(b){b.classList.remove('on')});
  btn.classList.add('on');
}
function addSubject(){
  var inp=el('inp-name');var ctx=el('inp-ctx');
  var name=inp?inp.value.trim():'';
  if(!name){toast('⚠️ Digite o nome da matéria');return}
  if(!S.selFlag){toast('⚠️ Escolha o tipo de atividade');return}
  S.subjects.push({name:name,flag:S.selFlag,ctx:ctx?ctx.value.trim():'',color:S.selColor,min:0});
  closeOv('ov-add');renderSubjects();toast('"'+name+'" adicionada ✓');
}

/* ═══ POMO CONFIG ════════════════════════════════════════════════════ */
function openCfg(idx){
  S.curIdx=idx;
  var s=S.subjects[idx];if(!s)return;
  setText('cfg-title','⚙️ '+s.name);
  setText('start-name',s.name);
  // Show pomo tip if first time
  var tip=el('pomo-tip');if(tip)tip.style.display=S.firstTime?'block':'none';
  updCfg();updSum();
  openOv('ov-cfg');
}
var BOUNDS={f:[5,120],b:[5,60],c:[1,8],l:[5,60]};
function adj(k,d){
  S.cfg[k]=Math.max(BOUNDS[k][0],Math.min(BOUNDS[k][1],S.cfg[k]+d));
  updCfg();updSum();
  document.querySelectorAll('.pbtn').forEach(function(p){p.classList.remove('on')});
}
function updCfg(){
  setText('cf',S.cfg.f);setText('cb',S.cfg.b);setText('cc',S.cfg.c);setText('cl',S.cfg.l);
}
function setPre(f,b,c,btn){
  S.cfg={f:f,b:b,c:c,l:f===25?15:30};
  updCfg();updSum();
  document.querySelectorAll('.pbtn').forEach(function(p){p.classList.remove('on')});
  btn.classList.add('on');
}
function clrPre(btn){
  document.querySelectorAll('.pbtn').forEach(function(p){p.classList.remove('on')});
  btn.classList.add('on');
}
function updSum(){
  var f=S.cfg.f,b=S.cfg.b,c=S.cfg.c,l=S.cfg.l;
  var ft=f*c,bt=b*(c-1)+l;
  setText('sm',c+' ciclos de '+f+' min = '+fmtMin(ft)+' de foco');
  setText('ss','+ '+(c-1)+' pausas de '+b+' min e 1 pausa longa de '+l+' min · Total: ~'+fmtMin(ft+bt));
}

/* ═══ TIMER ══════════════════════════════════════════════════════════ */
function startSession(){
  closeOv('ov-cfg');
  var t=S.timer;
  t.cycle=0;t.phase='focus';t.rem=S.cfg.f*60;t.total=S.cfg.f*60;
  t.on=true;t.paused=false;t.sessMin=0;
  var tb=el('tm-btn');if(tb)tb.textContent='⏸';
  var tm=el('tmini');if(tm)tm.classList.add('on');
  clearInterval(t.iv);
  t.iv=setInterval(tick,1000);
  updMini();goChat(S.curIdx);
}
function tick(){
  var t=S.timer;
  if(!t.on||t.paused)return;
  t.rem--;
  if(t.phase==='focus'){t.sessMin+=1/60;S.studiedMin+=1/60}
  updMini();
  if(t.rem<=0)advCycle();
}
function advCycle(){
  var t=S.timer,f=S.cfg.f,b=S.cfg.b,c=S.cfg.c,l=S.cfg.l;
  if(t.phase==='focus'){
    S.pomodoros++;
    if(t.cycle<c-1){t.phase='break';t.rem=b*60;t.total=b*60;toast('☕ Pausa!')}
    else{t.phase='lbreak';t.rem=l*60;t.total=l*60;toast('🎉 Pausa longa!')}
  } else if(t.phase==='lbreak'){
    finishSess();return;
  } else {
    t.cycle++;t.phase='focus';t.rem=f*60;t.total=f*60;toast('🎯 Próximo ciclo!');
  }
  updMini();
}
function updMini(){
  var t=S.timer;
  var m=Math.floor(t.rem/60),s=t.rem%60;
  setText('tm-d',pad(m)+':'+pad(s));
  setText('tm-p',t.phase==='focus'?'FOCO':t.phase==='break'?'PAUSA':'PAUSA LONGA');
}
function togglePlay(){
  var t=S.timer;if(!t.on)return;
  t.paused=!t.paused;
  var tb=el('tm-btn');if(tb)tb.textContent=t.paused?'▶':'⏸';
}
function finishSess(){
  clearInterval(S.timer.iv);S.timer.on=false;
  var e=Math.floor(S.timer.sessMin);
  if(S.curIdx!==null&&e>0)S.subjects[S.curIdx].min+=e;
  S.studiedMin=Math.floor(S.studiedMin);S.sessions++;
  var tm=el('tmini');if(tm)tm.classList.remove('on');
  renderSubjects();renderGoal();renderStats();toast('🎉 Sessão concluída!');
}
function confirmStop(){
  if(!S.timer.on){chatBack();return}
  S.timer.paused=true;
  var tb=el('tm-btn');if(tb)tb.textContent='▶';
  var m=el('cfm');if(m)m.classList.add('on');
}
function closeConfirm(){
  var m=el('cfm');if(m)m.classList.remove('on');
  if(S.timer.on){S.timer.paused=false;var tb=el('tm-btn');if(tb)tb.textContent='⏸'}
}
function doStop(){
  var m=el('cfm');if(m)m.classList.remove('on');
  clearInterval(S.timer.iv);S.timer.on=false;
  var e=Math.floor(S.timer.sessMin);
  if(S.curIdx!==null&&e>0)S.subjects[S.curIdx].min+=e;
  S.studiedMin=Math.floor(S.studiedMin);
  var tm=el('tmini');if(tm)tm.classList.remove('on');
  renderSubjects();renderGoal();renderStats();chatBack();
}

/* ═══ CHAT ════════════════════════════════════════════════════════════ */
function initChat(s){
  S.sys=
    'Você é um professor particular especialista e didático. Aluno estudando:\n'+
    '- Matéria: '+s.name+'\n'+
    '- Tipo: '+s.flag+'\n'+
    '- Contexto: '+(s.ctx||'não informado')+'\n\n'+
    'Instruções:\n'+
    '1. Seja didático, encorajador, use exemplos concretos.\n'+
    '2. Questão múltipla escolha — use EXATAMENTE:\n'+
    '[QUIZ]\nPergunta?\nA) ...\nB) ...\nC) ...\nD) ...\nCORRETA: B\n[/QUIZ]\n'+
    '3. Flashcard — use EXATAMENTE:\n'+
    '[FLASH]\nFRENTE: termo\nVERSO: resposta\n[/FLASH]\n'+
    '4. Use **negrito** para termos chave.\n'+
    '5. Use listas com "- " para enumerar.\n'+
    '6. Seja conciso — aluno está com timer rodando.\n'+
    '7. Quando buscar info atual, informe ao aluno.\n'+
    '8. Responda em português brasileiro.';
  var g='Olá! Sou seu **Professor IA** para **'+s.name+'**.\n\n'+
    'Estou preparado para uma sessão de **'+s.flag+'**'+
    (s.ctx?' sobre: *'+s.ctx+'*':'')+'.\n\n'+
    'Posso te ajudar com resumos, explicações, questões, flashcards e até buscar informações atualizadas. O que você quer fazer primeiro?';
  aiMsg(g,true);
}
function qa(type){
  var s=S.subjects[S.curIdx];
  var flag=s?s.flag:'este conteúdo';
  var map={
    resumo:'Me dê um resumo objetivo dos principais pontos do que estou estudando.',
    flash:'Crie 3 flashcards sobre os conceitos mais importantes do conteúdo.',
    quiz:'Me faça uma questão de múltipla escolha para testar meu conhecimento.',
    dica:'Me dê dicas práticas de como estudar '+flag+' de forma eficiente.',
    exemplo:'Me dê um exemplo prático e concreto do conteúdo principal.',
    busca:'Busque e me traga informações atuais e relevantes sobre o tema que estou estudando. Use seu conhecimento mais recente disponível e me informe o que encontrou.'
  };
  if(map[type])userMsg(map[type]);
}
function sendMsg(){
  var inp=el('cinp');
  if(!inp||S.aiBusy)return;
  var txt=inp.value.trim();
  if(!txt)return;
  inp.value='';inp.style.height='auto';
  userMsg(txt);
}
function handleKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg()}}
function userMsg(txt){
  if(S.aiBusy)return;
  appendUser(txt);
  S.history.push({role:'user',content:txt});
  callAI();
}
async function callAI(){
  S.aiBusy=true;
  var sb=el('csend');if(sb)sb.disabled=true;
  var typ=appendTyping();
  try{
    var res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:1200,
        system:S.sys,
        messages:S.history
      })
    });
    var data=await res.json();
    var raw='';
    if(data&&data.content&&Array.isArray(data.content)){
      for(var i=0;i<data.content.length;i++){
        if(data.content[i].type==='text'){raw=data.content[i].text;break}
      }
    }
    if(!raw)raw='Desculpe, não consegui responder. Tente novamente.';
    if(typ&&typ.parentNode)typ.remove();
    S.history.push({role:'assistant',content:raw});
    parseAndRender(raw);
  } catch(err){
    if(typ&&typ.parentNode)typ.remove();
    aiMsg('⚠️ Erro de conexão. Verifique sua internet.',false);
  } finally{
    S.aiBusy=false;
    var sb=el('csend');if(sb)sb.disabled=false;
  }
}
function parseAndRender(raw){
  var quizRe=/\[QUIZ\]([\s\S]*?)\[\/QUIZ\]/g;
  var flashRe=/\[FLASH\]([\s\S]*?)\[\/FLASH\]/g;
  var matches=[];var m;
  quizRe.lastIndex=0;flashRe.lastIndex=0;
  while((m=quizRe.exec(raw))!==null)matches.push({type:'quiz',c:m[1],s:m.index,e:m.index+m[0].length});
  while((m=flashRe.exec(raw))!==null)matches.push({type:'flash',c:m[1],s:m.index,e:m.index+m[0].length});
  matches.sort(function(a,b){return a.s-b.s});
  var segs=[];var cur=0;
  for(var i=0;i<matches.length;i++){
    var mx=matches[i];
    if(mx.s>cur){var t=raw.slice(cur,mx.s).trim();if(t)segs.push({type:'text',c:t})}
    segs.push(mx);cur=mx.e;
  }
  if(cur<raw.length){var t=raw.slice(cur).trim();if(t)segs.push({type:'text',c:t})}
  if(!segs.length)segs.push({type:'text',c:raw});
  for(var i=0;i<segs.length;i++){
    var sg=segs[i];
    if(sg.type==='text'&&sg.c)aiMsg(sg.c,i===0);
    else if(sg.type==='quiz')renderQuiz(sg.c);
    else if(sg.type==='flash')renderFlash(sg.c);
  }
}

/* ── Append helpers ── */
function scrollMsgs(){var e=el('cmsgs');if(e)setTimeout(function(){e.scrollTo({top:e.scrollHeight,behavior:'smooth'})},60)}

function appendUser(txt){
  var msgs=el('cmsgs');if(!msgs)return;
  var d=document.createElement('div');
  d.className='msg u';
  d.innerHTML='<div class="mav">👤</div><div class="mcon"><div class="bbl">'+esc(txt).replace(/\n/g,'<br>')+'</div></div>';
  msgs.appendChild(d);scrollMsgs();
}
function aiMsg(txt,showSave){
  if(showSave===undefined)showSave=true;
  var msgs=el('cmsgs');if(!msgs)return;
  var d=document.createElement('div');
  d.className='msg ai';
  var id='m'+Date.now()+Math.floor(Math.random()*9999);
  var html=mdToHtml(txt);
  d.innerHTML=
    '<div class="mav">🧑‍🏫</div>'+
    '<div class="mcon">'+
      '<div class="bbl" id="'+id+'">'+html+'</div>'+
      (showSave?'<div class="macts"><button class="mabtn" onclick="saveNote(\''+id+'\',this)">📌 Salvar nota</button></div>':'')+
    '</div>';
  msgs.appendChild(d);scrollMsgs();
}
function renderQuiz(raw){
  var lines=raw.trim().split('\n').map(function(l){return l.trim()}).filter(Boolean);
  var q=lines[0]||'Pergunta';
  var opts=lines.filter(function(l){return/^[A-D]\)/.test(l)});
  var cl=lines.find(function(l){return l.toUpperCase().startsWith('CORRETA:')});
  var corr=cl?cl.replace(/CORRETA:\s*/i,'').trim().charAt(0).toUpperCase():'A';
  var msgs=el('cmsgs');if(!msgs)return;
  var d=document.createElement('div');
  d.className='msg ai';
  var oh='';
  ['A','B','C','D'].forEach(function(lt,i){
    var o=opts[i];if(!o)return;
    var txt=o.replace(/^[A-D]\)\s*/,'');
    oh+='<button class="optbtn" data-l="'+lt+'" data-cor="'+corr+'" onclick="answerQ(this)">'+
      '<div class="optlet">'+lt+'</div><span>'+esc(txt)+'</span></button>';
  });
  d.innerHTML=
    '<div class="mav">🧑‍🏫</div>'+
    '<div class="mcon">'+
      '<div class="bbl"><strong>❓ '+esc(q)+'</strong></div>'+
      '<div class="opts">'+oh+'</div>'+
    '</div>';
  msgs.appendChild(d);scrollMsgs();
}
function renderFlash(raw){
  var frente=(raw.match(/FRENTE:\s*(.+)/i)||[])[1]||'?';
  var verso=(raw.match(/VERSO:\s*(.+)/i)||[])[1]||'?';
  var fid='fl'+Date.now();
  var msgs=el('cmsgs');if(!msgs)return;
  var d=document.createElement('div');
  d.className='msg ai';
  d.innerHTML=
    '<div class="mav">🧑‍🏫</div>'+
    '<div class="mcon">'+
      '<div class="cflash" id="'+fid+'" onclick="flipF(\''+fid+'\')">'+
        '<div class="cfq">🃏 '+esc(frente)+'</div>'+
        '<div class="cfa">✅ '+esc(verso)+'</div>'+
        '<div class="cfhint">Toque para revelar a resposta</div>'+
      '</div>'+
      '<div class="macts">'+
        '<button class="mabtn" data-f="'+esc(frente)+'" data-v="'+esc(verso)+'" onclick="saveFlash(this)">📌 Salvar nota</button>'+
      '</div>'+
    '</div>';
  msgs.appendChild(d);scrollMsgs();
}
function appendTyping(){
  var msgs=el('cmsgs');if(!msgs)return null;
  var d=document.createElement('div');
  d.className='typing';
  d.innerHTML='<div class="mav">🧑‍🏫</div><div class="tbbl"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div>';
  msgs.appendChild(d);scrollMsgs();
  return d;
}
function answerQ(btn){
  var corr=btn.dataset.cor,chose=btn.dataset.l;
  var wrap=btn.closest('.opts');
  if(!wrap)return;
  wrap.querySelectorAll('.optbtn').forEach(function(b){
    b.disabled=true;
    if(b.dataset.l===corr)b.classList.add('correct');
    else if(b===btn)b.classList.add('wrong');
  });
  toast(chose===corr?'✅ Correto! Ótimo trabalho!':'❌ Resposta correta: '+corr);
}
function flipF(id){var e=el(id);if(e)e.classList.toggle('flipped')}

/* ═══ NOTES ══════════════════════════════════════════════════════════ */
function saveNote(msgId,btn){
  var e=el(msgId);if(!e)return;
  var s=S.subjects[S.curIdx]||{};
  var title=e.textContent.trim().slice(0,70)+(e.textContent.length>70?'…':'');
  S.notes.unshift({id:Date.now(),title:title,body:e.innerHTML,
    sn:s.name||'—',sc:s.color||COLORS[0],flag:s.flag||'',
    date:new Date().toLocaleDateString('pt-BR')});
  btn.classList.add('saved');btn.textContent='✅ Salvo';btn.disabled=true;
  renderNotes();updBadge();toast('📌 Nota salva!');
}
function saveFlash(btn){
  var f=btn.dataset.f||'?',v=btn.dataset.v||'?';
  var s=S.subjects[S.curIdx]||{};
  S.notes.unshift({id:Date.now(),title:'🃏 '+f,
    body:'<p><strong>Frente:</strong> '+esc(f)+'</p><p><strong>Verso:</strong> '+esc(v)+'</p>',
    sn:s.name||'—',sc:s.color||COLORS[0],flag:s.flag||'',
    date:new Date().toLocaleDateString('pt-BR')});
  btn.classList.add('saved');btn.textContent='✅ Salvo';btn.disabled=true;
  renderNotes();updBadge();toast('📌 Flashcard salvo!');
}
function delNote(id,e){
  e.stopPropagation();
  S.notes=S.notes.filter(function(n){return n.id!==id});
  renderNotes();updBadge();toast('Nota removida');
}
function filterNotes(f,btn){
  S.activeFilter=f;
  document.querySelectorAll('.nfbtn').forEach(function(b){b.classList.remove('on')});
  if(btn)btn.classList.add('on');
  renderNotesList(f);
}
function renderNotes(){
  renderFilterBar();
  renderNotesList(S.activeFilter);
  setText('ncnt',S.notes.length+(S.notes.length===1?' nota':' notas'));
}
function renderFilterBar(){
  var bar=el('nfilt');if(!bar)return;
  bar.innerHTML='';
  var subs=[...new Set(S.notes.map(function(n){return n.sn}))];
  var allBtn=document.createElement('button');
  allBtn.className='nfbtn'+(S.activeFilter==='all'?' on':'');
  allBtn.textContent='Todas';
  allBtn.addEventListener('click',function(){filterNotes('all',allBtn)});
  bar.appendChild(allBtn);
  subs.forEach(function(name){
    var b=document.createElement('button');
    b.className='nfbtn'+(S.activeFilter===name?' on':'');
    b.textContent=name;
    b.addEventListener('click',function(){filterNotes(name,b)});
    bar.appendChild(b);
  });
}
function renderNotesList(f){
  var list=el('nlist'),emp=el('nempty');
  if(!list)return;
  var filtered=f==='all'?S.notes:S.notes.filter(function(n){return n.sn===f});
  if(!filtered.length){list.innerHTML='';if(emp)emp.classList.add('on');return}
  if(emp)emp.classList.remove('on');
  list.innerHTML='';
  filtered.forEach(function(n){
    var card=document.createElement('div');
    card.className='ncard';
    card.style.setProperty('--nc',n.sc);
    card.innerHTML=
      '<div class="nchd">'+
        '<div class="ncttl">'+esc(n.title)+'</div>'+
        '<button class="ncdel" onclick="delNote('+n.id+',event)">🗑</button>'+
      '</div>'+
      '<div class="ncbody">'+n.body+'</div>'+
      '<div class="ncfoot">'+
        '<span class="nctag">'+esc(n.sn)+'</span>'+
        (n.flag?'<span class="nctag">'+esc(n.flag)+'</span>':'')+
        '<span class="ncdate">'+n.date+'</span>'+
      '</div>';
    list.appendChild(card);
  });
}
function updBadge(){
  var b=el('nbadge');if(!b)return;
  if(S.notes.length>0){b.classList.add('on');b.textContent=S.notes.length>9?'9+':S.notes.length}
  else b.classList.remove('on');
}

/* ═══ GOAL ═══════════════════════════════════════════════════════════ */
function gSlide(v){setText('gd-v',v);document.querySelectorAll('.gpbtn').forEach(function(b){b.classList.remove('on')})}
function setGP(v,btn){
  S.goalMin=v;
  var gr=el('gr');if(gr)gr.value=v;
  setText('gd-v',v);
  document.querySelectorAll('.gpbtn').forEach(function(b){b.classList.remove('on')});
  btn.classList.add('on');
}
function saveGoal(){
  var gr=el('gr');S.goalMin=gr?parseInt(gr.value):120;
  closeOv('ov-goal');renderGoal();toast('Meta: '+S.goalMin+' min/dia ✓');
}

/* ═══ RENDER ══════════════════════════════════════════════════════════ */
function renderGoal(){
  var pct=Math.min(100,Math.round(S.studiedMin/S.goalMin*100));
  setText('g-lbl','Meta diária ('+S.goalMin+' min)');
  setText('g-pct',pct+'% ✏️');
  var gf=el('g-fill');if(gf)gf.style.width=pct+'%';
  setText('g-streak',S.streak+' dias');
}
function renderStats(){
  setText('h-min',Math.round(S.studiedMin));
  setText('h-pomo',S.pomodoros);
  setText('h-done',S.sessions);
  ['sc-min','sc-pomo','sc-done'].forEach(function(id){
    var e=el(id);if(!e)return;
    e.classList.add('lit');setTimeout(function(){e.classList.remove('lit')},1200);
  });
}

/* ═══ OVERLAYS ════════════════════════════════════════════════════════ */
// openOv: generic — does NOT call openAddSheet
function openOv(id){var e=el(id);if(e)e.classList.add('on')}
function closeOv(id){var e=el(id);if(e)e.classList.remove('on')}

/* ═══ INIT ════════════════════════════════════════════════════════════ */
// Overlay backdrop close — run after DOM ready
(function initOverlays(){
  document.querySelectorAll('.ov').forEach(function(ov){
    ov.addEventListener('click',function(e){if(e.target===ov)closeOv(ov.id)});
    var sh=ov.querySelector('.sheet');
    if(sh)sh.addEventListener('click',function(e){e.stopPropagation()});
  });
})();

// Initial render
renderSubjects();
renderGoal();
renderNotes();
updSum();
renderStats();

// Show onboarding on first load
showOnb();
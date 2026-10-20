(function(){
  const START='2026-12-24', END='2027-01-04';
  const SKI=new Set(['2026-12-28','2026-12-29','2026-12-30']);
  const CITIES=['Beijing','Chongli','Beijing → Chongli','Chongli → Beijing','Day trip','Singapore → Hanoi','Hanoi → Beijing','Beijing → Hanoi','Hanoi → Singapore','Flying'];
  const DAYS=[];
  for(let d=new Date(START+'T00:00:00');;d.setDate(d.getDate()+1)){
    const iso=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    DAYS.push(iso); if(iso===END)break;
  }
  const fmt=iso=>new Date(iso+'T00:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
  const todayIso=(()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})();
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>'S$'+(Math.round(n*100)/100).toFixed(2);

  const S={rev:null,me:null,users:[],cnyPerSgd:5.4,days:{},tasks:[],expenses:[],settles:[],ideas:[],ideaCity:'All',filter:'open',tab:'todo',editing:new Set()};
  try{S.filter=localStorage.getItem('bwt-filter')||'open';S.tab=localStorage.getItem('bwt-tab')||'todo'}catch(e){}

  const people=()=>S.users;
  const nameOf=id=>(S.users.find(u=>u.id===id)||{}).name||'Someone';
  const myId=()=>S.me&&S.me.id;

  function toast(msg){const t=$('toast');t.textContent=msg;t.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>t.hidden=true,2400)}

  /* ---------- server calls ---------- */
  async function api(method,url,body){
    const r=await fetch(url,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
    let data={};try{data=await r.json()}catch(e){}
    if(r.status===401&&!url.startsWith('/api/login')&&!url.startsWith('/api/signup')){showAuth();throw new Error(data.error||'Please log in.')}
    if(!r.ok)throw new Error(data.error||'Something went wrong. Try again.');
    return data;
  }
  async function act(method,url,body,ok){
    try{await api(method,url,body);if(ok)toast(ok);await refresh(true)}catch(e){toast(e.message)}
  }
  async function refresh(force){
    const data=await api('GET','/api/state'+(!force&&S.rev!=null?'?rev='+S.rev:''));
    if(data.unchanged)return;
    S.rev=data.rev;S.me=data.me;S.users=data.users;S.cnyPerSgd=data.cnyPerSgd;S.days=data.days;
    S.tasks=data.tasks;S.expenses=data.expenses;S.settles=data.settlements;S.ideas=data.ideas;
    renderAll();
  }

  /* ---------- login ---------- */
  function showAuth(){$('app').hidden=true;$('auth').hidden=false;clearInterval(showApp.poll)}
  async function showApp(){
    $('auth').hidden=true;$('app').hidden=false;setTab(S.tab);
    clearInterval(showApp.poll);
    showApp.poll=setInterval(()=>{if(!document.hidden)refresh().catch(()=>{})},4000);
  }
  document.querySelectorAll('[data-show]').forEach(b=>b.onclick=()=>{
    const su=b.dataset.show==='signup';$('signupForm').hidden=!su;$('loginForm').hidden=su;
    (su?$('suName'):$('loginEmail')).focus()});
  $('loginForm').onsubmit=async e=>{e.preventDefault();$('loginErr').textContent='';
    try{await api('POST','/api/login',{email:$('loginEmail').value,password:$('loginPass').value});$('loginPass').value='';await refresh(true);showApp()}
    catch(err){$('loginErr').textContent=err.message}};
  $('signupForm').onsubmit=async e=>{e.preventDefault();$('signupErr').textContent='';
    try{await api('POST','/api/signup',{name:$('suName').value,email:$('suEmail').value,password:$('suPass').value,code:$('suCode').value});$('suPass').value='';await refresh(true);showApp();toast('Welcome, '+S.me.name)}
    catch(err){$('signupErr').textContent=err.message}};
  $('logoutBtn').onclick=async()=>{try{await api('POST','/api/logout',{})}catch(e){}S.rev=null;showAuth();$('loginForm').hidden=false;$('signupForm').hidden=true};

  // two-tap delete
  function confirmTap(btn,fn){
    if(btn.dataset.armed){fn();return}
    btn.dataset.armed='1';const old=btn.textContent;btn.textContent='Sure?';
    setTimeout(()=>{delete btn.dataset.armed;btn.textContent=old},3000);
  }

  /* ---------- header ---------- */
  function renderHeader(){
    const days=Math.round((new Date(START+'T00:00:00')-new Date(todayIso+'T00:00:00'))/864e5);
    let txt;
    if(days>0)txt=days+' day'+(days===1?'':'s')+' to go';
    else{const i=DAYS.indexOf(todayIso);txt=i>=0?'Day '+(i+1)+' of '+DAYS.length:'Trip complete'}
    $('countdown').textContent=txt;
    $('whoami').textContent=S.me?S.me.name:'';
  }

  /* ---------- tabs ---------- */
  function setTab(t){S.tab=t;try{localStorage.setItem('bwt-tab',t)}catch(e){}
    ['todo','money','days'].forEach(k=>{$('p-'+k).hidden=k!==t;$('t-'+k).setAttribute('aria-selected',k===t)})}
  ['todo','money','days'].forEach(k=>$('t-'+k).onclick=()=>setTab(k));

  /* ---------- selects ---------- */
  function fillSelects(){
    const ppl=people();
    const keep=(sel,html)=>{const v=sel.value;sel.innerHTML=html;if([...sel.options].some(o=>o.value===v))sel.value=v};
    keep($('taskWho'),'<option value="anyone">Anyone</option><option value="everyone">Each of us</option>'+ppl.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join(''));
    keep($('taskDue'),'<option value="">Before we fly</option>'+DAYS.map(d=>`<option value="${d}">${fmt(d)}${SKI.has(d)?' · ski':''}</option>`).join(''));
    keep($('expPaid'),ppl.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join(''));
    if(!fillSelects.paidSet&&myId()){$('expPaid').value=myId();fillSelects.paidSet=true}
    keep($('expDate'),'<option value="">Before the trip</option>'+DAYS.map(d=>`<option value="${d}">${fmt(d)}</option>`).join(''));
    if(!fillSelects.dateSet&&DAYS.includes(todayIso)){$('expDate').value=todayIso;fillSelects.dateSet=true}
    const box=$('expSplit');
    const known=new Set([...box.querySelectorAll('input')].map(i=>i.value));
    const checked=new Set([...box.querySelectorAll('input')].filter(i=>i.checked).map(i=>i.value));
    box.innerHTML=ppl.map(t=>`<label><input type="checkbox" value="${esc(t.id)}" id="split-${esc(t.id)}" ${!known.has(t.id)||checked.has(t.id)?'checked':''}>${esc(t.name)}</label>`).join('');
    const r=$('rate');if(document.activeElement!==r)r.value=S.cnyPerSgd;
  }

  /* ---------- tasks ---------- */
  const isDone=t=>t.who==='everyone'?(people().length>0&&people().every(p=>t.done_for&&t.done_for[p.id])):!!t.done;
  const isMine=t=>{const m=myId();if(!m)return false;
    if(t.who==='everyone')return !(t.done_for&&t.done_for[m]);return t.who===m&&!t.done};
  function renderTasks(){
    const all=S.tasks;
    $('sOpen').textContent=all.filter(t=>!isDone(t)).length;
    $('sMine').textContent=all.filter(isMine).length;
    $('sDone').textContent=all.filter(isDone).length;
    document.querySelectorAll('#filters .chip').forEach(c=>c.setAttribute('aria-pressed',c.dataset.f===S.filter));
    const list=all.filter(t=>S.filter==='all'?true:S.filter==='done'?isDone(t):S.filter==='mine'?isMine(t):!isDone(t));
    const box=$('taskList');
    if(!list.length){box.innerHTML='<div class="empty">'+(all.length?'Nothing here. Nice.':'No to-dos yet. Add the first one above.')+'</div>';return}
    const groups=new Map();
    ['',...DAYS].forEach(d=>groups.set(d,[]));
    list.forEach(t=>{const k=groups.has(t.due||'')?(t.due||''):'';groups.get(k).push(t)});
    let html='';
    for(const [d,items] of groups){
      if(!items.length)continue;
      items.sort((a,b)=>(isDone(a)-isDone(b))||((a.created_at||0)-(b.created_at||0)));
      html+=`<div class="group"><div class="group-head"><h3>${d?fmt(d):'Before we fly'}</h3>${SKI.has(d)?'<span class="ski">Ski day · Chongli</span>':''}</div>`;
      html+=items.map(taskHtml).join('')+'</div>';
    }
    box.innerHTML=html;
    box.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>{const t=S.tasks.find(x=>x.id===b.dataset.toggle);
      act('PATCH','/api/tasks/'+t.id,{done:!t.done})});
    box.querySelectorAll('[data-each]').forEach(b=>b.onclick=()=>{const [tid,pid]=b.dataset.each.split('|');const t=S.tasks.find(x=>x.id===tid);
      act('PATCH','/api/tasks/'+tid,{doneFor:{[pid]:!(t.done_for&&t.done_for[pid])}})});
    box.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>confirmTap(b,()=>act('DELETE','/api/tasks/'+b.dataset.del,null,'Deleted')));
    box.querySelectorAll('[data-assign]').forEach(s=>s.onchange=()=>act('PATCH','/api/tasks/'+s.dataset.assign,{who:s.value}));
  }
  function taskHtml(t){
    const done=isDone(t);const ppl=people();
    let box;
    if(t.who==='everyone'){
      const n=ppl.filter(p=>t.done_for&&t.done_for[p.id]).length,tot=ppl.length,C=2*Math.PI*11,frac=tot?n/tot:0;
      box=`<span class="ring" title="${n} of ${tot} done" aria-label="${n} of ${tot} done"><svg viewBox="0 0 26 26"><circle cx="13" cy="13" r="11" fill="none" stroke="var(--line-strong)" stroke-width="2.5"/><circle cx="13" cy="13" r="11" fill="none" stroke="var(--ok)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${(C*frac).toFixed(2)} ${C.toFixed(2)}"/></svg><b>${done?'✓':n}</b></span>`;
    }else box=`<button class="box" type="button" data-toggle="${esc(t.id)}" aria-label="${done?'Mark not done':'Mark done'}" aria-pressed="${done}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
    const whoOpts='<option value="anyone">Anyone</option><option value="everyone">Each of us</option>'+ppl.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
    const sel=`<select data-assign="${esc(t.id)}" id="as-${esc(t.id)}" aria-label="Assign" style="padding:2px 6px;font-size:12px">${whoOpts.replace(`value="${esc(t.who)}"`,`value="${esc(t.who)}" selected`)}</select>`;
    let sub=`<span class="tag ${esc(t.tag)}">${esc(t.tag||'Plan')}</span>${sel}`;
    if(t.note)sub+=`<span>${esc(t.note)}</span>`;
    if(t.who!=='everyone'&&t.done&&t.done_by)sub+=`<span>done by ${esc(nameOf(t.done_by))}</span>`;
    let each='';
    if(t.who==='everyone'&&ppl.length)each='<div class="chips">'+ppl.map(p=>{const y=t.done_for&&t.done_for[p.id];
      return `<button type="button" class="who-chip ${y?'yes':''}" data-each="${esc(t.id)}|${esc(p.id)}" aria-pressed="${!!y}">${y?'✓ ':''}${esc(p.name)}</button>`}).join('')+'</div>';
    return `<div class="task ${done?'done':''}">${box}<div class="t-body"><div class="t-title">${esc(t.title)}</div><div class="t-sub">${sub}</div>${each}</div><button class="ghost" type="button" data-del="${esc(t.id)}">Delete</button></div>`;
  }
  document.querySelectorAll('#filters .chip').forEach(c=>c.onclick=()=>{S.filter=c.dataset.f;try{localStorage.setItem('bwt-filter',S.filter)}catch(e){}renderTasks()});
  $('taskForm').onsubmit=async e=>{e.preventDefault();const title=$('taskTitle').value.trim();if(!title)return;
    await act('POST','/api/tasks',{title,who:$('taskWho').value,due:$('taskDue').value,tag:$('taskTag').value},'Added');$('taskTitle').value=''};

  /* ---------- money ---------- */
  const toSgd=(amt,cur)=>cur==='SGD'?amt:amt/(S.cnyPerSgd||5.4);
  function balances(){
    const net={};people().forEach(p=>net[p.id]=0);
    S.expenses.forEach(x=>{const v=toSgd(+x.amount||0,x.cur);const sp=(x.split||[]).filter(id=>id in net);
      if(x.paid_by in net)net[x.paid_by]+=v;sp.forEach(id=>net[id]-=v/sp.length)});
    S.settles.forEach(s=>{if(s.from_id in net)net[s.from_id]+=+s.sgd||0;if(s.to_id in net)net[s.to_id]-=+s.sgd||0});
    return net;
  }
  function transfers(net){
    const cr=[],db=[];Object.entries(net).forEach(([id,v])=>{if(v>0.005)cr.push([id,v]);else if(v<-0.005)db.push([id,-v])});
    cr.sort((a,b)=>b[1]-a[1]);db.sort((a,b)=>b[1]-a[1]);const out=[];let i=0,j=0;
    while(i<db.length&&j<cr.length){const m=Math.min(db[i][1],cr[j][1]);out.push({from:db[i][0],to:cr[j][0],sgd:Math.round(m*100)/100});
      db[i][1]-=m;cr[j][1]-=m;if(db[i][1]<0.005)i++;if(cr[j][1]<0.005)j++}
    return out.filter(t=>t.sgd>=0.01);
  }
  function renderMoney(){
    const net=balances(),rate=S.cnyPerSgd||5.4,tr=transfers(net),sl=$('settleList');
    if(people().length<2)sl.innerHTML='<div class="empty">Once your friends sign up, costs split between you here.</div>';
    else if(!tr.length)sl.innerHTML='<div class="empty">All square. Nobody owes anyone.</div>';
    else{sl.innerHTML=tr.map((t,k)=>`<div class="settle"><span><b>${esc(nameOf(t.from))}</b> pays <b>${esc(nameOf(t.to))}</b> <span class="num">${money(t.sgd)}</span> <span class="small num">(¥${(t.sgd*rate).toFixed(0)})</span></span><button type="button" data-settle="${k}">Mark paid</button></div>`).join('');
      sl.querySelectorAll('[data-settle]').forEach(b=>b.onclick=()=>{const t=tr[+b.dataset.settle];act('POST','/api/settlements',t,'Marked as paid')})}
    $('balList').innerHTML=people().map(p=>{const v=net[p.id]||0;
      return `<span>${esc(p.name)}</span><span class="amt num ${v>0.005?'pos':v<-0.005?'neg':''}">${v>0.005?'gets back ':v<-0.005?'owes ':''}${money(Math.abs(v))}</span>`}).join('');
    const items=[...S.expenses.map(x=>({k:'e',x,at:x.created_at||0})),...S.settles.map(x=>({k:'s',x,at:x.created_at||0}))].sort((a,b)=>b.at-a.at);
    const el=$('expList');
    if(!items.length){el.innerHTML='<div class="empty">No spends yet. Add the first one, like the Chongli hotel.</div>';return}
    el.innerHTML=items.map(({k,x})=>{
      if(k==='s')return `<div class="exp"><div><div class="t-title">${esc(nameOf(x.from_id))} paid ${esc(nameOf(x.to_id))} back</div><div class="t-sub"><span class="tag">Settled</span></div></div><span class="num">${money(+x.sgd)}</span><button class="ghost" type="button" data-dels="${esc(x.id)}">Undo</button></div>`;
      const sym=x.cur==='SGD'?'S$':'¥',sp=(x.split||[]).map(nameOf);
      return `<div class="exp"><div style="min-width:0"><div class="t-title">${esc(x.title)}</div><div class="t-sub"><span>${esc(nameOf(x.paid_by))} paid</span><span>· split ${sp.length===people().length?'between all':esc(sp.join(', '))}</span>${x.date?'<span>· '+fmt(x.date)+'</span>':''}</div></div><span class="num" style="text-align:right">${sym}${(+x.amount).toFixed(2)}${x.cur!=='SGD'?`<br><span class="small">${money(toSgd(+x.amount,x.cur))}</span>`:''}</span><button class="ghost" type="button" data-dele="${esc(x.id)}">Delete</button></div>`}).join('');
    el.querySelectorAll('[data-dele]').forEach(b=>b.onclick=()=>confirmTap(b,()=>act('DELETE','/api/expenses/'+b.dataset.dele,null,'Deleted')));
    el.querySelectorAll('[data-dels]').forEach(b=>b.onclick=()=>confirmTap(b,()=>act('DELETE','/api/settlements/'+b.dataset.dels,null,'Undone')));
  }
  $('expForm').onsubmit=async e=>{e.preventDefault();
    const title=$('expTitle').value.trim(),amount=parseFloat($('expAmt').value),paidBy=$('expPaid').value;
    const split=[...$('expSplit').querySelectorAll('input:checked')].map(i=>i.value);
    if(!title||!(amount>0))return;if(!split.length){toast('Pick at least one person to split with.');return}
    await act('POST','/api/expenses',{title,amount,cur:$('expCur').value,paidBy,split,date:$('expDate').value},'Spend added');
    $('expTitle').value='';$('expAmt').value=''};
  $('rate').onchange=()=>{const v=parseFloat($('rate').value);if(v>0)act('PUT','/api/settings',{cnyPerSgd:v},'Rate updated')};

  /* ---------- days ---------- */
  const cityKey=c=>{const last=String(c||'').split('→').pop().trim();
    return /chongli/i.test(last)?'cl':/hanoi|singapore/i.test(last)?'hn':/day trip/i.test(last)?'trip':'bj'};
  const cityVars=c=>{const k=cityKey(c);return `--c:var(--c-${k});--tint:var(--c-${k}-t)`};
  function planHtml(text){
    return String(text||'').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{
      let m=l.match(/^(Flight|[A-Z]{2}\d{2,4}):\s*(.+?)\s+(~?\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*→\s*(.+?)\s+(~?\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\.?$/i);
      if(m)return `<div class="flight"><span class="fno">${/^flight$/i.test(m[1])?'✈ Flight':esc(m[1])}</span><span class="fr">${esc(m[2])} → ${esc(m[4])}</span><span class="ft">${esc(m[3])} → ${esc(m[5])}</span></div>`;
      m=l.match(/^(Morning|Afternoon|Evening|Night|Early|Late morning|Dinner|Lunch|Optional|Backup plan|Last big dinner|Afternoon or evening|Evening, if you have energy)\s*:\s*(.+)$/i);
      if(m)return `<div class="slot"><span class="sl">${esc(m[1].replace(/, if you have energy/i,''))}</span><span>${esc(m[2])}</span></div>`;
      return `<div class="slot plain"><span>${esc(l)}</span></div>`}).join('');
  }
  const PIN='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 15s5-4.6 5-8.5A5 5 0 0 0 3 6.5C3 10.4 8 15 8 15z" fill="currentColor"/><circle cx="8" cy="6.5" r="1.8" fill="var(--surface)"/></svg>';
  const mapUrl=q=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q);
  function foodHtml(p){
    const lines=String(p.food||'').split('\n').map(l=>l.trim()).filter(Boolean);
    if(!lines.length)return '';
    const near=String(p.area||'').split(',').pop().trim();
    return '<div class="eat"><div class="eat-h">Eat nearby</div>'+lines.map(l=>{
      const [name,...rest]=l.split(/\s+[—–-]\s+/);const note=rest.join(' — ');
      return `<div class="food"><a href="${mapUrl(name+(near?', '+near:''))}" target="_blank" rel="noopener">${esc(name)}</a>${note?`<span>${esc(note)}</span>`:''}</div>`}).join('')+'</div>';
  }
  function renderRoute(){
    const r=$('route');r.style.setProperty('--n',DAYS.length);
    r.innerHTML=`<div class="route-bar">${DAYS.map(d=>`<span style="${cityVars((S.days[d]||{}).city)}" title="${esc(fmt(d))} · ${esc((S.days[d]||{}).city||'')}"></span>`).join('')}</div>
      <div class="route-ticks">${DAYS.map(d=>`<span>${new Date(d+'T00:00:00').getDate()}</span>`).join('')}</div>
      <div class="legend"><span style="--c:var(--c-hn)"><i></i>Hanoi stopover</span><span style="--c:var(--c-bj)"><i></i>Beijing</span><span style="--c:var(--c-trip)"><i></i>Great Wall trip</span><span style="--c:var(--c-cl)"><i></i>Chongli ski</span></div>`;
  }
  function renderDays(){
    renderRoute();
    $('dayList').innerHTML=DAYS.map(d=>{
      const dt=new Date(d+'T00:00:00'),p=S.days[d]||{};
      const ts=S.tasks.filter(t=>t.due===d);
      const spend=S.expenses.filter(x=>x.date===d).reduce((a,x)=>a+toSgd(+x.amount||0,x.cur),0);
      const city=p.city||'',ed=S.editing.has(d);
      const chips=ts.map(t=>`<span class="dchip ${isDone(t)?'ok':''}">${isDone(t)?'✓ ':''}${esc(t.title)}</span>`).join('')+(spend?`<span class="dchip num">Spent ${money(spend)}</span>`:'');
      return `<article class="daycard" style="${cityVars(city)}">
        <div class="datecol ${d===todayIso?'today':''}"><span class="dow">${dt.toLocaleDateString('en-GB',{weekday:'short'})}</span><span class="dn">${dt.getDate()}</span><span class="mo">${dt.toLocaleDateString('en-GB',{month:'short'})}</span></div>
        <div class="dcard">
          <div class="dhead"><span class="citypill">${esc(city||'Plan this day')}${SKI.has(d)?' · ski day':''}</span><button class="ghost" type="button" data-edit="${d}">${ed?'Done':'Edit'}</button></div>
          <h3 class="dtitle">${esc(p.headline||'Nothing planned yet')}</h3>
          ${p.area?`<a class="pin" href="${mapUrl(p.area)}" target="_blank" rel="noopener" title="Open in Google Maps">${PIN}<span>${esc(p.area)}</span></a>`:''}
          <div class="dbody">${planHtml(p.plan)||'<div class="slot plain"><span>Tap Edit to add a plan.</span></div>'}</div>
          ${foodHtml(p)}
          ${chips?`<div class="dfoot">${chips}</div>`:''}
          ${ed?`<div class="dedit">
            <div class="row"><select data-city="${d}" id="city-${d}" aria-label="City for ${fmt(d)}">${CITIES.map(c=>`<option ${c===city?'selected':''}>${esc(c)}</option>`).join('')}${city&&!CITIES.includes(city)?`<option selected>${esc(city)}</option>`:''}</select>
            <input type="text" data-note="${d}" id="note-${d}" value="${esc(p.headline||'')}" placeholder="Headline for the day" maxlength="120" aria-label="Headline for ${fmt(d)}"></div>
            <textarea data-plan="${d}" id="plan-${d}" rows="${Math.min(8,Math.max(3,(p.plan||'').split('\n').length+1))}" placeholder="One line each, e.g. Morning: Forbidden City" maxlength="1200" aria-label="Plan for ${fmt(d)}">${esc(p.plan||'')}</textarea>
            <input type="text" data-area="${d}" id="area-${d}" value="${esc(p.area||'')}" placeholder="Map pin, e.g. Qianmen, Beijing" maxlength="120" aria-label="Map pin for ${fmt(d)}">
            <textarea data-food="${d}" id="food-${d}" rows="3" placeholder="Food nearby, one per line: Name — what to order" maxlength="1200" aria-label="Food nearby for ${fmt(d)}">${esc(p.food||'')}</textarea>
            <span class="small">Start a line with “Morning:”, “Afternoon:” or “Evening:” to label it. A line like “Flight: Hanoi ~10 am → Beijing ~2:30 pm” shows as a flight.</span>
          </div>`:''}
        </div></article>`}).join('');
    const box=$('dayList');
    box.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{const d=b.dataset.edit;S.editing.has(d)?S.editing.delete(d):S.editing.add(d);renderDays()});
    box.querySelectorAll('[data-note]').forEach(i=>i.onchange=()=>act('PUT','/api/days/'+i.dataset.note,{headline:i.value},'Saved'));
    box.querySelectorAll('[data-city]').forEach(s=>s.onchange=()=>act('PUT','/api/days/'+s.dataset.city,{city:s.value},'Saved'));
    box.querySelectorAll('[data-plan]').forEach(t=>t.onchange=()=>act('PUT','/api/days/'+t.dataset.plan,{plan:t.value},'Saved'));
    box.querySelectorAll('[data-area]').forEach(i=>i.onchange=()=>act('PUT','/api/days/'+i.dataset.area,{area:i.value},'Saved'));
    box.querySelectorAll('[data-food]').forEach(t=>t.onchange=()=>act('PUT','/api/days/'+t.dataset.food,{food:t.value},'Saved'));
  }
  function renderIdeas(){
    const f=S.ideaCity;
    document.querySelectorAll('#ideaFilters .chip').forEach(c=>c.setAttribute('aria-pressed',c.dataset.c===f));
    const list=S.ideas.filter(i=>f==='All'||i.city===f);
    const box=$('ideaList');
    if(!list.length){box.innerHTML='<div class="empty">No ideas yet. Add places you want to try below.</div>';return}
    const dayOpts='<option value="">Add to a day…</option>'+DAYS.map(d=>`<option value="${d}">${fmt(d)}</option>`).join('');
    box.innerHTML=list.map(i=>`<div class="idea"><div style="min-width:0"><div class="t-title">${esc(i.title)}</div>
        <div class="t-sub"><span class="tag ${i.city==='Chongli'?'Ski':''}">${esc(i.city||'')}</span>${i.when_text?`<span>${esc(i.when_text)}</span>`:''}</div>
        ${i.note?`<div class="small" style="margin-top:4px">${esc(i.note)}</div>`:''}
        ${/^https?:\/\//.test(i.link||'')?`<a class="small" href="${esc(i.link)}" target="_blank" rel="noopener">More info ↗</a>`:''}</div>
        <div class="idea-act"><select data-todo="${esc(i.id)}" id="idea-${esc(i.id)}" aria-label="Add as to-do on a day" style="padding:3px 6px;font-size:12px">${dayOpts}</select>
        <button class="ghost" type="button" data-delidea="${esc(i.id)}">Delete</button></div></div>`).join('');
    box.querySelectorAll('[data-todo]').forEach(s=>s.onchange=()=>{const i=S.ideas.find(x=>x.id===s.dataset.todo),d=s.value;if(!d)return;
      act('POST','/api/tasks',{title:i.title,who:'anyone',due:d,tag:'Plan'},'Added to '+fmt(d))});
    box.querySelectorAll('[data-delidea]').forEach(b=>b.onclick=()=>confirmTap(b,()=>act('DELETE','/api/ideas/'+b.dataset.delidea,null,'Deleted')));
  }
  document.querySelectorAll('#ideaFilters .chip').forEach(c=>c.onclick=()=>{S.ideaCity=c.dataset.c;renderIdeas()});
  $('ideaForm').onsubmit=async e=>{e.preventDefault();const title=$('ideaTitle').value.trim();if(!title)return;
    await act('POST','/api/ideas',{title,city:$('ideaCity').value},'Idea added');$('ideaTitle').value=''};

  function renderAll(){
    renderHeader();fillSelects();renderTasks();renderMoney();
    const ae=document.activeElement;
    if(!ae||!ae.dataset||!(ae.dataset.note||ae.dataset.plan||ae.dataset.city||ae.dataset.area||ae.dataset.food))renderDays();
    renderIdeas();
  }

  /* ---------- boot ---------- */
  refresh(true).then(showApp).catch(()=>showAuth());
})();

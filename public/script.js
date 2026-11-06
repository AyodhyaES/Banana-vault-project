// Banana Mystery Vault - game logic (pages, puzzles, timer, sound, login, MongoDB sync)
const IMG2={land:"images/land.jpg",login:"images/login.jpg",reg:"images/reg.jpg",logo:"images/logo.jpg",crest:"images/crest.jpg"};
const IMG4="images/coins.png";
const IMG={m:"images/mascot.png",l:["images/level1.jpg","images/level2.jpg","images/level3.jpg"]};
const $=id=>document.getElementById(id),R=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const esc=s=>String(s).replace(/[<>&"]/g,'');
let DB={users:{},cur:null};
try{DB=JSON.parse(localStorage.getItem('bmv2'))||DB}catch(e){}
const save=()=>{try{localStorage.setItem('bmv2',JSON.stringify(DB))}catch(e){}syncUp()};
const U=()=>DB.users[DB.cur];
const go=h=>{location.hash=h};
const LV=[{n:1,name:'The Beginner’s Vault',total:1,per:1,key:'🗝️ Bronze Key'},{n:2,name:'The Hidden Treasure Vault',total:2,per:1,key:'🔑 Silver Key'},{n:3,name:'The Golden Treasure Vault',total:3,per:1,key:'👑 Golden Key'}];
const SEED=[['JungleJoe',4200,3],['BananaQueen',3650,3],['VaultHunter',2900,2],['Mia_K',2100,2],['Nimal',1300,1],['Tharushi',800,1]];
let S={tab:'login',otp:null,pend:null,msg:'',lvl:null,screen:'play',solved:0,pin:[],p:null,phase:'puzzle',reward:'',hintTxt:''};

const chest=(o,s=84)=>`<svg width="${s}" height="${s}" viewBox="0 0 100 100"><rect x="10" y="44" width="80" height="44" rx="6" fill="#8a5a1c" stroke="#3b2407" stroke-width="3"/>${o?'<path d="M10 44 L20 14 L80 14 L90 44Z" fill="#a8742a" stroke="#3b2407" stroke-width="3"/><circle cx="50" cy="30" r="12" fill="#ffd34d"/>':'<path d="M10 44 Q50 6 90 44Z" fill="#a8742a" stroke="#3b2407" stroke-width="3"/>'}<rect x="10" y="50" width="80" height="8" fill="#f5c542"/><rect x="43" y="46" width="14" height="20" rx="3" fill="#ffe27a" stroke="#3b2407" stroke-width="2"/></svg>`;

function makePuzzle(n){const m=4+n*4,a=R(2,m),b=R(a+1,m+3),t=R(0,2);
 if(t==0)return{q:`🍌 + 🍌 + 🍌 = ${3*b}<br>🍌 = ?`,ans:b};
 if(t==1)return{q:`🍎 = ${a}<br>🍌 + 🍎 = ${a+b}<br>🍌 × 🍎 = ?`,ans:a*b};
 return{q:`🍌 + 🍎 = ${a+b}<br>🍌 − 🍎 = ${b-a}<br>🍌 × 🍎 = ?`,ans:a*b};}
function toast(t,c){S.msg=`<span class="${c||''}">${t}</span>`;const e=$('msg');if(e)e.innerHTML=S.msg}

/* ---- auth ---- */
function logout(){DB.cur=null;save();go('home');render();}

/* ---- game ---- */
function startLevel(n){const u=U();u.lives=3;S.lvl=LV[n-1];S.solved=0;S.hintTxt='';S.msg='';
 S.pin=[R(1,9),R(0,9),R(0,9)];S.p=makePuzzle(n);S.phase='puzzle';S.screen='play';save();go('play');render();}
function submit(){const v=$('ans').value.trim();if(v==='')return;const u=U();
 if(Number(v)===S.p.ans){u.coins+=10;u.score+=100*S.lvl.n;S.solved++;S.hintTxt='';
  S.msg=`<span class="good">Correct! +10 <i class=co></i>${S.solved%S.lvl.per==0?' — a PIN digit is revealed!':''}</span>`;S.phase='chest';save();render();}
 else{u.lives--;save();if(u.lives<=0){S.screen='over';return render()}S.msg='<span class="bad">Wrong answer — you lost a life.</span>';render();}}
function pickChest(i){const u=U(),r=R(0,3);
 if(r==0){u.coins+=15;S.reward='<i class=co></i> +15 coins'}else if(r==1){u.score+=50;S.reward='⭐ +50 bonus points'}
 else if(r==2){u.lives=Math.min(5,u.lives+1);S.reward='❤️ +1 extra life'}else{u.hints++;S.reward='💡 +1 free hint'}
 S.phase='opened';S.open=i;save();render();}
function next(){S.reward='';S.msg='';
 if(S.solved>=S.lvl.total)S.screen='vault';else{S.p=makePuzzle(S.lvl.n);S.phase='puzzle'}render();}
function hint(){const u=U();
 if(u.hints>0)u.hints--;else if(u.coins>=5)u.coins-=5;else return toast('Not enough coins (5 <i class=co></i>).','bad');
 const a=S.p.ans;S.hintTxt=`💡 The answer is ${a%2?'odd':'even'} and between ${Math.max(0,a-R(2,4))} and ${a+R(2,4)}.`;save();render();}
function buyLife(){const u=U();if(u.coins<20)return toast('Extra life costs 20 <i class=co></i>.','bad');if(u.lives>=5)return toast('Maximum 5 lives.','bad');u.coins-=20;u.lives++;save();render();}
function tryPin(){const v=$('pinin').value.trim(),u=U();
 if(v===S.pin.join('')){const n=S.lvl.n;if(!u.done.includes(n))u.done.push(n);u.score+=300*n;
  if(n<3){if(!u.keys.includes(S.lvl.key))u.keys.push(S.lvl.key);u.unlocked=Math.max(u.unlocked,n+1)}
  save();S.screen=n<3?'unlock':'win';render();}
 else{u.lives--;save();if(u.lives<=0){S.screen='over';return render()}toast('Wrong PIN — you lost a life. Check your digits!','bad');render();}}

/* ---- data ---- */

/* ---- views ---- */
const stats=()=>{const u=U();return`<div class="bar"><span class="pill"><i class=co></i> ${u.coins}</span><span class="pill">${'❤️'.repeat(u.lives)||'💔'}</span><span class="pill">⭐ ${u.score}</span><span class="pill">💡 ${u.hints}</span></div>`};
const lvCard=(l,c)=>{const u=c&&U(),lock=c&&l.n>u.unlocked,dn=c&&u.done.includes(l.n);
 return`<div class="lvc ${lock?'locked':''}"><div class="im" style="background-image:url(${IMG.l[l.n-1]})"></div><div class="bd"><h3>Level ${l.n}${dn?' ✅':''}</h3><b>${l.name}</b><br><small>${l.total} puzzles · ${l.per==1?'each answer':'every '+l.per+' answers'} reveals a digit</small>${c?`<div class="row"><button ${lock?'disabled':''} onclick="startLevel(${l.n})">${lock?'🔒 Locked':dn?'Replay':'Play'}</button></div>`:''}</div></div>`};
const pages={
home:c=>`<section class="hero"><div class="ht"><small>★ PUZZLE ADVENTURE ★</small><h1>Banana Mystery Vault</h1><p>Solve banana puzzles, reveal secret PIN digits and crack three legendary vaults to claim the final treasure.</p><div class="row"><button onclick="go('${c?'dashboard':'register'}')">${c?'Open Dashboard':'Start Adventure'}</button><button class="ghost" onclick="go('leaderboard')">🏆 Leaderboard</button></div></div></section>
<h2>Three Vaults to Crack</h2><div class="grid">${LV.map(l=>lvCard(l,0)).join('')}</div>
<h2>How it works</h2><div class="grid"><div class="card"><h3>🧮 Solve</h3>Crack banana equations to earn coins and reveal PIN digits.</div><div class="card"><h3>🎁 Collect</h3>Open treasure boxes for coins, lives, hints and bonus points.</div><div class="card"><h3>🗝️ Unlock</h3>Enter the PIN, win the key and open the next vault.</div></div>`,
dashboard:c=>{const u=U(),b=board(),rk=b.findIndex(x=>x.me)+1;
 return`<div class="card idc"><div>${avatar(u.avatar,84)}</div><div style="flex:1;min-width:200px"><small>EXPLORER ID CARD</small><h2>${u.name}</h2><div class="idno">${u.explorerId||'—'}</div><small>${rk?`Rank #${rk} of ${b.length}`:'Rank loading…'} · ${u.done.length}/3 vaults cleared${u.joined?` · Joined ${new Date(u.joined).toLocaleDateString()}`:''}</small><div class="badges">${badges(u).map(x=>`<span class="pill">${x}</span>`).join('')||'<small>No badges yet. Clear a vault to earn one.</small>'}</div><div class="prog" style="margin-top:10px"><div style="width:${u.done.length/3*100}%"></div></div></div></div>
 <div class="grid">${[['<i class=co></i>',u.coins,'Coins'],['❤️',u.lives,'Lives'],['⭐',u.score,'Score'],['💡',u.hints,'Hints']].map(s=>`<div class="card stat">${s[0]}<b>${s[1]}</b><small>${s[2]}</small></div>`).join('')}</div>
 <h2>Your Vaults</h2><div class="grid">${LV.map(l=>lvCard(l,1)).join('')}</div>
 <h2>Collected Keys</h2><div class="card">${u.keys.length?u.keys.map(k=>`<span class="pill">${k}</span> `).join(''):'<small>No keys yet — crack Level 1 to earn your first.</small>'}${u.done.includes(3)?' <span class="pill">🏆 Final Treasure</span>':''}</div>`},
about:()=>`<div class="card wel"><img src="${IMG.m}" alt=""><div><h1 style="font-size:2rem">About the Game</h1><p>Banana Mystery Vault is an interactive puzzle adventure. Explore a mysterious vault, solve banana puzzles to reveal PIN digits, collect coins, keys and special rewards, and protect your three lives on the way to the final treasure.</p></div></div>
<div class="grid"><div class="card"><h3><i class=co></i> Coins</h3>Earned for every correct answer. Spend them on hints or extra lives.</div><div class="card"><h3>🗝️ Keys</h3>Crack a vault to win the key that unlocks the next level.</div><div class="card"><h3>🎁 Treasure boxes</h3>Hide bonus points, extra lives or free hints.</div><div class="card"><h3>❤️ Lives</h3>You start with three. A wrong answer or wrong PIN costs one.</div></div>`,
levels:c=>`<h1 style="font-size:2.2rem">Levels</h1><div class="grid">${LV.map(l=>lvCard(l,c?1:0)).join('')}</div><h2 style="margin-top:24px">Story vault boxes</h2><div class="grid">${STORY.map((s,i)=>{const o=c&&U().done.includes(i+1);return`<div class="card center">${chest(o,70)}<h3>${s.box}</h3><small>${o?s.story:'Win Level '+(i+1)+' to open this box and read its story.'}</small><div style="margin-top:8px"><b>${s.item}</b><br>${s.bt}</div></div>`}).join('')}</div><div class="card"><h3>Level rules</h3><table><tr><th>Level</th><th>Puzzles</th><th>Digit every</th><th>Reward</th></tr>${LV.map(l=>`<tr><td>${l.n}</td><td>${l.total}</td><td>${l.per} correct</td><td>${l.n<3?l.key:'🏆 Final treasure'}</td></tr>`).join('')}</table>${c?'':`<div class="row"><button onclick="go('register')">Register to play</button></div>`}</div>`,
leaderboard:()=>{const b=board();return`<h1 style="font-size:2.2rem">🏆 Leaderboard</h1><div class="card"><table><tr><th>#</th><th>Player</th><th>Vaults</th><th>Score</th></tr>${b.map((x,i)=>`<tr class="${x.me?'me':''}"><td>${['🥇','🥈','🥉'][i]||i+1}</td><td><span style="display:inline-flex;align-items:center;gap:8px">${avatar(x.a,28)}<span>${x.n}${x.me?' (you)':''}<br><small>${x.id||''}</small></span></span></td><td>${x.d}/3</td><td>${x.s}</td></tr>`).join('')}</table><small>${S.api?'Live scores from the MongoDB database.':'Sample explorers are shown beside accounts created on this device.'}</small></div>`},
play:()=>{const l=S.lvl,u=U(),rev=Math.floor(S.solved/l.per),bn=`<div class="banner" style="background-image:linear-gradient(#0000,#0d0a14f0),url(${IMG.l[l.n-1]})"><h3>Level ${l.n} — ${l.name}</h3></div>`;
 const back=`<div class="row c"><button class="ghost" onclick="go('dashboard')">Back to dashboard</button></div>`;
 if(S.screen=='over')return`<div class="card center"><h1>💔 Game Over</h1><p>You ran out of lives. The vault stays sealed…</p><div class="row c"><button onclick="startLevel(${l.n})">Retry level ${l.n}</button></div>${back}</div>`;
 if(S.screen=='unlock')return storyBox(l.n,0);
 if(S.screen=='win')return storyBox(3,1);
 if(S.screen=='vault')return`<div class="card center">${bn}${stats()}<p>All puzzles solved! The system is entering your ${S.pin.length}-digit PIN automatically…</p><div class="pin">${S.pin.map(d=>`<div class="slot on">${d}</div>`).join('')}</div><input id="pinin" maxlength="${S.pin.length}" inputmode="numeric" placeholder="${S.pin.length}-digit PIN" value="${S.pin.join('')}" readonly style="max-width:240px;text-align:center;font-size:1.4rem;letter-spacing:.5em" onkeydown="if(event.key=='Enter')tryPin()"><br><button onclick="tryPin()">🔓 Unlock now</button><div class="msg" id="msg">${S.msg}</div></div>`;
 let h=`<div class="card">${bn}${stats()}<div class="prog" style="margin-top:10px"><div style="width:${S.solved/l.total*100}%"></div></div><small>Solved ${S.solved} / ${l.total} · Time <b id="el">${fmt(S.el||0)}</b></small>${S.phase=='puzzle'?`<div style="display:flex;align-items:center;gap:10px;margin-top:8px"><span>Time left</span><b id="tm" style="color:var(--gold);min-width:3ch">${fmt(Math.max(S.t??TLIM,0))}</b><div class="prog" style="flex:1"><div id="tb" style="width:${Math.max(S.t??TLIM,0)/TLIM*100}%"></div></div></div>`:''}<div class="pin">${S.pin.map((_,i)=>`<div class="slot ${i<rev?'on':''}">${i<rev?S.pin[i]:'?'}</div>`).join('')}</div>`;
 if(S.phase=='puzzle')h+=`${puzHTML()}${S.hintTxt?`<div class="center">${S.hintTxt}</div>`:''}<input id="ans" type="number" inputmode="numeric" placeholder="Your answer" onkeydown="if(event.key=='Enter')submit()"><div class="row c"><button onclick="submit()">Submit</button><button class="ghost" onclick="hint()">💡 Hint (free or 5 <i class=co></i>)</button><button class="ghost" onclick="buyLife()">❤️ Life (20 <i class=co></i>)</button></div>`;
 else if(S.phase=='chest')h+=`<h3 class="center">Pick a treasure box!</h3><div class="chests">${[0,1,2].map(i=>`<button onclick="pickChest(${i})">${chest(0)}</button>`).join('')}</div>`;
 else h+=`<div class="chests">${[0,1,2].map(i=>`<div>${chest(i==S.open)}</div>`).join('')}</div><h3 class="center good">${S.reward}</h3><div class="row c"><button onclick="next()">${S.solved>=l.total?'Go to the vault door →':'Next puzzle →'}</button></div>`;
 return h+`<div class="msg" id="msg">${S.msg}</div>${back}</div>`}
};

const togglePw=id=>{const i=$(id);i.type=i.type=='password'?'text':'password'};
const bg=(a,u)=>`style="background-image:linear-gradient(90deg,#070d24 38%,#070d2400 78%),url(${u})"`;
const fld=(ic,id,ph,t,ex='')=>`<div class="fld"><span>${ic}</span><input id="${id}" type="${t}" placeholder="${ph}" ${ex}>${t=='password'?`<span onclick="togglePw('${id}')">👁</span>`:''}</div>`;
pages.home=c=>`<section class="land" style="background-image:linear-gradient(90deg,#070d24 36%,#070d2400 72%),url(${IMG2.land})"><div class="lt"><small class="sp">WELCOME TO</small><h1 class="big">Banana<span>Mystery Vault</span></h1><p class="tag">Solve Puzzles • Collect Rewards • Unlock the Treasure</p><p>An exciting puzzle adventure game where you solve math puzzles, collect coins and keys, and unlock mysterious vaults with the power of the Banana API!</p><div class="row"><button onclick="go('${c?'dashboard':'register'}')">▶ Start Game</button><button class="ghost" onclick="$('feat').scrollIntoView({behavior:'smooth'})">Learn More ↓</button></div></div></section>
<section class="feat" id="feat">${[['<img class=ico src="'+IMG4+'" alt="">','Earn Coins','Solve puzzles and earn coins to buy hints and extra attempts.'],['🗝️','Collect Keys','Unlock new levels by collecting keys.'],['🎁','Special Rewards','Find bonus points, extra lives or hints in treasure boxes.'],['❤️','3 Lives','Make no mistakes! You have 3 lives.'],['📶','3 Levels','Progress through 3 levels and claim the final treasure!']].map(f=>`<div><i>${f[0]}</i><b>${f[1]}</b><small>${f[2]}</small></div>`).join('')}</section><p class="ready">♛ &nbsp; ARE YOU READY FOR THE CHALLENGE? &nbsp; ♛</p>`;
pages.login=()=>`<section class="scene" ${bg(0,IMG2.login)}><div class="gc"><img class="crest" src="${IMG2.crest}" alt=""><h2 class="script">Welcome Back!</h2><p style="margin:0 0 8px">Login to continue your adventure</p>${fld('👤','un','Username','text')}${fld('🔒','pw','Password','password',`onkeydown="if(event.key=='Enter')login()"`)}<div class="bt"><label><input type="checkbox"> Remember me</label></div><button class="wide" onclick="login()">➜ Login</button><div class="or">— OR —</div><button class="ghost wide" onclick="go('register')">Create New Account</button><small>Your data is safe with us</small><div class="msg" id="msg"></div></div></section><div class="strip"><span><i class=co></i> Earn Coins</span><span>🗝️ Collect Keys</span><span>🎁 Special Rewards</span><span>❤️ 3 Lives</span></div>`;
pages.register=()=>`<section class="scene" ${bg(0,IMG2.reg)}><div class="gc"><h2 class="script">Create Your Explorer ID</h2><p style="margin:0 0 8px">Choose a username and an avatar to create your Explorer ID.</p>${fld('👤','un','Username (3-16 letters, numbers, _)','text')}${fld('🔒','pw','Password','password')}<small>Use 8+ characters.</small>${fld('🔒','pw2','Confirm Password','password')}<div class="otpb"><b>Choose your avatar</b><div class="avs">${[0,1,2,3,4,5].map(i=>`<button type="button" class="av ${i==(S.av|0)?'on':''}" aria-label="Avatar ${i+1}" onclick="pickAv(${i})">${avatar(i,46)}</button>`).join('')}</div></div><div class="bt"><label><input type="checkbox" id="tc"> I agree to the Terms &amp; Conditions and Privacy Policy</label></div><button class="wide" onclick="register()">Create Account</button><p style="margin:8px 0 0"><small>Already have an account? <a style="color:var(--gold);cursor:pointer" onclick="go('login')">Login</a></small></p><div class="msg" id="msg"></div></div></section><div class="strip"><span>① Register</span><span>② Pick avatar</span><span>③ Play &amp; Win</span></div>`;

const puzHTML=()=>!S.p?'<div class="puz">Loading puzzle…</div>':S.p.img?`<div class="puz"><img src="${S.p.img}" alt="Banana puzzle" style="max-width:100%;border-radius:10px"><br><small>🍌 Live Banana API puzzle — enter the missing digit (0–9)</small></div>`:`<div class="puz">${S.p.q}<br><small>Find the digit the 🍌 stands for (0–9) · practice puzzle — run the Node server for live Banana API puzzles</small></div>`;
async function loadPuzzle(){S.p=null;S.phase='puzzle';render();
 try{const r=await fetch('/api/puzzle');if(!r.ok)throw 0;const d=await r.json();if(!d.id||!d.imageUrl)throw 0;S.p={id:d.id,img:d.imageUrl}}
 catch(e){S.p=makePuzzle(S.lvl.n)}
 render();}
function startLevel(n){const u=U();u.lives=3;S.lvl=LV[n-1];S.solved=0;S.hintTxt='';S.msg='';S.pin=[R(1,9),R(0,9),R(0,9)];S.screen='play';save();go('play');loadPuzzle();}
function next(){S.reward='';S.msg='';if(S.solved>=S.lvl.total){S.screen='vault';render()}else loadPuzzle();}
async function submit(){const v=$('ans').value.trim();if(v===''||!S.p)return;let ok;
 if(S.p.id){try{const r=await fetch('/api/answer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:S.p.id,answer:Number(v)})});ok=(await r.json()).correct}catch(e){return toast('Could not reach the server.','bad')}}
 else ok=Number(v)===S.p.ans;
 const u=U();
 if(ok){u.coins+=10;u.score+=100*S.lvl.n;S.solved++;S.hintTxt='';S.msg=`<span class="good">Correct! +10 <i class=co></i>${S.solved%S.lvl.per==0?' — a PIN digit is revealed!':''}</span>`;S.phase='chest';save();render();}
 else{u.lives--;save();if(u.lives<=0){S.screen='over';return render()}S.msg='<span class="bad">Wrong answer — you lost a life.</span>';if(S.p.id)loadPuzzle();else render();}}
async function hint(){const u=U();if(!S.p)return;
 if(u.hints>0)u.hints--;else if(u.coins>=5)u.coins-=5;else return toast('Not enough coins (5 <i class=co></i>).','bad');
 if(S.p.id){try{S.hintTxt='💡 '+(await(await fetch('/api/hint?id='+S.p.id)).json()).hint}catch(e){S.hintTxt='💡 Hint unavailable.'}}
 else{const a=S.p.ans;S.hintTxt=`💡 The answer is ${a%2?'odd':'even'} and between ${Math.max(0,a-R(2,4))} and ${a+R(2,4)}.`}
 save();render();}

function makePuzzle(){
 const ops=['+','−','×'],mid=n=>Math.floor(n/10)%10,calc=(x,o,y)=>o=='+'?x+y:o=='−'?x-y:x*y;
 const row=()=>{for(;;){const o=ops[R(0,2)],x=R(10,o=='×'?99:999),y=R(10,o=='×'?20:999),z=calc(x,o,y);if(z>=10&&z<=999)return{x,o,y,z}}};
 const ev=(a,o,b)=>calc(a,o,b);
 for(let t=0;t<300;t++){
  const r1=row(),r3=row(),sx=mid(r1.x)+mid(r3.x),sy=mid(r1.y)+mid(r3.y),sz=mid(r1.z)+mid(r3.z);
  if(sx>9||sy>9||sz>9)continue;
  const c=[];
  for(let x=10;x<1000;x++){if(mid(x)!=sx)continue;for(let y=10;y<1000;y++){if(mid(y)!=sy)continue;for(const o of ops){const z=calc(x,o,y);if(z>=10&&z<=999&&mid(z)==sz)c.push({x,o,y,z})}}}
  if(!c.length)continue;
  const r5=c[R(0,c.length-1)],rows=[r1,r3,r5],S9=rows.map(r=>[String(r.x),String(r.y),String(r.z)]);
  const all=S9.flat().join(''),digs=[...new Set(all)].filter(d=>all.split(d).length-1>=2).sort(()=>Math.random()-.5);
  for(const d of digs){
   const m=S9.map(r=>r.map(s=>s.replace(new RegExp(d,'g'),'B')));
   const lead=m.flat().some(s=>s[0]=='B');
   let good=[];
   for(let b=0;b<10;b++){
    if(lead&&b==0)continue;
    const v=m.map(r=>r.map(s=>s.replace(/B/g,b))),n=v.map(r=>r.map(Number));
    if(!n.every((r,i)=>ev(r[0],rows[i].o,r[1])==r[2]))continue;
    const td=k=>v.map(r=>+r[k][r[k].length-2]);
    if([0,1,2].every(k=>{const a=td(k);return a[0]+a[1]==a[2]}))good.push(b);
   }
   if(good.length==1&&good[0]==+d){
    const g=[...Array(5)].map(()=>Array(11).fill(''));
    rows.forEach((r,i)=>{const p=s=>s.padStart(3,' ').split(''),row=g[i*2],s=m[i];
     p(s[0]).forEach((ch,j)=>row[j]=ch);row[3]=r.o;p(s[1]).forEach((ch,j)=>row[4+j]=ch);row[7]='=';p(s[2]).forEach((ch,j)=>row[8+j]=ch)});
    [1,5,9].forEach(c=>{g[1][c]='+';g[3][c]='='});
    const cell=ch=>ch==' '||ch==''?'<td></td>':ch=='B'?'<td>🍌</td>':/\d/.test(ch)?`<td class="d">${ch}</td>`:`<td class="o">${ch}</td>`;
    return{ans:+d,q:`<div class="sg"><small style="color:#8b1c1c">Six Equations</small><table>${g.map(r=>'<tr>'+r.map(cell).join('')+'</tr>').join('')}</table></div>`,grid:g};
   }
  }
 }
 const b=R(2,9);return{ans:b,q:`🍌 + 🍌 + 🍌 = ${3*b}<br>🍌 = ?`};
}

const TLIM=45;let TM=null;
const fmt=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
const stopTimer=()=>{clearInterval(TM);TM=null};
function tick(){
 if(S.screen!='play'||S.phase!='puzzle'||!S.p||(location.hash||'').slice(1)!='play')return;
 S.t--;S.el=(S.el||0)+1;
 if($('tm'))$('tm').textContent=fmt(Math.max(S.t,0));
 if($('tb'))$('tb').style.width=Math.max(S.t,0)/TLIM*100+'%';
 if($('el'))$('el').textContent=fmt(S.el);
 if(S.t<=0)timeUp();}
function timeUp(){const u=U();stopTimer();u.lives--;save();
 if(u.lives<=0){S.screen='over';return render()}
 S.msg='<span class="bad">Time’s up — you lost a life.</span>';loadPuzzle();}
function startLevel(n){const u=U(),l=LV[n-1];u.lives=3;S.lvl=l;S.solved=0;S.el=0;S.hintTxt='';S.msg='';
 S.pin=Array.from({length:Math.floor(l.total/l.per)},(_,i)=>R(i?0:1,9));S.screen='play';save();go('play');loadPuzzle();}
async function loadPuzzle(){S.p=null;S.phase='puzzle';stopTimer();render();
 try{const r=await fetch('/api/puzzle');if(!r.ok)throw 0;const d=await r.json();if(!d.id||!d.imageUrl)throw 0;S.p={id:d.id,img:d.imageUrl}}
 catch(e){S.p=makePuzzle(S.lvl.n)}
 S.t=TLIM;render();TM=setInterval(tick,1000);}
function tryPin(){const v=$('pinin').value.trim(),u=U();
 if(v===S.pin.join('')){const n=S.lvl.n;if(!u.done.includes(n))u.done.push(n);u.score+=300*n;
  u.best=u.best||{};if(!u.best[n]||S.el<u.best[n])u.best[n]=S.el;
  if(n<3){if(!u.keys.includes(S.lvl.key))u.keys.push(S.lvl.key);u.unlocked=Math.max(u.unlocked,n+1)}
  save();S.screen=n<3?'unlock':'win';render();}
 else{u.lives--;save();if(u.lives<=0){S.screen='over';return render()}toast('Wrong PIN — you lost a life. Check your digits!','bad');render();}}


function next(){S.reward='';S.msg='';
 if(S.solved>=S.lvl.total){S.screen='vault';render();setTimeout(autoUnlock,2200)}else loadPuzzle();}
function autoUnlock(){if(S.screen!='vault'||!$('pinin'))return;$('pinin').value=S.pin.join('');tryPin();}

const STORY=[
{box:'The Bronze Box',item:'Bronze Key',bt:'+1 free hint',bonus:{hints:1},story:'Deep in the jungle, Banana the explorer cracked the first vault. Inside lay a bronze key, warm from the sunlight. It is the first step toward the great treasure.'},
{box:'The Silver Box',item:'Silver Key',bt:'+1 extra life',bonus:{lives:1},story:'The hidden vault sleeps behind glowing blue stones. Its silver key shines in the dark and opens the path to the burning golden vault.'},
{box:'The Golden Box',item:'The Final Treasure (golden crown)',bt:'+500 bonus points',bonus:{score:500},story:'At the end of the lava path the golden vault swings open. A crown of gold rests inside. The mystery is solved and Banana is a legend.'}];
const storyBox=(n,fin)=>{const s=STORY[n-1],u=U(),bs=u.best&&u.best[n]<S.el?` · Best ${fmt(u.best[n])}`:' · New best!';
 return `<div class="card center"><div style="font-size:.8rem;letter-spacing:.3em;color:var(--gold)">STORY VAULT BOX ${n} OF 3</div>${chest(1,110)}<h1>${s.box}</h1><p style="font-style:italic;max-width:520px;margin:6px auto">${s.story}</p><div class="card" style="text-align:left;max-width:460px;margin:12px auto"><h3>Inside the box</h3><div><b>Special item:</b> ${s.item}</div><div><b>Special bonus:</b> ${S.bonusText}</div><div><b>Level reward:</b> +${300*n} points</div><div><b>Your time:</b> ${fmt(S.el)}${bs}</div></div>${fin?`<div class="row c"><button onclick="go('leaderboard')">See leaderboard</button><button class="ghost" onclick="go('dashboard')">Dashboard</button></div>`:`<div class="row c"><button onclick="startLevel(${n+1})">Start Level ${n+1} →</button><button class="ghost" onclick="go('dashboard')">Dashboard</button></div>`}</div>`};
function tryPin(){const v=$('pinin').value.trim(),u=U();
 if(v===S.pin.join('')){const n=S.lvl.n,first=!u.done.includes(n),b=STORY[n-1].bonus;
  if(first){u.done.push(n);if(b.hints)u.hints+=b.hints;if(b.lives)u.lives=Math.min(5,u.lives+b.lives);if(b.score)u.score+=b.score}
  S.bonusText=first?STORY[n-1].bt:'already collected on your first win';
  u.score+=300*n;u.best=u.best||{};if(!u.best[n]||S.el<u.best[n])u.best[n]=S.el;
  if(n<3){if(!u.keys.includes(S.lvl.key))u.keys.push(S.lvl.key);u.unlocked=Math.max(u.unlocked,n+1)}
  save();S.screen=n<3?'unlock':'win';render();}
 else{u.lives--;save();if(u.lives<=0){S.screen='over';return render()}toast('Wrong PIN — you lost a life. Check your digits!','bad');render();}}

let MUTE=false;try{MUTE=localStorage.getItem('bmv_mute')=='1'}catch(e){}
let AC=null;
const ac=()=>{try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state=='suspended')AC.resume();return AC}catch(e){return null}};
addEventListener('pointerdown',ac);addEventListener('keydown',ac);
function tone(f,t0,d,type,v){const c=ac();if(!c)return;const o=c.createOscillator(),g=c.createGain(),s=c.currentTime+t0;
 o.type=type||'triangle';o.frequency.value=f;g.gain.setValueAtTime(0.0001,s);g.gain.linearRampToValueAtTime(v||.2,s+.03);g.gain.exponentialRampToValueAtTime(.001,s+d);
 o.connect(g);g.connect(c.destination);o.start(s);o.stop(s+d+.05)}
const NT={C5:523.25,D5:587.33,E5:659.25,F5:698.46,G5:783.99,A5:880,B5:987.77,C6:1046.5,E6:1318.5,G6:1567.98};
function winSound(n){if(MUTE)return;
 const seq={1:[['C5',0,.3],['E5',.16,.3],['G5',.32,.6]],
 2:[['C5',0,.25],['E5',.13,.25],['G5',.26,.25],['C6',.4,.35],['G5',.6,.2],['C6',.72,.7]],
 3:[['C5',0,.25],['E5',.14,.25],['G5',.28,.25],['C6',.42,.4],['E6',.72,.25],['G5',.9,.2],['C6',1.02,.2],['E6',1.14,.25],['G6',1.36,.9]]}[n]||[];
 seq.forEach(([k,s,d])=>{tone(NT[k],s,d,'triangle',.22);tone(NT[k]*2,s,d*.8,'sine',.06)});
 if(n==3)[0,.5,1.0,1.5].forEach(s=>tone(NT.C6*1.5,s+.2,.15,'sine',.05))}
function toggleSound(){MUTE=!MUTE;try{localStorage.setItem('bmv_mute',MUTE?'1':'0')}catch(e){}
 const b=$('snd');if(b)b.textContent=MUTE?'Sound: off':'Sound: on';if(!MUTE){ac();tone(NT.G5,0,.2,'triangle',.15)}}
{const _tp=tryPin;tryPin=function(){const b=S.screen;_tp();if(S.screen!=b&&(S.screen=='unlock'||S.screen=='win'))winSound(S.lvl.n)}}

function voice(f0,f1,s,d,fm,v){const c=ac();if(!c)return;const t0=c.currentTime+s,o=c.createOscillator(),b=c.createBiquadFilter(),g=c.createGain(),l=c.createOscillator(),lg=c.createGain();
 o.type='sawtooth';o.frequency.setValueAtTime(f0,t0);o.frequency.exponentialRampToValueAtTime(f1,t0+d);
 b.type='bandpass';b.frequency.value=fm;b.Q.value=3;l.frequency.value=14;lg.gain.value=14;l.connect(lg);lg.connect(o.frequency);
 g.gain.setValueAtTime(.0001,t0);g.gain.linearRampToValueAtTime(v||.5,t0+.03);g.gain.exponentialRampToValueAtTime(.001,t0+d);
 o.connect(b);b.connect(g);g.connect(c.destination);o.start(t0);l.start(t0);o.stop(t0+d+.05);l.stop(t0+d+.05)}
function whistle(s,d){const c=ac();if(!c)return;const t0=c.currentTime+s,o=c.createOscillator(),g=c.createGain();
 o.type='sine';o.frequency.setValueAtTime(500,t0);o.frequency.exponentialRampToValueAtTime(2000,t0+d);
 g.gain.setValueAtTime(.0001,t0);g.gain.linearRampToValueAtTime(.2,t0+.03);g.gain.exponentialRampToValueAtTime(.001,t0+d+.1);
 o.connect(g);g.connect(c.destination);o.start(t0);o.stop(t0+d+.15)}
function bananaRain(n){if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const box=document.createElement('div');for(let i=0;i<n*12;i++){const b=document.createElement('span');b.className='bn';b.textContent='🍌';
  b.style.left=Math.random()*96+'vw';b.style.fontSize=(24+Math.random()*26)+'px';b.style.animationDelay=Math.random()*1.4+'s';b.style.animationDuration=(2.4+Math.random()*1.6)+'s';box.appendChild(b)}
 document.body.appendChild(box);setTimeout(()=>box.remove(),5200)}
function winSound(n){bananaRain(n);if(MUTE)return;
 let e=0;for(let i=0;i<n;i++){const s=i*.55;voice(380,520,s,.2,350,.5);voice(520,330,s+.22,.3,900,.5);e=s+.6}
 whistle(e,.5);tone(NT.C6,e+.55,.4,'triangle',.2);
 if(n==3)[['C5',0],['E5',.15],['G5',.3],['C6',.45],['E6',.75],['G6',1]].forEach(([k,s])=>tone(NT[k],e+1.0+s,.35,'triangle',.2))}


let SYNC=null;
function syncUp(){if(!S.api||!DB.cur)return;clearTimeout(SYNC);SYNC=setTimeout(()=>{const u=DB.users[DB.cur];if(!u)return;
 fetch('/api/progress',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({coins:u.coins,lives:u.lives,score:u.score,hints:u.hints,keys:u.keys,unlocked:u.unlocked,done:u.done,best:u.best||{}})}).catch(()=>{})},500)}
const apiPost=async(url,body)=>{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});let d={};try{d=await r.json()}catch(e){}return{ok:r.ok,d}};
function logout(){if(S.api)fetch('/api/logout',{method:'POST'}).catch(()=>{});DB.cur=null;save();go('home');render();}
async function loadBoard(){if(!S.api)return;try{const r=await fetch('/api/leaderboard');if(r.ok){S.lb=(await r.json()).players;render()}}catch(e){}}


const AVC=['#f7c33c','#6bb8ff','#6be28f','#ff8fa3','#b58cff','#ffb347'];
const AVG=['<path d="M5 17c6 3 13-1 15-10-2 1-3 1-5 1 0 4-4 7-10 9z" fill="#3b2407"/>',
'<path d="M4 17l1-9 4 4 3-6 3 6 4-4 1 9z" fill="#3b2407"/>',
'<circle cx="8" cy="12" r="4" fill="none" stroke="#3b2407" stroke-width="2.4"/><path d="M12 12h9M18 12v4M15 12v3" stroke="#3b2407" stroke-width="2.4" fill="none"/>',
'<path d="M12 3l7 6-7 12L5 9z" fill="#3b2407"/>',
'<circle cx="12" cy="12" r="8" fill="none" stroke="#3b2407" stroke-width="2"/><path d="M12 5l3 7-3 7-3-7z" fill="#3b2407"/>',
'<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" fill="#3b2407"/>'];
const avatar=(i,s)=>{i=(i|0)%6;return `<svg width="${s||48}" height="${s||48}" viewBox="0 0 24 24" role="img" aria-label="Avatar ${i+1}"><circle cx="12" cy="12" r="12" fill="${AVC[i]}"/><g transform="translate(3.6 3.6) scale(.7)">${AVG[i]}</g></svg>`};
const badges=u=>{const b=[];if(u.done.includes(1))b.push('First Vault');if(u.done.includes(2))b.push('Silver Key');if(u.done.includes(3))b.push('Treasure Master');if(Object.values(u.best||{}).some(t=>t>0&&t<=30))b.push('Speedy (under 30s)');return b};
const mk=u=>({...u,name:u.username,key:u.username.toLowerCase()});
const newId=()=>{let id;do{id='BMV-'+R(10000,99999)}while(Object.values(DB.users).some(u=>u.explorerId===id));return id};
function pickAv(i){S.av=i;document.querySelectorAll('.av').forEach((b,j)=>b.classList.toggle('on',j===i))}
async function login(){const u=$('un').value.trim(),pw=$('pw').value,key=u.toLowerCase();
 if(S.api){try{const{ok,d}=await apiPost('/api/login',{username:u,password:pw});if(!ok)return toast(d.error||'Invalid username or password.','bad');
  const m=mk(d.user);DB.users[m.key]=m;DB.cur=m.key;save();S.msg='';go('dashboard');render();}catch(x){toast('Could not reach the server.','bad')}return}
 const x=DB.users[key];if(!x||x.pw!==btoa(pw))return toast('Invalid username or password.','bad');
 DB.cur=key;save();S.msg='';go('dashboard');render();}
function board(){
 if(S.api)return(S.lb||[]).map(p=>({n:p.name,s:p.score,d:p.done,me:p.me,a:p.avatar,id:p.explorerId}));
 const a=SEED.map((s,i)=>({n:s[0],s:s[1],d:s[2],seed:1,a:i%6,id:'BMV-'+(20000+i*1357)}));
 Object.values(DB.users).forEach(u=>a.push({n:u.name,s:u.score,d:u.done.length,me:u.key==DB.cur,a:u.avatar|0,id:u.explorerId}));
 return a.sort((x,y)=>y.s-x.s);}
async function init(){try{const h=await fetch('/api/health');if(!h.ok)return;const j=await h.json();if(!j.ok||!j.db)return;
 S.api=true;const r=await fetch('/api/me');
 if(r.ok){const{user}=await r.json();const m=mk(user);DB.users[m.key]=m;DB.cur=m.key}else DB.cur=null;
 loadBoard();render()}catch(e){}}

async function register(){const u=$('un').value.trim(),p=$('pw').value;
 if(!/^[A-Za-z0-9_]{3,16}$/.test(u))return toast('Username must be 3 to 16 letters, numbers or _ .','bad');
 if(p.length<8)return toast('Password needs 8+ characters.','bad');
 if(p!==$('pw2').value)return toast('Passwords do not match.','bad');
 if(!$('tc').checked)return toast('Please accept the Terms & Privacy Policy.','bad');
 const key=u.toLowerCase();
 if(S.api){try{const{ok,d}=await apiPost('/api/register',{username:u,password:p,avatar:S.av|0});if(!ok)return toast(d.error||'Could not create the account.','bad');
  const m=mk(d.user);DB.users[m.key]=m;DB.cur=m.key;save();go('dashboard');render();}catch(x){toast('Could not reach the server.','bad')}return}
 if(DB.users[key])return toast('That username is taken.','bad');
 DB.users[key]={username:u,name:u,key,explorerId:newId(),avatar:S.av|0,joined:Date.now(),pw:btoa(p),coins:20,lives:3,score:0,hints:1,keys:[],unlocked:1,done:[]};
 DB.cur=key;save();go('dashboard');render();}
function render(){
 const c=!!(DB.cur&&DB.users[DB.cur]);let p=(location.hash||'#home').slice(1);if(!pages[p])p='home';
 if(!c&&(p=='dashboard'||p=='play'))p='login';
 if(c&&(p=='login'||p=='register'))p='dashboard';
 if(p=='play'&&!S.lvl)p='dashboard';
 const a=(h,t)=>`<a class="${p==h?'on':''}" onclick="go('${h}')">${t}</a>`;
 $('app').innerHTML=`<nav><div class="logo" onclick="go('home')"><img src="${IMG2.logo}" alt=""><span>Banana<br>Mystery Vault</span></div><div class="links">${a('home','Home')}${a('about','About')}${c?a('dashboard','Dashboard'):''}${a('levels','Levels')}${a('leaderboard','Leaderboard')}</div><div class="nr"><button class="ghost" id="snd" onclick="toggleSound()" style="padding:6px 14px;font-size:.9rem">${MUTE?'Sound: off':'Sound: on'}</button><span class="pill"><i class=co></i> ${c?U().coins:0}</span>${c?`<button class="ghost" onclick="logout()">Log out</button>`:`<button class="ghost" onclick="go('login')">Login</button><button onclick="go('register')">Register</button>`}</div></nav><main class="wrap ${['home','login','register'].includes(p)?'full':''}">${pages[p](c)}</main>`;
 const f=$('ans')||$('pinin')||$('un');if(f&&innerWidth>700)f.focus();
}
addEventListener('hashchange',()=>{S.msg='';render();scrollTo(0,0);if(S.api&&['#leaderboard','#dashboard'].includes(location.hash))loadBoard()});
render();
init();

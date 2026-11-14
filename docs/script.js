// Banana Mystery Vault - game logic (pages, puzzles, timer, sound, login, MongoDB sync)
// Image path configuration
const IMG2={
    land:"images/land.jpg",
    login:"images/login.jpg",
    reg:"images/reg.jpg",
    logo:"images/logo.jpg",
    crest:"images/crest.jpg"
};
const IMG4="images/coins.png";
const IMG={
    m:"images/mascot.png",
    l:[
        "images/level1.jpg",
        "images/level2.jpg",
        "images/level3.jpg"
    ]
};

// Utiliy functions
const $=id=>document.getElementById(id),R=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const esc=s=>String(s).replace(/[<>&"]/g,'');

//Player data Management 
let DB={users:{},cur:null};
try{DB=JSON.parse(localStorage.getItem('bmv2'))||DB}catch(e){}
const save=()=>{try{localStorage.setItem('bmv2',JSON.stringify(DB))}catch(e){}syncUp()};
const U=()=>DB.users[DB.cur];

//Page Navigation
const go=h=>{location.hash=h};

//Game level congiguarion 
const LV=[
    {n:1,name:'The Beginner’s Vault',total:1,per:1,key:'🗝️ Bronze Key'},
    {n:2,name:'The Hidden Treasure Vault',total:2,per:1,key:'🔑 Silver Key'},
    {n:3,name:'The Golden Treasure Vault',total:3,per:1,key:'👑 Golden Key'}
];

//Leaderboard sample data
const SEED=[
    ['JungleJoe',4200,3],
    ['BananaQueen',3650,3],
    ['VaultHunter',2900,2],
    ['Mia_K',2100,2],
    ['Nimal',1300,1],
    ['Tharushi',800,1]
];

// Game state management
let S={
    tab:'login',
    otp:null,
    pend:null,
    msg:'',
    lvl:null,
    screen:'play',
    solved:0,
    pin:[],
    p:null,
    phase:'puzzle',
    reward:'',
    hintTxt:''
};

//Treasure chest SVG function
const chest=(o,s=84)=>`<svg width="${s}" height="${s}" viewBox="0 0 100 100"><rect x="10" y="44" width="80" height="44" rx="6" fill="#8a5a1c" stroke="#3b2407" stroke-width="3"/>${o?'<path d="M10 44 L20 14 L80 14 L90 44Z" fill="#a8742a" stroke="#3b2407" stroke-width="3"/><circle cx="50" cy="30" r="12" fill="#ffd34d"/>':'<path d="M10 44 Q50 6 90 44Z" fill="#a8742a" stroke="#3b2407" stroke-width="3"/>'}<rect x="10" y="50" width="80" height="8" fill="#f5c542"/><rect x="43" y="46" width="14" height="20" rx="3" fill="#ffe27a" stroke="#3b2407" stroke-width="2"/></svg>`;

//puzzle generation function
function makePuzzle(n){const m=4+n*4,a=R(2,m),b=R(a+1,m+3),t=R(0,2);
 if(t==0)return{q:`🍌 + 🍌 + 🍌 = ${3*b}<br>🍌 = ?`,ans:b};
 if(t==1)return{q:`🍎 = ${a}<br>🍌 + 🍎 = ${a+b}<br>🍌 × 🍎 = ?`,ans:a*b};
 return{q:`🍌 + 🍎 = ${a+b}<br>🍌 − 🍎 = ${b-a}<br>🍌 × 🍎 = ?`,ans:a*b};}

//Notification function
function toast(t,c){
    S.msg=`<span class="${c||''}">${t}</span>`;
    const e=$('msg');
    if(e)e.innerHTML=S.msg
}

// auth logout function 
function logout(){DB.cur=null;save();go('home');render();}

/* ---- game ---- */
//starting game level function
function startLevel(n){
    const u=U();
    u.lives=3;
    S.lvl=LV[n-1];
    S.solved=0;
    S.hintTxt='';
    S.msg='';
    
    S.pin=[R(1,9),R(0,9),R(0,9)];
    S.p=makePuzzle(n);
    S.phase='puzzle';
    S.screen='play';

    save();
    go('play');
    render();
}

//Answer validation function
function submit(){
    const v=$('ans').value.trim();
    if(v==='')return;
    const u=U();

    if(Number(v)===S.p.ans){
        u.coins+=10;
        u.score+=100*S.lvl.n;
        S.solved++;
        S.hintTxt='';

        S.msg=`<span class="good">
            Correct! +10 <i class=co></i>
            ${S.solved%S.lvl.per==0
                ?' — a PIN digit is revealed!'
                :''}
            </span>`;
            S.phase='chest';
            save();
            render();
        }
    else{ // Wrong Answer and Game Over Logic
        u.lives--;
        save();
        
        if(u.lives<=0){
            S.screen='over';
            return render();
        }
        S.msg='<span class="bad">Wrong answer — you lost a life.</span>';
        render();
    }
}

//Treasure Chest Reward System
function pickChest(i){
    const u=U(),r=R(0,3);

    if(r==0){
        u.coins+=15;
        S.reward='<i class=co></i> +15 coins';
    }else if(r==1){
        u.score+=50;
        S.reward='⭐ +50 bonus points';
    }else if(r==2){
        u.lives=Math.min(5,u.lives+1);
        S.reward='❤️ +1 extra life'
    }else{
        u.hints++;
        S.reward='💡 +1 free hint'
    }
    S.phase='opened';
    S.open=i;
    save();
    render();
}

//Next Puzzle and Hint System
function next(){
    S.reward='';
    S.msg='';

    if(S.solved>=S.lvl.total)
        S.screen='vault';
    else{
        S.p=makePuzzle(S.lvl.n);
        S.phase='puzzle';
    }
    render();
}

//Hint Availability and Coin Deduction
function hint(){
    const u=U();
    
    if(u.hints>0)
        u.hints--;
    else if(u.coins>=5)
        u.coins-=5;
    else 
        return toast(
            'Not enough coins (5 <i class=co></i>).',
            'bad'
        );
    const a=S.p.ans;
    S.hintTxt=`💡 The answer is ${a%2?'odd':'even'} and between ${Math.max(0,a-R(2,4))} and ${a+R(2,4)}.`;
    save();
    render();
}

//Buy Life and PIN Verification
function buyLife(){
    const u=U();
    
    if(u.coins<20)
        return toast('Extra life costs 20 <i class=co></i>.','bad');
    if(u.lives>=5)
        return toast('Maximum 5 lives.','bad');
    u.coins-=20;
    u.lives++;
    
    save();
    render();
}

//PIN verification function – beginning
function tryPin(){
    const v=$('pinin').value.trim(),u=U();

    if(v===S.pin.join('')){ // Check whether the entered PIN is correct
        const n=S.lvl.n;
        
        if(!u.done.includes(n)){ // add the completed level
           u.done.push(n); 
        }
        u.score+=300*n;      // Award points
        
        if(n<3){    // Unlock the next level and collect the key
            if(!u.keys.includes(S.lvl.key)){
                u.keys.push(S.lvl.key);
            }
            u.unlocked=Math.max(u.unlocked,n+1)
        }
        save(); // Save player progress
        // Navigate to the next screen
        S.screen=n<3?'unlock':'win';
        render();
    }else{
        u.lives--; // Deduct one life for an incorrect PIN
        save();
        
        if(u.lives<=0){ // Check whether the player has lost all lives
            S.screen='over';
            return render();
        }
        toast( //Display an error message
            'Wrong PIN — you lost a life. Check your digits!',
            'bad'
        );
        render();
    }
}

/* ---- views ---- */
//Display player statistics
const stats=()=>{
    const u=U();
    
    return`
        <div class="bar">
            <span class="pill"><i class=co></i> ${u.coins}</span>
            <span class="pill">${'❤️'.repeat(u.lives)||'💔'}</span>
            <span class="pill">⭐ ${u.score}</span>
            <span class="pill">💡 ${u.hints}</span>
        </div>
    `;
};

//Generate a level card
const lvCard=(l,c)=>{
    const u=c&&U(),
    lock=c&&l.n>u.unlocked,
    dn=c&&u.done.includes(l.n);
    
    return`
        <div class="lvc ${lock?'locked':''}">
            <div class="im" style="background-image:url(${IMG.l[l.n-1]})"></div>
            <div class="bd">
                <h3>Level ${l.n}${dn?' ✅':''}</h3>
                <b>${l.name}</b><br>
                <small>
                    ${l.total} puzzles ·
                    ${l.per==1?'each answer':'every '+l.per+' answers'} 
                    reveals a digit
                </small>
                ${c?`
                    <div class="row">
                        <button ${lock?'disabled':''} 
                            onclick="startLevel(${l.n})">
                            ${lock?'🔒 Locked':dn?'Replay':'Play'}
                        </button>
                    </div>
                `:''}
            </div>
        </div>
    `;
};

//page definitions
const pages={
    //home page
    home:c=>`
        <section class="hero">
            <div class="ht">
                <small>★ PUZZLE ADVENTURE ★</small>
                <h1>Banana Mystery Vault</h1>
                <p>Solve banana puzzles, reveal secret PIN digits and crack three legendary vaults to claim the final treasure.</p>
                <div class="row">
                    <button onclick="go('${c?'dashboard':'register'}')">
                        ${c?'Open Dashboard':'Start Adventure'}
                    </button>
                    
                    <button class="ghost" onclick="go('leaderboard')">
                        🏆 Leaderboard
                    </button>
                </div>
            </div>
        </section>
        
        <h2>Three Vaults to Crack</h2>
        
        <div class="grid">
            ${LV.map(l=>lvCard(l,0)).join('')}
        </div>

        <h2>How it works</h2>
        
        <div class="grid">
            <div class="card">
                <h3>🧮 Solve</h3>
                Crack banana equations to earn coins and reveal PIN digits.
            </div>
            <div class="card">
                 <h3>🎁 Collect</h3>
                 Open treasure boxes for coins, lives, hints and bonus points.
            </div>
            <div class="card">
                <h3>🗝️ Unlock</h3>
                Enter the PIN, win the key and open the next vault.
            </div>
        </div>
    `,
    //Dashboard page
    dashboard:c=>{
        const u=U(),
        b=board(),
        rk=b.findIndex(x=>x.me)+1;

        return`
            <div class="card idc">
                <div>${avatar(u.avatar,84)}</div>
                <div style="flex:1;min-width:200px">
                    <small>EXPLORER ID CARD</small>
                    <h2>${u.name}</h2>
                    
                    <div class="idno">
                        ${u.explorerId||'—'}
                    </div>
                    
                    <small>
                        ${rk?`Rank #${rk} of ${b.length}`:'Rank loading…'} 
                        · ${u.done.length}/3 vaults cleared
                        ${u.joined?` · Joined ${new Date(u.joined).toLocaleDateString()}`:''}
                    </small>
                    
                    <div class="badges">
                        ${badges(u).map(x=>`<span class="pill">${x}</span>`).join('')||
                            '<small>No badges yet. Clear a vault to earn one.</small>'}
                    </div>
                    
                    <div class="prog" style="margin-top:10px">
                        <div style="width:${u.done.length/3*100}%"></div>
                    </div>
                </div>
            </div>
            
            <div class="grid">
                ${[
                    ['<i class=co></i>',u.coins,'Coins'],
                    ['❤️',u.lives,'Lives'],
                    ['⭐',u.score,'Score'],
                    ['💡',u.hints,'Hints']
                ].map(s=>`
                    <div class="card stat">
                        ${s[0]}
                        <b>${s[1]}</b>
                        <small>${s[2]}</small>
                    </div>
                `).join('')}
            </div>
            
            <h2>Your Vaults</h2>
            
            <div class="grid">
                ${LV.map(l=>lvCard(l,1)).join('')}
            </div>
            
            <h2>Collected Keys</h2>
            
            <div class="card">
                ${u.keys.length
                    ?u.keys.map(k=>`<span class="pill">${k}</span> `).join('')
                    :'<small>No keys yet — crack Level 1 to earn your first.</small>'
                }
                ${u.done.includes(3)
                    ?' <span class="pill">🏆 Final Treasure</span>'
                    :''
                }
            </div>
        `;
    },
    
    //About page
    about:()=>`
        <div class="card wel">
            <img src="${IMG.m}" alt="">
            <div>
                <h1 style="font-size:2rem">About the Game</h1>
                <p>Banana Mystery Vault is an interactive puzzle adventure.
                   Explore a mysterious vault, solve banana puzzles to reveal 
                   PIN digits, collect coins, keys and special rewards, and 
                   protect your three lives on the way to the final treasure.</p>
                   
            </div>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3><i class=co></i> Coins</h3>
                Earned for every correct answer. Spend them on hints or extra lives.
            </div>
            
            <div class="card">
                <h3>🗝️ Keys</h3>
                Crack a vault to win the key that unlocks the next level.
            </div>
            
            <div class="card">
                <h3>🎁 Treasure boxes</h3>
                Hide bonus points, extra lives or free hints.
            </div>
            
            <div class="card">
                <h3>❤️ Lives</h3>
                You start with three. A wrong answer or wrong PIN costs one.
            </div>
        </div>
    `,

    //levels page
    levels:c=>`
        <h1 style="font-size:2.2rem">Levels</h1>
        
        <div class="grid">
            ${LV.map(l=>lvCard(l,c?1:0)).join('')}
        </div>
        
        <h2 style="margin-top:24px">Story vault boxes</h2>
        
        <div class="grid">
            ${STORY.map((s,i)=>{
                const o=c&&U().done.includes(i+1);
                
                return`
                    <div class="card center">
                        ${chest(o,70)}
                        <h3>${s.box}</h3>
                        
                        <small>
                            ${o?s.story:'Win Level '+(i+1)+' to open this box and read its story.'}
                        </small>
                        <div style="margin-top:8px">
                            <b>${s.item}</b><br>
                                ${s.bt}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="card">
                <h3>Level rules</h3>
                
                <table>
                    <tr>
                        <th>Level</th>
                        <th>Puzzles</th>
                        <th>Digit every</th>
                        <th>Reward</th>
                        </tr>
                        
                        ${LV.map(l=>`
                            <tr>
                                <td>${l.n}</td>
                                <td>${l.total}</td>
                                <td>${l.per} correct</td>
                                <td>${l.n<3?l.key:'🏆 Final treasure'}</td>
                            </tr>
                        `).join('')}
                    </table>

                    ${c?'':`
                        <div class="row">
                            <button onclick="go('register')">Register to play</button>
                        </div>
                    `}
                </div>
            `,
            //Leaderboard Page
            leaderboard:()=>{
                const b=board();
                
                return`
                    <h1 style="font-size:2.2rem">🏆 Leaderboard</h1>
                    
                    <div class="card">
                        <table>
                            <tr>
                                <th>#</th>
                                <th>Player</th>
                                <th>Vaults</th>
                                <th>Score</th>
                            </tr>
                            
                            ${b.map((x,i)=>`
                                <tr class="${x.me?'me':''}">
                                    <td>${['🥇','🥈','🥉'][i]||i+1}</td>
                                <td>
                                    <span style="display:inline-flex;align-items:center;gap:8px">
                                        ${avatar(x.a,28)}
                                        
                                        <span>
                                            ${x.n}${x.me?' (you)':''}
                                            <br>
                                            <small>${x.id||''}</small>
                                        </span>
                                    </span>
                                </td>
                                
                                <td>${x.d}/3</td>
                                <td>${x.s}</td>
                            </tr>
                        `).join('')}
                    </table>
                    
                    <small>
                        ${S.api
                            ?'Live scores from the MongoDB database.'
                            :'Sample explorers are shown beside accounts created on this device.'
                        }
                    </small>
                </div>
            `;
        },
        //Gameplay page
        play:()=>{
            const l=S.lvl,
            u=U(),
            rev=Math.floor(S.solved/l.per),
            
            bn=`
                <div class="banner" 
                style="background-image:linear-gradient(#0000,#0d0a14f0),url(${IMG.l[l.n-1]})">
                
                <h3>Level ${l.n} — ${l.name}</h3>
            </div>
        `;
        const back=`
            <div class="row c">
                <button class="ghost" onclick="go('dashboard')">
                    Back to dashboard
                </button>
            </div>
        `;
        //Game over screen
        if(S.screen=='over')
            return`
                <div class="card center">
                    <h1>💔 Game Over</h1>
                    <p>You ran out of lives. The vault stays sealed…</p>
                    
                    <div class="row c">
                        <button onclick="startLevel(${l.n})">
                            Retry level ${l.n}
                        </button>
                    </div>
                    ${back}
                </div>
            `;
            //Level unlock screen
            if(S.screen=='unlock'){
                return storyBox(l.n,0);
            }

            //Final wining screen
            if(S.screen=='win'){
                return storyBox(3,1);
            }

            //PIN vault screen
            if(S.screen=='vault')
                return`
                    <div class="card center">
                    ${bn}
                    ${stats()}
                    
                    <p>All puzzles solved! The system is entering your 
                    ${S.pin.length}-digit PIN automatically…
                    </p>
                    <div class="pin">
                        ${S.pin.map(d=>`
                            <div class="slot on">${d}</div>
                        `).join('')}
                    </div>
                    
                    <input
                         id="pinin" 
                         maxlength="${S.pin.length}" 
                         inputmode="numeric" 
                         placeholder="${S.pin.length}-digit PIN"
                         value="${S.pin.join('')}" 
                         readonly style="max-width:240px;text-align:center;font-size:1.4rem;letter-spacing:.5em"
                         onkeydown="if(event.key=='Enter')tryPin()"
                    >
                    <br>
                    <button onclick="tryPin()">🔓 Unlock now</button>
                    
                    <div class="msg" id="msg">${S.msg}</div>
                </div>
            `;
            //Main gameplay screen
            let h=`
                <div class="card">
                    ${bn}
                    ${stats()}
                <div class="prog" style="margin-top:10px">
                    <div style="width:${S.solved/l.total*100}%"></div>
                </div>
                
                <small>Solved ${S.solved} / ${l.total} 
                · Time <b id="el">${fmt(S.el||0)}</b>
                </small>
                
                ${S.phase=='puzzle'?`
                    <div style="display:flex;align-items:center;gap:10px;margin-top:8px">
                        <span>Time left</span>
                        
                        <b id="tm" style="color:var(--gold);min-width:3ch">
                        ${fmt(Math.max(S.t??TLIM,0))}
                        </b>

                        <div class="prog" style="flex:1">
                            <div id="tb" 
                                style="width:${Math.max(S.t??TLIM,0)/TLIM*100}%">
                            </div>
                        </div>
                    </div>
                `:''}
                <div class="pin">
                    ${S.pin.map((_,i)=>`
                        <div class="slot ${i<rev?'on':''}">
                            ${i<rev?S.pin[i]:'?'}
                        </div>
                    `).join('')}
                </div>
            `;
            //Puzzle phase
            if(S.phase=='puzzle')
                h+=`
                    ${puzHTML()}
                    ${S.hintTxt?`
                        <div class="center">${S.hintTxt}</div>
                    `:''}
                    <input 
                        id="ans" 
                        type="number" 
                        inputmode="numeric" 
                        placeholder="Your answer" 
                        onkeydown="if(event.key=='Enter')submit()"
                    >
                    <div class="row c">
                        <button onclick="submit()">Submit</button>
                        <button class="ghost" onclick="hint()">
                            💡 Hint (free or 5 <i class=co></i>)
                        </button><button class="ghost" onclick="buyLife()">
                            ❤️ Life (20 <i class=co></i>)</button>
                    </div>
                `;
                // Treasure chest phase
                else if(S.phase=='chest')
                    h+=`
                        <h3 class="center">Pick a treasure box!</h3>
                        <div class="chests">
                            ${[0,1,2].map(i=>`
                                <button onclick="pickChest(${i})">
                                    ${chest(0)}
                                </button>
                            `).join('')}
                        </div>
                    `;
                 // Reward phase   
                else{ 
                    h+=`
                        <div class="chests">
                            ${[0,1,2].map(i=>`
                                <div>${chest(i==S.open)}</div>
                            `).join('')}
                        </div>
                        <h3 class="center good">${S.reward}</h3>

                        <div class="row c">
                            <button onclick="next()">
                                ${S.solved>=l.total
                                    ?'Go to the vault door →'
                                    :'Next puzzle →'
                                }
                            </button>
                        </div>
                    `;
                }
                return h+`
                    <div class="msg" id="msg">${S.msg}</div>
                        ${back}
                    </div>
                `;
            }
};

//Home, Login and Registration
/* ---- PASSWORD VISIBILITY ---- */
// Show or hide password
const togglePw=id=>{
    const i=$(id);
        i.type=i.type=='password'?'text':'password';
};

/* ---- BACKGROUND IMAGE ---- */
// Generate background image styling
const bg=(a,u)=>
    `style="background-image:linear-gradient(90deg,#070d24 38%,#070d2400 78%),url(${u})"`;

/* ---- INPUT FIELD ---- */
// Generate reusable input fields
const fld=(ic,id,ph,t,ex='')=>
    `<div class="fld">
        <span>${ic}</span>
        <input 
            id="${id}" 
            type="${t}" 
            placeholder="${ph}"
             ${ex}
        >
        ${t=='password'
            ?`<span onclick="togglePw('${id}')">👁</span>`
            :''
        }
    </div>`;
/* ---- HOME PAGE ---- */
pages.home=c=>`
    <section class="land" style="background-image:linear-gradient(90deg,#070d24 36%,#070d2400 72%),url(${IMG2.land})">
    <div class="lt">
        <small class="sp">WELCOME TO</small>
        
        <h1 class="big">
            Banana<span>Mystery Vault</span>
        </h1>
        <p class="tag">
            Solve Puzzles • Collect Rewards • Unlock the Treasure
        </p>
        <p>An exciting puzzle adventure game where you solve math puzzles, 
           collect coins and keys, and unlock 
           mysterious vaults with the power of the Banana API!
        </p>
        <div class="row">
            <button onclick="go('${c?'dashboard':'register'}')">
                ▶ Start Game
            </button>
            
            <button class="ghost" 
                onclick="$('feat').scrollIntoView({behavior:'smooth'})">
                Learn More ↓
            </button>
        </div>
    </div>
</section>
<section class="feat" id="feat">
    ${[
        ['<img class=ico src="'+IMG4+'" alt="">',
         'Earn Coins',
         'Solve puzzles and earn coins to buy hints and extra attempts.'
        ],
        [
         '🗝️',
         'Collect Keys',
         'Unlock new levels by collecting keys.'
        ],
        [
         '🎁',
         'Special Rewards',
         'Find bonus points, extra lives or hints in treasure boxes.'
        ],
        [
         '❤️',
         '3 Lives',
         'Make no mistakes! You have 3 lives.'
        ],
        [
          '📶',
          '3 Levels',
          'Progress through 3 levels and claim the final treasure!'
        ]
    ].map(f=>`
        <div>
            <i>${f[0]}</i>
            <b>${f[1]}</b>
            <small>${f[2]}</small>
        </div>
    `).join('')}
</section>

    <p class="ready">
        ♛ &nbsp; ARE YOU READY FOR THE CHALLENGE? &nbsp; ♛
    </p>
`;

/* ---- LOGIN PAGE ---- */
pages.login=()=>`
    <section class="scene" ${bg(0,IMG2.login)}>
        <div class="gc">
            <img class="crest" src="${IMG2.crest}" alt="">
            <h2 class="script">Welcome Back!</h2>
            <p style="margin:0 0 8px">
                Login to continue your adventure
            </p>
            ${fld('👤','un','Username','text')}
            ${fld(
                '🔒',
                'pw',
                'Password',
                'password',
                `onkeydown="if(event.key=='Enter')login()"`
            )}
            <div class="bt">
                <label>
                    <input type="checkbox">
                     Remember me
                </label>
            </div>
            <button class="wide" onclick="login()">
                ➜ Login
            </button>
            <div class="or">— OR —</div>
            <button class="ghost wide" onclick="go('register')">
                Create New Account
            </button>
            <small>Your data is safe with us</small>
            <div class="msg" id="msg"></div>
        </div>
    </section>
    <div class="strip">
        <span><i class=co></i> Earn Coins</span>
        <span>🗝️ Collect Keys</span>
        <span>🎁 Special Rewards</span>
        <span>❤️ 3 Lives</span>
    </div>
`;

/* -------- REGISTRATION PAGE -------- */

pages.register = () => `
    <section class="scene" ${bg(0, IMG2.reg)}>
        <div class="gc">

            <img class="crest" src="${IMG2.crest}" alt="">

            <h2 class="script">Create Account</h2>

            <p>Join the Banana Mystery Vault adventure!</p>

            ${fld('👤', 'un', 'Username', 'text')}

            ${fld('🔒', 'pw', 'Password', 'password')}

            ${fld(
                '🔒',
                'pw2',
                'Confirm Password',
                'password',
                `onkeydown="if(event.key=='Enter')register()"`
            )}

            <div class="bt">
                <label>
                    <input type="checkbox" id="tc">
                    I accept the Terms & Privacy Policy.
                </label>
            </div>

            <button class="wide" onclick="register()">
                Create Account
            </button>

            <div class="or">— OR —</div>

            <button class="ghost wide" onclick="go('login')">
                Already have an account? Login
            </button>

            <div class="msg" id="msg">${S.msg}</div>

        </div>
    </section>
`;

/* ---- LOAD PUZZLE ---- */
async function loadPuzzle(){
     // Reset the current puzzle
    S.p=null;
    // Set the game phase to puzzle
    S.phase='puzzle';
    render();  // Display the updated interface

    try{
        // Request a puzzle from the backend API
        const r=await fetch('/api/puzzle');
        
         // Check whether the API request was successful
        if(!r.ok){
            throw 0;
        }
        // Convert the API response into JSON
        const d=await r.json();
        
        // Validate the puzzle data
        if(!d.id||!d.imageUrl){
            throw 0;
        }
        // Store the puzzle ID and image URL
            S.p={
                id:d.id,img:d.imageUrl
            }
    }catch(e){
        // Generate a local puzzle if the API request fails
        S.p=makePuzzle(S.lvl.n)
    }
     // Update the game interface with the loaded puzzle
    render();
}

/* ---- START LEVEL ---- */
function startLevel(n){
    const u=U();
     // Reset player lives
    u.lives=3;
    S.lvl=LV[n-1];// Set the selected level

    S.solved=0;  // Reset level progress
    S.hintTxt='';
    S.msg='';

     // Generate a random 3-digit PIN
    S.pin=[
        R(1,9),
        R(0,9),
        R(0,9)
    ];
    S.screen='play';  // Set the game screen
    save(); // Save player progress
    go('play');  // Navigate to gameplay
    loadPuzzle();// Load the first puzzle
}

/* ---- NEXT PUZZLE ---- */
function next(){
    // Clear previous reward and message
    S.reward='';
    S.msg='';
    
    // Check whether all puzzles are completed
    if(S.solved>=S.lvl.total){
        S.screen='vault'; // Navigate to the vault screen
        render()
    }else 
        loadPuzzle();   // Load the next puzzle
}
/* ---- SUBMIT ANSWER ---- */
async function submit(){
    const v=$('ans').value.trim();     // Get the player's entered answer
    if(v===''||!S.p)return;     // Validate the input and puzzle
    let ok;

    if(S.p.id) { // Check whether the puzzle came from the API
        try{
            const r=await fetch('/api/answer',{   // Send the answer to the backend API
                method:'POST',
                headers:{
                    'Content-Type':'application/json'
                },
                body:JSON.stringify({
                    id:S.p.id,
                    answer:Number(v)
                })
            });
            
             // Get the correctness result
            ok=(await r.json()).correct
        }catch(e){
            return toast('Could not reach the server.','bad') // Display an error if the server is unavailable
        }
    }
    else 
        ok=Number(v)===S.p.ans; // Validate a locally generated puzzle
    const u=U();

    if(ok){  // Handle a correct answer
        u.coins+=10;    // Award coins and score
        u.score+=100*S.lvl.n;

        S.solved++;  // Increase solved puzzle count
        S.hintTxt=''; // Clear the previous hint
        S.msg=` // Display success message
            <span class="good">
                Correct! +10 <i class=co></i>
                ${S.solved%S.lvl.per==0
                    ?' — a PIN digit is revealed!'
                    :''
                }
            </span>
        `;
        S.phase='chest';   // Move to treasure chest phase
        save();  // Save player progress
        render(); // Update the interface
    }else{
        u.lives--; // Deduct one life for an incorrect answer
        save(); // Save updated player data
        if(u.lives<=0){ // Check whether all lives are lost
            S.screen='over';
            return render()
        }
        
        // Display an incorrect answer message
        S.msg = `
            <span class="bad">
                Wrong answer — you lost a life.
            </span>
        `;
        // Load a new API puzzle or refresh the local puzzle
        if(S.p.id)
            loadPuzzle();
        else 
            render();
        }
}

/* ---- HINT SYSTEM ---- */
async function hint(){
    const u=U();
    
    if(!S.p)return; // Check whether a puzzle is available
    if(u.hints>0) // Use a free hint if available
        u.hints--;
    else if(u.coins>=5)
        u.coins-=5; // Otherwise, deduct 5 coins
    else 
        return toast( // Display an insufficient coins message
            'Not enough coins (5 <i class=co></i>).',
            'bad'
        );
        if(S.p.id){  // Get a hint from the backend API
            try{
                S.hintTxt='💡 '+(await(await fetch('/api/hint?id='+S.p.id)).json()).hint   // Display the received hint
            }catch(e){
                S.hintTxt='💡 Hint unavailable.' // Display a fallback message if an error occurs
            }
        }
        else{
            const a=S.p.ans;  // Generate a hint for a local puzzle
            S.hintTxt=`
                💡 The answer is ${a%2?'odd':'even'}
                 and between
                  ${Math.max(0,a-R(2,4))} 
                  and ${a+R(2,4)}.
            `;
        }
        save(); // Save updated player information
        render(); // Refresh the game interface
    }

/*-------Puzzle generation-------*/
function makePuzzle(){
 const ops=['+','−','×'], // Available mathematical operators
    mid=n=>Math.floor(n/10)%10, // Extract the tens digit
    calc=(x,o,y)=>   // Perform a calculation based on the operator
        o=='+'?x+y:o=='−'?x-y:x*y;

 const row=()=>{  // Generate a random mathematical equation
    for(;;){
        const o=ops[R(0,2)],
        x=R(10,o=='×'?99:999),
        y=R(10,o=='×'?20:999),
        z=calc(x,o,y);
        if(z>=10&&z<=999)
            return{x,o,y,z}
        }
    };

    // Reuse the calculation function
    const ev=(a,o,b)=>calc(a,o,b);

    // Try to generate a valid puzzle up to 300 times
    for(let t=0;t<300;t++){
    const r1=row(),
    r3=row(),
    sx=mid(r1.x)+mid(r3.x),
    sy=mid(r1.y)+mid(r3.y),
    sz=mid(r1.z)+mid(r3.z);
    if(sx>9||sy>9||sz>9)continue;

    // Find a third equation that satisfies the digit sums
    const c=[];
    for(let x=10;x<1000;x++){
        if(mid(x)!=sx)continue;
    for(let y=10;y<1000;y++){
        if(mid(y)!=sy)continue;
        for(const o of ops){
            const z=calc(x,o,y);
            if(z>=10&&z<=999&&mid(z)==sz)
                c.push({x,o,y,z})
            }
        }
    }
    if(!c.length)continue;
    // Randomly select the third equation
    const r5=c[R(0,c.length-1)],
    rows=[r1,r3,r5],
    S9=rows.map(r=>[
        String(r.x),
        String(r.y),
        String(r.z)
    ]);
    // Find repeated digits
    const all=S9.flat().join(''),
    digs=[...new Set(all)]
        .filter(d=>all.split(d).length-1>=2)
        .sort(()=>Math.random()-.5);

    // Test possible replacement digits    
    for(const d of digs){
         const m=S9.map(r=>
            r.map(s=>s.replace(new RegExp(d,'g'),'B'))
        );
        const lead=m.flat().some(s=>s[0]=='B');
        let good=[];

        for(let b=0;b<10;b++){
            if(lead&&b==0)continue;
            
            const v=m.map(r=>
                r.map(s=>s.replace(/B/g,b))
            ),
            n=v.map(r=>r.map(Number));
            
            // Check whether all equations are correct
            if(!n.every((r,i)=>
                ev(r[0],rows[i].o,r[1])==r[2]
            ))continue;
            
             // Check the vertical digit-sum equations
            const td=k=>
                v.map(r=>+r[k][r[k].length-2]);
            
            if([0,1,2].every(k=>{
                const a=td(k);
                return a[0]+a[1]==a[2]
            }))
             good.push(b);
   }
    // Accept only when the correct replacement is unique
   if(good.length==1&&good[0]==+d){
    const g=[...Array(5)].map(()=>
        Array(11).fill('')
    );
    // Build the puzzle grid
    rows.forEach((r,i)=>{
        const p=s=>
            s.padStart(3,' ').split(''),
        row=g[i*2],
        s=m[i];
        
        p(s[0]).forEach((ch,j)=>row[j]=ch);
        row[3]=r.o;
        p(s[1]).forEach((ch,j)=>row[4+j]=ch);
        row[7]='=';
        p(s[2]).forEach((ch,j)=>row[8+j]=ch)
    });

    // Add vertical operators
    [1,5,9].forEach(c=>{
        g[1][c]='+';
        g[3][c]='='
    });
     // Convert grid characters into HTML table cells
    const cell=ch=>
        ch==' '||ch==''
            ?'<td></td>'
            :ch=='B'
                ?'<td>🍌</td>'
                :/\d/.test(ch)
                    ?`<td class="d">${ch}</td>`
                    :`<td class="o">${ch}</td>`;
      // Return the puzzle and its answer               
    return{
        ans:+d,
        q:`<div class="sg"><small style="color:#8b1c1c">Six Equations</small><table>${g.map(r=>'<tr>'+r.map(cell).join('')+'</tr>').join('')}</table></div>`,
        grid:g
    };
   }
  } // End of digit loop
 }  // End of attempts loop

  // Fallback puzzle if a valid puzzle cannot be generated
  const b=R(2,9);
  return{
    ans:b,
    q:`🍌 + 🍌 + 🍌 = ${3*b}<br>🍌 = ?`
  };
}// End of makePuzzle()

// Display the generated puzzle (Banana API image or local equation)
function puzHTML(){
    if(!S.p)return '<p class="center">Loading puzzle…</p>';
    if(S.p.img)
        return `<div class="bp-frame">
            <div class="bp-label">🍌 Banana Puzzle</div>
            <div class="bp-hint">Find the missing number</div>
            <div class="bp-img"><img src="${S.p.img}" alt="Banana puzzle" onerror="bananaImgFail()"></div>
        </div>`;
    return S.p.q;
}

// If the Banana image cannot be shown, switch to a local puzzle
function bananaImgFail(){
    if(!S.p||!S.p.img)return;
    S.p=makePuzzle(S.lvl.n);
    toast('Could not load the Banana image — using a local puzzle.','bad');
    render();
}

/*---------TIMER FUNCTIONS--------*/
// Total puzzle time: 45 seconds
const TLIM=45;
let TM=null; // Store the timer interval
const fmt=s=> // Convert seconds into MM:SS format
    Math.floor(s/60)+':'+String(s%60).padStart(2,'0');

 // Stop the timer   
const stopTimer=()=>{
    clearInterval(TM);
    TM=null
};

// Update the countdown timer
function tick(){
    if( // Check whether the player is currently playing a puzzle
        S.screen!='play'||
        S.phase!='puzzle'||
        !S.p||
        (location.hash||'').slice(1)!='play'
    )return;
    // Decrease remaining time and increase elapsed time
    S.t--;S.el=(S.el||0)+1;
     // Update the countdown display
    if($('tm'))$('tm').textContent=fmt(Math.max(S.t,0));
    // Update the timer progress bar
    if($('tb'))$('tb').style.width=Math.max(S.t,0)/TLIM*100+'%';
    // Display elapsed time
    if($('el'))$('el').textContent=fmt(S.el);
     // Call timeUp() when time reaches zero
    if(S.t<=0)timeUp();
}
/*---------HANDLE TIME UP--------*/
function timeUp(){
    const u=U();
    stopTimer(); // Stop the countdown timer
    u.lives--;  // Deduct one life
    save(); // Save the updated player information
    if(u.lives<=0){
        S.screen='over';
        return render()
    } // Check whether the player has lost all lives
     
    // Display the time-up message
     S.msg='<span class="bad">Time’s up — you lost a life.</span>';
     loadPuzzle(); // Load another puzzle
}

/*---------START A LEVEL---------*/
function startLevel(n){
    const u=U(),
    l=LV[n-1];
    u.lives=3; // Reset lives and level information
    S.lvl=l;
    S.solved=0;
    S.el=0;
    S.hintTxt='';
    S.msg='';

    S.pin=Array.from( // Generate the PIN digits
        {length:Math.floor(l.total/l.per)},
        (_,i)=>R(i?0:1,9)
    );
    S.screen='play';   // Change the game screen
    save();   // Save player progress
    go('play'); // Navigate to the play screen
    loadPuzzle();  // Load the first puzzle
}

/*------------------- BANANA API PUZZLE ---------*/
// Banana API: returns { question: <image url>, solution: <digit> }
const BANANA_URL='https://marcconrad.com/uob/banana/api.php?out=json';

async function fetchBanana(){
    const ctl=new AbortController();
    const to=setTimeout(()=>ctl.abort(),6000);   // do not wait forever
    try{
        const r=await fetch(BANANA_URL+'&t='+Date.now(),{signal:ctl.signal});
        if(!r.ok)throw 0;
        const d=await r.json();
        const ans=Number(d.solution);
        if(!d.question||!Number.isInteger(ans))throw 0;
        return{
            img:String(d.question).replace(/^http:/,'https:'),
            ans,
            banana:true
        };
    }finally{clearTimeout(to)}
}

/*------------------- LOAD A PUZZLE---------*/
async function loadPuzzle(){
    S.p=null; // Clear the current puzzle
    S.phase='puzzle';
    stopTimer();   // Stop any previous timer
    render(); // Display the puzzle loading state

    try{
        // 1) Your own backend, if it is running
        const r=await fetch('/api/puzzle');
        if(!r.ok)throw 0;
        const d=await r.json();
        if(!d.id||!d.imageUrl)throw 0;
        S.p={id:d.id,img:d.imageUrl};
    }catch(e){
        try{
            // 2) The Banana API directly
            S.p=await fetchBanana();
        }catch(e2){
            // 3) Local puzzle if both fail
            S.p=makePuzzle(S.lvl.n);
        }
    }
    S.t=TLIM; // Set the countdown to 45 seconds
    render(); // Display the loaded puzzle
    TM=setInterval(tick,1000); // Start the timer and call tick() every second
}

/*--------------VERIFY THE PIN--------*/
function tryPin(){
    const v=$('pinin').value.trim(), // Get the entered PIN and player information
    u=U();
    if(v===S.pin.join('')){ // Compare entered PIN with the generated PIN
        const n=S.lvl.n;
        if(!u.done.includes(n))
            u.done.push(n)
        ;u.score+=300*n; // Award points for completing the level
        u.best=u.best||{};  // Update the best completion time
        if(!u.best[n]||S.el<u.best[n])
            u.best[n]=S.el;
        if(n<3){ // Reward the player with a key and unlock the next level
            if(!u.keys.includes(S.lvl.key))
                u.keys.push(S.lvl.key);
                u.unlocked=Math.max(u.unlocked,n+1)
            }
            save();  // Save the updated progress
            S.screen=n<3?'unlock':'win';  // Navigate to the unlock or winning screen
            render();
        }
        else{
            u.lives--;  // Deduct one life for an incorrect PIN
                save();// Save the updated player information
                if(u.lives<=0){ // Check whether the player has lost all lives
                    S.screen='over';
                    return render()
                }
                toast( // Display an incorrect PIN message
                    'Wrong PIN — you lost a life. Check your digits!',
                    'bad'
                );
                render(); // Refresh the game screen
            }
}

/*---------MOVE TO THE NEXT PUZZLE--------*/
function next(){
    S.reward='';  // Clear previous reward and message
    S.msg='';
    
    // Check whether all puzzles in the level are solved
    if(S.solved>=S.lvl.total){
        S.screen='vault';    // Move to the vault screen
        render();  // Update the game interface
        setTimeout(autoUnlock,2200) // Automatically unlock the vault after 2.2 seconds
    }else
         loadPuzzle();  // Load the next puzzle
}
/*-------------------- AUTOMATIC PIN SUBMISSION----------*/
function autoUnlock(){
    // Check whether the player is still on the vault screen
    // and whether the PIN input field exists
    if(S.screen!='vault'||!$('pinin'))return;

    // Automatically insert the generated PIN
    $('pinin').value=S.pin.join('');

    // Verify the PIN using the existing PIN function
    tryPin();
}

/*------------Story data-----------*/
const STORY=[
    {
        box:'The Bronze Box',
        item:'Bronze Key',
        bt:'+1 free hint',
        bonus:{hints:1},
        story:'Deep in the jungle, Banana the explorer cracked the first vault. Inside lay a bronze key, warm from the sunlight. It is the first step toward the great treasure.'
    },
    {
        box:'The Silver Box',
        item:'Silver Key',
        bt:'+1 extra life',
        bonus:{lives:1},
        story:'The hidden vault sleeps behind glowing blue stones. Its silver key shines in the dark and opens the path to the burning golden vault.'
    },
    {
        box:'The Golden Box',
        item:'The Final Treasure (golden crown)',
        bt:'+500 bonus points',
        bonus:{score:500},
        story:'At the end of the lava path the golden vault swings open. A crown of gold rests inside. The mystery is solved and Banana is a legend.'
    }
];
/*-------Story box display------*/
const storyBox=(n,fin)=>{
    const s=STORY[n-1],  // Get the selected level's story and player information
    u=U(),
    bs=u.best&&u.best[n]<S.el  // Display the best time or new best message
        ?` · Best ${fmt(u.best[n])}`
        :' · New best!';

     // Generate the story vault HTML
    return `  
        <div class="card center">
            <div style="font-size:.8rem;letter-spacing:.3em;color:var(--gold)">
                STORY VAULT BOX ${n} OF 3
            </div>
            ${chest(1,110)}
            <h1>${s.box}</h1>
            <p style="font-style:italic;max-width:520px;margin:6px auto">
            ${s.story}
            </p>
                <div class="card" style="text-align:left;max-width:460px;margin:12px auto">
                     <h3>Inside the box</h3>
                     <div><b>Special item:</b> ${s.item}</div>
                     <div><b>Special bonus:</b> ${S.bonusText}</div>
                     <div><b>Level reward:</b> +${300*n} points</div>
                     <div><b>Your time:</b> ${fmt(S.el)}${bs}</div>
                </div>
                ${
                    fin
                        ?`
                         <div class="row c">
                            <button onclick="go('leaderboard')">
                                See leaderboard
                            </button>
                            <button class="ghost" onclick="go('dashboard')">
                                Dashboard
                            </button>
                        </div>
                    `
                    :`
                        <div class="row c">
                            <button onclick="startLevel(${n+1})">
                                Start Level ${n+1} →
                            </button>
                            <button class="ghost" onclick="go('dashboard')">Dashboard
                            </button>
                        </div>
                    `
                }
            </div>
            
        `;
};
/*---------PIN verification and reward management-----*/
function tryPin(){
    const v=$('pinin').value.trim(), // Get the entered PIN and player information
    u=U();

    // Check whether the entered PIN matches the generated PIN
    if(v===S.pin.join('')){
        const n=S.lvl.n,
        first=!u.done.includes(n), // Check whether this is the player's first completion
        b=STORY[n-1].bonus; // Get the current level's bonus
    if(first){
        u.done.push(n); // Record the completed level
        if(b.hints) // Award one extra hint
            u.hints+=b.hints;
        if(b.lives) // Award one extra life, maximum five lives
            u.lives=Math.min(5,u.lives+b.lives);
        if(b.score) // Award additional bonus points
            u.score+=b.score
        }
        
        // Set the special bonus message
        S.bonusText=first
            ?STORY[n-1].bt
            :'already collected on your first win';
        
            u.score+=300*n; // Award level completion points
            u.best=u.best||{}; // Initialize the best-time object
            if(!u.best[n]||S.el<u.best[n]) // Update the best completion time
                u.best[n]=S.el;

            // Award the level key and unlock the next level
            if(n<3){
                if(!u.keys.includes(S.lvl.key))
                    u.keys.push(S.lvl.key);
                    u.unlocked=Math.max(u.unlocked,n+1)
                }
                 save(); // Save player progress
                 S.screen=n<3?'unlock':'win';  // Navigate to the unlock or winning screen
                 render();   // Update the game interface
            }
            else{
                u.lives--; // Deduct one life for an incorrect PIN
                save();  // Save updated player information
                if(u.lives<=0){  // Check whether the player has lost all lives
                    S.screen='over';
                    return render()
                }
                // Display an incorrect PIN message
                toast( 
                    'Wrong PIN — you lost a life. Check your digits!',
                    'bad'
                );
                render();
            }
        }
        // Default sound setting
        let MUTE=false;
        // Load the saved sound preference
        try{
            MUTE=localStorage.getItem('bmv_mute')=='1'
        }
        catch(e){
        // Keep the default sound setting if storage is unavailable
    }
     // Store the AudioContext object  
    let AC=null;
    
    // Initialize the browser audio system
    const ac=()=>{
        try{
            // Create AudioContext only once
            AC=AC||new(
                window.AudioContext||window.webkitAudioContext
            )();
             // Resume audio if it is suspended
            if(AC.state=='suspended')
                AC.resume();
            return AC // Return the AudioContext
        }
        catch(e){
            return null // Return null if audio initialization fails
        }
    };
    // Initialize audio after a user interaction
    addEventListener('pointerdown',ac);
    addEventListener('keydown',ac);

/*-------Generate individual sound------*/
function tone(f,t0,d,type,v){
    const c=ac(); // Get the browser audio context
    if(!c)return; // Stop if audio initialization fails
    
    const o=c.createOscillator(),  // Create an oscillator and gain node
    g=c.createGain(),

    s=c.currentTime+t0; // Calculate the sound starting time
    o.type=type||'triangle'; // Set the waveform type
    o.frequency.value=f; // Set the sound frequency
    g.gain.setValueAtTime(0.0001,s); // Set the initial volume
    g.gain.linearRampToValueAtTime(v||.2,s+.03); // Gradually increase the volume
    g.gain.exponentialRampToValueAtTime(.001,s+d);// Gradually decrease the volume
    o.connect(g); // Connect oscillator to volume control
    g.connect(c.destination); //Connect volume control to speakers
    // Start and stop the sound
    o.start(s);
    o.stop(s+d+.05)
}
const NT={
    C5:523.25,
    D5:587.33,
    E5:659.25,
    F5:698.46,
    G5:783.99,
    A5:880,
    B5:987.77,
    C6:1046.5,
    E6:1318.5,
    G6:1567.98
};
/*---------Victory sound--------*/
function winSound(n){
    if(MUTE)return; // Do not play sounds if mute is enabled
   
    const seq={  // Define different victory melodies for each level
        1:[
            ['C5',0,.3],
            ['E5',.16,.3],
            ['G5',.32,.6]
        ],
        2:[
            ['C5',0,.25],
            ['E5',.13,.25],
            ['G5',.26,.25],
            ['C6',.4,.35],
            ['G5',.6,.2],
            ['C6',.72,.7]
        ],
        3:[
            ['C5',0,.25],
            ['E5',.14,.25],
            ['G5',.28,.25],
            ['C6',.42,.4],
            ['E6',.72,.25],
            ['G5',.9,.2],
            ['C6',1.02,.2],
            ['E6',1.14,.25],
            ['G6',1.36,.9]
        ]
    }[n]||[];

    // Play the selected victory melody
    seq.forEach(([k,s,d])=>{ 
        tone(NT[k],s,d,'triangle',.22); // Play the main musical note
        tone(NT[k]*2,s,d*.8,'sine',.06) // Play a higher-frequency supporting tone
    });

     // Add extra celebration sounds for the final level
    if(n==3)
        [0,.5,1.0,1.5].forEach(s=>
            tone(NT.C6*1.5,s+.2,.15,'sine',.05)
        )
    }
/*---------SOUND TOGGLE--------*/
function toggleSound(){
    MUTE=!MUTE; // Switch between sound on and sound off
    try{
        localStorage.setItem(
            'bmv_mute',
             MUTE?'1':'0'
            )
        }
        catch(e){
             // Continue if local storage is unavailable
        }
        // Update the sound button text
        const b=$('snd');
        if(b)
            b.textContent=MUTE
                ?'Sound: off'
                :'Sound: on';
        // Play a short confirmation tone when sound is enabled
        if(!MUTE){
            ac();
            tone(NT.G5,0,.2,'triangle',.15)
        }
    }
{
    // Keep a reference to the original tryPin function
    const _tp=tryPin;
    // Override tryPin with an extended version
    tryPin=function(){
        // Store the current screen before checking the PIN
        const b=S.screen;
        

        // Run the original PIN verification function
        _tp();
        
         // Check whether the screen changed to unlock or win
        if(
            S.screen!=b&&
            (S.screen=='unlock'||S.screen=='win')
        )
        // Play the victory sound for the current level
        winSound(S.lvl.n)
    }
}

function voice(f0,f1,s,d,fm,v){
    const c=ac(); // Get the AudioContext
    if(!c)return;
    
    const t0 = c.currentTime + s; // Calculate the sound starting time
    o=c.createOscillator(), // Create audio nodes
    b=c.createBiquadFilter(),
    g=c.createGain(),
    l=c.createOscillator(),
    lg=c.createGain();

    // Configure the main oscillator
    o.type='sawtooth';
    o.frequency.setValueAtTime(f0,t0);
    o.frequency.exponentialRampToValueAtTime(f1,t0+d);
    
    // Configure the band-pass filter
    b.type='bandpass';
    b.frequency.value=fm;
    b.Q.value=3;

    // Configure the modulation oscillator
    l.frequency.value=14;
    lg.gain.value=14;

    // Connect modulation to the main oscillator frequency
    l.connect(lg);
    lg.connect(o.frequency);

    // Control the sound volume
    g.gain.setValueAtTime(.0001,t0);
    g.gain.linearRampToValueAtTime(v||.5,t0+.03);
    g.gain.exponentialRampToValueAtTime(.001,t0+d);

    // Connect the audio processing nodes
    o.connect(b);
    b.connect(g);
    g.connect(c.destination);

    // Start and stop the oscillators
    o.start(t0);
    l.start(t0);
    o.stop(t0+d+.05);
    l.stop(t0+d+.05)
}
function whistle(s,d){
    const c=ac(); // Get the AudioContext
    if(!c)return;
    
    // Calculate the sound starting time
    const t0=c.currentTime+s,

     // Create an oscillator and gain node
    o=c.createOscillator(),
    g=c.createGain();

     // Configure the sine-wave sound
    o.type='sine';

    // Set the starting frequency to 500 Hz
    o.frequency.setValueAtTime(500,t0);
    
    // Gradually increase the frequency to 2000 Hz
    o.frequency.exponentialRampToValueAtTime(2000,t0+d);

    // Gradually increase the volume
     g.gain.setValueAtTime(.0001,t0);
     g.gain.linearRampToValueAtTime(.2,t0+.03);

     // Gradually decrease the volume
     g.gain.exponentialRampToValueAtTime(.001,t0+d+.1);

     // Connect the gain node to the speakers
    o.connect(g);

    // Connect the gain node to the speakers
    g.connect(c.destination);
    
    // Start and stop the sound
    o.start(t0);
    o.stop(t0+d+.15)
}

/*------banana rain animation-----*/
function bananaRain(n){
    // Check whether the user prefers reduced motion
    if(
        window.matchMedia&&
        matchMedia('(prefers-reduced-motion: reduce)').matches
    )return;

     // Create a container for the banana animation
    const box=document.createElement('div');

    // Create multiple banana elements
    for(let i=0;i<n*12;i++){
        const b=document.createElement('span');
        
         // Add the CSS animation class
        b.className='bn';
        b.textContent='🍌';   // Display a banana emoji
        b.style.left=Math.random()*96+'vw'; // Set a random horizontal position
        b.style.fontSize=(24+Math.random()*26)+'px';  // Set a random banana size
        b.style.animationDelay=Math.random()*1.4+'s'; // Set a random animation delay
        b.style.animationDuration=(2.4+Math.random()*1.6)+'s';  // Set a random animation duration
        box.appendChild(b)   // Add the banana to the container
    }
    document.body.appendChild(box);// Add the animation container to the webpage
    setTimeout(()=>box.remove(),5200)  // Remove the container after 5.2 seconds
}
/*-------level-completion celebration------- */
function winSound(n){
    bananaRain(n); // Display the banana rain animation
    
    if(MUTE)return; // Stop audio playback if sound is muted
    let e=0;  // Initialize the ending time
    for(let i=0;i<n;i++){ // Repeat sound effects according to the level number
        const s=i*.55; // Calculate the starting time for each sound sequence
        voice(380,520,s,.2,350,.5); // Play the first voice-like sound
        voice(520,330,s+.22,.3,900,.5);
        e=s+.6 // Update the ending time
    }
    whistle(e,.5); // Play a whistle after the voice-like sounds
    tone(NT.C6,e+.55,.4,'triangle',.2);   // Play a high-pitched musical note
    if(n==3) // Add an extra melody for the final level
        [
            ['C5',0],
            ['E5',.15],
            ['G5',.3],
            ['C6',.45],
            ['E6',.75],
            ['G6',1]
        ].forEach(([k,s])=>
            tone(NT[k],e+1.0+s,.35,'triangle',.2)
        )
    }

// Stores the timeout ID used for delayed progress synchronisation.
let SYNC=null;

// Sends the player's latest progress to the backend.
function syncUp(){

    // Stop if the API is unavailable or no player is logged in
    if(!S.api||!DB.cur)return;

    // Clear the previous timeout to avoid sending too many requests.
    clearTimeout(SYNC);
    
    // Wait 500 milliseconds before synchronising progress.
    SYNC=setTimeout(()=>{
        const u=DB.users[DB.cur];
        if(!u)return; // Stop if the current user's data is unavailable.

        // Send player progress to the backend using a PUT request
        fetch('/api/progress',{
            method:'PUT',
            headers:{
                'Content-Type':'application/json'
            },
            body:JSON.stringify({
                coins:u.coins,
                lives:u.lives,
                score:u.score,
                hints:u.hints,
                keys:u.keys,
                unlocked:u.unlocked,
                done:u.done,
                best:u.best||{}
            })
        }).catch(()=>{})  // Ignore network errors.
    },500)
}

// Sends data to the backend using a POST request.
const apiPost=async(url,body)=>{
    const r=await fetch(url,{
        method:'POST',
        headers:{
            'Content-Type':'application/json'
        },
        body:JSON.stringify(body)
    });
    
    // Try to read the server's JSON response
    let d={};
    try{
        d=await r.json()
    }catch(e){}
    return{  // Return the request status and response data.
        ok:r.ok,
        d
    }
};

// Logs out the current player.
function logout(){

    // Send a logout request to the backend if the API is enabled.
    if(S.api)
        fetch('/api/logout',{method:'POST'}).catch(()=>{});

    // Clear the current player from the local state.
    DB.cur=null;
    
    save(); // Save the updated local data.
    go('home');  // Navigate to the home screen and update the display.
    render();
}

// Loads the leaderboard from the backend.
async function loadBoard(){
    if(!S.api)return; // Stop if the API is unavailable.

    // Request leaderboard information from the server.
    try{
        const r=await fetch('/api/leaderboard');
        if(r.ok){
            S.lb=(await r.json()).players // Store the players returned by the server.
            render()
        }
    }catch(e){
         // Ignore network errors.
    }
}

// Available colours for player avatars.
const AVC=[
    '#f7c33c',
    '#6bb8ff',
    '#6be28f',
    '#ff8fa3',
    '#b58cff',
    '#ffb347'
];
// SVG designs used to create different player avatars.
const AVG=[

     // Avatar 1 – Leaf design.
    '<path d="M5 17c6 3 13-1 15-10-2 1-3 1-5 1 0 4-4 7-10 9z" fill="#3b2407"/>',

     // Avatar 2 – Crown design.
    '<path d="M4 17l1-9 4 4 3-6 3 6 4-4 1 9z" fill="#3b2407"/>',

    // Avatar 3 – Key design.
    '<circle cx="8" cy="12" r="4" fill="none" stroke="#3b2407" stroke-width="2.4"/><path d="M12 12h9M18 12v4M15 12v3" stroke="#3b2407" stroke-width="2.4" fill="none"/>',

     // Avatar 4 – Diamond design.
    '<path d="M12 3l7 6-7 12L5 9z" fill="#3b2407"/>',


    // Avatar 5 – Circular geometric design.
    '<circle cx="12" cy="12" r="8" fill="none" stroke="#3b2407" stroke-width="2"/><path d="M12 5l3 7-3 7-3-7z" fill="#3b2407"/>',

    // Avatar 6 – Star design.
    '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" fill="#3b2407"/>'
];

// Generates an SVG avatar using the selected design and colour.
const avatar=(i,s)=>{
    i=(i|0)%6; // Ensures the avatar index is within the range 0–5.
    
     // Returns an SVG image with a coloured circular background.
    return `
        <svg width="${s||48}" height="${s||48}"
            viewBox="0 0 24 24" 
             role="img" 
            aria-label="Avatar ${i+1}">
         
             <circle cx="12" cy="12" r="12" fill="${AVC[i]}"/>
         
            <g transform="translate(3.6 3.6) scale(.7)">
                 ${AVG[i]}
            </g>
        
        </svg>
        
    `;
};

// Generates achievement badges based on player progress.
const badges=u=>{
    const b=[];
    if(u.done.includes(1))b.push('First Vault');// Adds a badge when the player completes Level 1.
    if(u.done.includes(2))b.push('Silver Key'); // Adds a badge when the player completes Level 2.
    if(u.done.includes(3))b.push('Treasure Master'); // Adds a badge when the player completes Level 3.
    
    // Adds a badge if the player has a best completion time of 30 seconds or less.
    if(Object.values(u.best||{}).some(t=>t>0&&t<=30))
        b.push('Speedy (under 30s)');
    return b
};

// Creates a modified player object.
const mk=u=>({
    ...u,
    name:u.username,
    key:u.username.toLowerCase()
});

// Generates a unique Explorer ID.
const newId=()=>{
    let id;
        // Creates an ID with the BMV prefix and a random five-digit number.
        do{id='BMV-'+R(10000,99999)

            // Checks whether another player already has this Explorer ID.
        }while(Object.values(DB.users).some(u=>u.explorerId===id)
        );
    return id
};

// Allows the player to select an avatar.
function pickAv(i){
    S.av=i; // Stores the selected avatar index.

    // Updates the visual selection of the avatars.
    document.querySelectorAll('.av').forEach((b,j)=>
        b.classList.toggle('on',j===i)
)}

// Handles player login.
async function login(){
    // Gets the username and password entered by the player.
    const u=$('un').value.trim(),
    pw=$('pw').value,
    key=u.toLowerCase();  // Converts the username to lowercase for consistent lookup.
    
    if(S.api){
        try{
             // Sends the username and password to the backend.
            const{ok,d}=await apiPost('/api/login',{
                username:u,
                password:pw
            });
            // Displays an error if login is unsuccessful.
            if(!ok)
                return toast(
                            d.error||'Invalid username or password.',
                            'bad'
                        );
                         // Prepares the player data returned by the backend.
                         const m=mk(d.user);
                         DB.users[m.key]=m; // Stores the player information locally.
                         DB.cur=m.key; // Sets the current logged-in player.
                         save(); // Saves the updated local data.
                         S.msg='';

                          // Navigates to the dashboard and refreshes the screen.
                         go('dashboard');
                         render();
                        }catch(x){
                            // Displays an error if the server cannot be reached.
                            toast('Could not reach the server.','bad')
                        }return
                    }
                    // Local login fallback when the backend API is disabled.
                    const x=DB.users[key];
                    
                     // Checks whether the player exists and the password matches.
                     if(!x||x.pw!==btoa(pw))
                        return toast('Invalid username or password.','bad');
                    DB.cur=key; // Sets the current logged-in player.
                    save();
                    S.msg=''; // Clears previous messages.
                    go('dashboard'); // Opens the dashboard.
                    render();
                }
/*------- Prepares leaderboard information for display.----*/
function board(){
 if(S.api)
    return(S.lb||[]).map(p=>({
        n:p.name,
        s:p.score,
        d:p.done,
        me:p.me,
        a:p.avatar,
        id:p.explorerId
    }));
     // Creates leaderboard entries using predefined sample players.
    const a=SEED.map((s,i)=>({
        n:s[0],
        s:s[1],
        d:s[2],
        seed:1,
        a:i%6,
        id:'BMV-'+(20000+i*1357)
    }));
    // Adds registered local players to the leaderboard.
    Object.values(DB.users).forEach(u=>
        a.push({
            n:u.name,
            s:u.score,
            d:u.done.length,
            me:u.key==DB.cur,
            a:u.avatar|0,
            id:u.explorerId
        }));
        // Sorts players from highest score to lowest score.
        return a.sort((x,y)=>y.s-x.s);
    }
    // Initialises the application and checks the backend connection.
    async function init(){
        try{
             // Checks whether the backend server is available.
            const h=await fetch('/api/health');
            if(!h.ok)return;
            
            // Reads the health-check response
            const j=await h.json();

            // Stops if the server or database is unavailable.
            if(!j.ok||!j.db)return;

             // Enables backend API mode.
            S.api=true;
            
            // Requests the currently authenticated player's information.
            const r=await fetch('/api/me');
            
            if(r.ok){

                 // Reads the player information from the server.
                const{user}=await r.json();
                
                 // Prepares the player data.
                const m=mk(user);
                
                 // Stores the player and restores the current session.
                DB.users[m.key]=m;
                DB.cur=m.key
            }else DB.cur=null; // No authenticated player session was found.
            
            loadBoard();  // Loads the leaderboard and refreshes the interface.
            render()
        }catch(e){
             // Handles connection or request errors.
            toast('An error occurred while initializing the application.','bad');
        }
    }
// Handles new player registration.
async function register(){

      // Gets the username and password entered by the player.
    const u=$('un').value.trim(),
    p=$('pw').value;

    if(!/^[A-Za-z0-9_]{3,16}$/.test(u))
         // Validates the username format.
        return toast(
                'Username must be 3 to 16 letters, numbers or _ .',
                'bad'
            );
    if(p.length<8)
        // Checks whether the password contains at least 8 characters.
        return toast('Password needs 8+ characters.','bad');

    if(p!==$('pw2').value)
        // Checks whether both password fields match.
        return toast('Passwords do not match.','bad');
    
    if(!$('tc').checked)
        // Checks whether the player accepted the terms and privacy policy.
        return toast('Please accept the Terms & Privacy Policy.','bad');
    
     // Converts the username to lowercase for consistent lookup.
    const key=u.toLowerCase();

    if(S.api){
        try{ // Sends registration details to the backend.
            const{ok,d}=await apiPost('/api/register',{
                username:u,
                password:p,
                avatar:S.av|0
            });
            if(!ok) // Displays an error if registration fails.
                return toast(
                    d.error||'Could not create the account.',
                    'bad'
                );
                const m=mk(d.user); // Prepares the registered player information.
                DB.users[m.key]=m; // Stores the player information locally.
                DB.cur=m.key; // Sets the newly registered player as the current player.
                save(); // Saves the updated local data.
                
                // Opens the dashboard.
                go('dashboard');
                render();
            }catch(x){  // Handles server connection errors.
                toast('Could not reach the server.','bad')
            }
            return
        }
        // Local fallback: checks whether the username already exists.
        if(DB.users[key])
            return toast('That username is taken.','bad');

            // Creates a new player account using local data.
            DB.users[key]={
                username:u,
                name:u,
                key,
                explorerId:newId(),
                avatar:S.av|0,
                joined:Date.now(),
                pw:btoa(p),
                coins:20,
                lives:3,
                score:0,
                hints:1,
                keys:[],
                unlocked:1,
                done:[]
            };
            DB.cur=key;  // Sets the new player as the current player.
            save(); // Saves the player information
            
            // Navigates to the dashboard.
            go('dashboard');
            render();
        }
    
// Main function responsible for rendering the application interface.
function render(){
     // Checks whether a valid player is currently logged in.
    const c=!!(DB.cur&&DB.users[DB.cur]);
    
    // Gets the current page from the URL hash.
    let p=(location.hash||'#home').slice(1);
    
    // Redirects to the home page if the requested page does not exist.
    if(!pages[p])p='home';
    
    // Prevents logged-out players from accessing protected pages
    if(!c&&(p=='dashboard'||p=='play'))p='login';
    
    // Redirects logged-in players away from login and registration pages.
    if(c&&(p=='login'||p=='register'))p='dashboard';

    // Prevents access to gameplay if no level has been selected.
    if(p=='play'&&!S.lvl)p='dashboard';

    // Creates navigation links and highlights the current page.
    const a=(h,t)=>
        `<a class="${p==h?'on':''}" onclick="go('${h}')">${t}</a>`;
    
    // Generates the navigation bar and main page content.
    $('app').innerHTML=`
        <nav>
            <div class="logo" onclick="go('home')">
            <img src="${IMG2.logo}" alt="">
            <span>
                Banana<br>
                Mystery Vault
            </span>
        </div>
        <div class="links">
            ${a('home','Home')}
            ${a('about','About')}
            ${c?a('dashboard','Dashboard'):''}
            ${a('levels','Levels')}
            ${a('leaderboard','Leaderboard')}
        </div>
        <div class="nr">
            <button class="ghost" id="snd" 
                onclick="toggleSound()" 
                style="padding:6px 14px;font-size:.9rem">
                ${MUTE?'Sound: off':'Sound: on'}
            </button>
           
            <span class="pill">
                <i class=co></i> 
                    ${c?U().coins:0}
                </span>
                ${
                    c
                    ?`<button class="ghost" onclick="logout()">Log out</button>`
                    :`
                        <button class="ghost" onclick="go('login')">Login</button>
                        <button onclick="go('register')">Register</button>
                    `
                }
            </div>
        </nav>
        <main class="wrap ${['home','login','register'].includes(p)?'full':''}">
            ${pages[p](c)}
        </main>
    `;
     // Automatically focuses on an input field on larger screens.
    const f=$('ans')||$('pinin')||$('un');
    if(f&&innerWidth>700)f.focus();
}
// Handles browser back and forward navigation.
addEventListener('hashchange',()=>{
    S.msg='';   // Clears previous messages.
    render();   // Clears previous messages.
    scrollTo(0,0);  // Scrolls the page to the top.

    // Refreshes leaderboard information when required.
    if(S.api&&['#leaderboard','#dashboard'].includes(location.hash))
        loadBoard()
    });


render();
init();
const raw = [
["Mexico","MEX","A",15,0,18,"Quarter-finals",1],["South Africa","RSA","A",61,0,4,"Group stage",0],["Korea Republic","KOR","A",22,0,12,"Fourth place",0],["Czechia","CZE","A",44,0,10,"Runner-up",0],
["Canada","CAN","B",27,0,3,"Group stage",1],["Bosnia & Herzegovina","BIH","B",65,0,2,"Group stage",0],["Qatar","QAT","B",51,0,2,"Group stage",0],["Switzerland","SUI","B",17,0,13,"Quarter-finals",0],
["Brazil","BRA","C",6,5,23,"Champion",0],["Morocco","MAR","C",14,0,7,"Fourth place",0],["Haiti","HAI","C",84,0,2,"Group stage",0],["Scotland","SCO","C",39,0,9,"Group stage",0],
["United States","USA","D",16,0,12,"Third place",1],["Paraguay","PAR","D",37,0,9,"Quarter-finals",0],["Australia","AUS","D",26,0,7,"Round of 16",0],["Türkiye","TUR","D",22,0,3,"Third place",0],
["Germany","GER","E",10,4,21,"Champion",0],["Curaçao","CUW","E",82,0,1,"Debut",0],["Côte d'Ivoire","CIV","E",34,0,4,"Group stage",0],["Ecuador","ECU","E",24,0,5,"Round of 16",0],
["Netherlands","NED","F",7,0,12,"Runner-up",0],["Japan","JPN","F",18,0,8,"Round of 16",0],["Sweden","SWE","F",38,0,13,"Runner-up",0],["Tunisia","TUN","F",44,0,7,"Group stage",0],
["Belgium","BEL","G",8,0,15,"Third place",0],["Egypt","EGY","G",29,0,4,"Group stage",0],["IR Iran","IRN","G",20,0,7,"Group stage",0],["New Zealand","NZL","G",86,0,3,"Group stage",0],
["Spain","ESP","H",2,1,17,"Champion",0],["Cabo Verde","CPV","H",68,0,1,"Debut",0],["Saudi Arabia","KSA","H",60,0,7,"Round of 16",0],["Uruguay","URU","H",11,2,15,"Champion",0],
["France","FRA","I",1,2,17,"Champion",0],["Senegal","SEN","I",19,0,4,"Quarter-finals",0],["Iraq","IRQ","I",58,0,2,"Group stage",0],["Norway","NOR","I",33,0,4,"Round of 16",0],
["Argentina","ARG","J",3,3,19,"Champion",0],["Algeria","ALG","J",36,0,5,"Round of 16",0],["Austria","AUT","J",21,0,8,"Third place",0],["Jordan","JOR","J",66,0,1,"Debut",0],
["Portugal","POR","K",5,0,9,"Third place",0],["Congo DR","COD","K",55,0,2,"Group stage",0],["Uzbekistan","UZB","K",57,0,1,"Debut",0],["Colombia","COL","K",13,0,7,"Quarter-finals",0],
["England","ENG","L",4,1,17,"Champion",0],["Croatia","CRO","L",9,0,7,"Runner-up",0],["Ghana","GHA","L",72,0,5,"Quarter-finals",0],["Panama","PAN","L",33,0,2,"Group stage",0]
].map(([name,code,group,rank,titles,apps,best,host])=>({name,code,group,rank,titles,apps,best,host}));

const groups = Object.groupBy ? Object.groupBy(raw,t=>t.group) : raw.reduce((a,t)=>((a[t.group]??=[]).push(t),a),{});
const weights = {strength:65,history:25,context:10};
const $ = s => document.querySelector(s);
const score = t => {
  const strength = 100 - Math.min(t.rank,100);
  const history = Math.min(100,t.titles*17 + ({Champion:22,"Runner-up":15,"Third place":11,"Fourth place":9,"Quarter-finals":7,"Round of 16":4,"Group stage":1,Debut:0}[t.best]||0));
  const context = Math.min(100,Math.log2(t.apps+1)*17 + t.host*28);
  return strength*weights.strength/100 + history*weights.history/100 + context*weights.context/100;
};
function probs(a,b,knockout=false){
  const d=score(a)-score(b), draw=knockout?0:Math.max(.16,.29-Math.abs(d)*.002);
  const decisive=1-draw, aw=1/(1+Math.pow(10,-d/26));
  return {a:decisive*aw,draw,b:decisive*(1-aw)};
}
const factorial=n=>n<2?1:n*factorial(n-1);
const poisson=(k,lambda)=>Math.exp(-lambda)*Math.pow(lambda,k)/factorial(k);
function scoreModel(a,b,time=0,goalsA=0,goalsB=0){
  const p=probs(a,b), edge=score(a)-score(b), remaining=Math.max(0,1-time/90);
  const total=Math.max(.35,2.55*remaining), lambdaA=Math.max(.12,total*(.5+edge/180)),lambdaB=Math.max(.12,total*(.5-edge/180));
  const lines=[];
  for(let x=0;x<=5;x++)for(let y=0;y<=5;y++)lines.push({a:x+goalsA,b:y+goalsB,p:poisson(x,lambdaA)*poisson(y,lambdaB)});
  lines.sort((x,y)=>y.p-x.p);
  const outcomes=lines.reduce((o,x)=>{o[x.a>x.b?"a":x.a===x.b?"draw":"b"]+=x.p;return o},{a:0,draw:0,b:0});
  return {lines:lines.slice(0,5),lambdaA:lambdaA+goalsA,lambdaB:lambdaB+goalsB,outcomes};
}
function pick(p){const r=Math.random();return r<p.a?"a":r<p.a+p.draw?"draw":"b"}
function populate(){
  ["teamA","teamB"].forEach((id,i)=>{$("#"+id).innerHTML=raw.map((t,n)=>`<option value="${n}" ${n===(i?32:36)?"selected":""}>${t.name} · ${t.code}</option>`).join("")});
  $("#groups").innerHTML=Object.entries(groups).map(([g,ts])=>`<article class="group"><h3>GROUP ${g}</h3>${ts.map(t=>`<button data-code="${t.code}"><span>${t.name}</span><span class="seed">Seed #${t.rank}</span></button>`).join("")}</article>`).join("");
  document.querySelectorAll(".group button").forEach(b=>b.onclick=()=>showTeam(raw.find(t=>t.code===b.dataset.code)));
}
function updateMatch(){
  const a=raw[+$("#teamA").value],b=raw[+$("#teamB").value],p=probs(a,b);
  $("#crestA").textContent=a.code;$("#crestB").textContent=b.code;
  $("#scoreA").textContent=(p.a*100).toFixed(1)+"%";$("#scoreDraw").textContent=(p.draw*100).toFixed(1)+"%";$("#scoreB").textContent=(p.b*100).toFixed(1)+"%";
  const edge=Math.abs(score(a)-score(b)).toFixed(1),fav=score(a)>score(b)?a:b;
  $("#matchExplain").textContent=`${fav.name} leads by ${edge} model points. Host advantage is included, but single-match uncertainty remains high.`;
  const sm=scoreModel(a,b),top=sm.lines[0];
  $("#likelyScore").textContent=`${a.code} ${top.a}–${top.b} ${b.code}`;
  $("#expectedGoals").textContent=`Expected goals: ${sm.lambdaA.toFixed(2)} – ${sm.lambdaB.toFixed(2)}`;
  $("#scorelines").innerHTML=sm.lines.map(x=>`<div class="scoreline"><strong>${x.a}–${x.b}</strong><span>${(x.p*100).toFixed(1)}%</span></div>`).join("");
}
const aliases={"South Korea":"Korea Republic","USA":"United States","United States":"United States","Iran":"IR Iran","Ivory Coast":"Côte d'Ivoire","Cape Verde":"Cabo Verde","Curacao":"Curaçao","Turkey":"Türkiye","DR Congo":"Congo DR"};
const findTeam=name=>raw.find(t=>t.name===name||t.name===aliases[name]);
function livePrediction(event){
  const comp=event.competitions[0],home=comp.competitors.find(x=>x.homeAway==="home"),away=comp.competitors.find(x=>x.homeAway==="away");
  const a=findTeam(home.team.displayName),b=findTeam(away.team.displayName),status=event.status.type,detail=status.shortDetail||status.detail||status.description;
  let minute=0; const match=String(detail).match(/(\d+)'/); if(match)minute=Math.min(90,+match[1]);
  const ga=+home.score||0,gb=+away.score||0,sm=a&&b?scoreModel(a,b,minute,ga,gb):null;
  return `<article class="live-card"><div class="live-top"><span>${new Date(event.date).toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</span><span class="live-status">${detail}</span></div><div class="live-score"><span>${home.team.displayName}</span><strong>${ga}–${gb}</strong><span>${away.team.displayName}</span></div>${sm?`<div class="live-probs"><span>HOME ${(sm.outcomes.a*100).toFixed(0)}%</span><span>DRAW ${(sm.outcomes.draw*100).toFixed(0)}%</span><span>AWAY ${(sm.outcomes.b*100).toFixed(0)}%</span></div>`:""}</article>`;
}
async function updateLive(){
  const dates=[0,1].map(add=>{const d=new Date();d.setDate(d.getDate()+add);return d.toISOString().slice(0,10).replaceAll("-","")});
  try{
    const payloads=await Promise.all(dates.map(d=>fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${d}`).then(r=>{if(!r.ok)throw Error(r.status);return r.json()})));
    const events=payloads.flatMap(x=>x.events||[]).filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i);
    $("#liveMatches").innerHTML=events.length?events.map(livePrediction).join(""):`<div class="live-empty">No World Cup matches scheduled for today or tomorrow.</div>`;
    $("#liveUpdated").textContent=`Auto-refreshes every 60 seconds · Updated ${new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"})}`;
  }catch(e){
    $("#liveMatches").innerHTML=`<div class="live-empty live-error">Live data is temporarily unavailable. The predictor remains active.</div>`;
    $("#liveUpdated").textContent="Live connection unavailable";
  }
}
function playGroup(ts){
  const table=ts.map(t=>({t,pts:0,gd:0}));
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const r=pick(probs(ts[i],ts[j]));if(r==="a"){table[i].pts+=3;table[i].gd++}else if(r==="b"){table[j].pts+=3;table[j].gd++}else{table[i].pts++;table[j].pts++}}
  return table.sort((x,y)=>y.pts-x.pts||y.gd-x.gd||score(y.t)-score(x.t));
}
function knockout(list,counts,key){
  const next=[]; list.sort((a,b)=>score(b)-score(a));
  while(list.length){const a=list.shift(),b=list.pop(),p=probs(a,b,true);next.push(Math.random()<p.a/(p.a+p.b)?a:b)}
  next.forEach(t=>counts[t.code][key]++);return next;
}
function simulate(n=5000){
  const counts=Object.fromEntries(raw.map(t=>[t.code,{r32:0,r16:0,qf:0,sf:0,final:0,win:0}]));
  for(let k=0;k<n;k++){
    const tables=Object.values(groups).map(playGroup),qual=tables.flatMap(x=>x.slice(0,2).map(y=>y.t));
    const thirds=tables.map(x=>x[2]).sort((a,b)=>b.pts-a.pts||b.gd-a.gd||score(b.t)-score(a.t)).slice(0,8).map(x=>x.t); qual.push(...thirds);
    qual.forEach(t=>counts[t.code].r32++);let r=knockout(qual,counts,"r16");r=knockout(r,counts,"qf");r=knockout(r,counts,"sf");r=knockout(r,counts,"final");r=knockout(r,counts,"win");
  }
  const ranked=raw.map(t=>({t,...counts[t.code]})).sort((a,b)=>b.win-a.win);
  $("#ranking").innerHTML=ranked.slice(0,16).map((x,i)=>`<div class="rank-row"><span class="rank-num">${String(i+1).padStart(2,"0")}</span><strong>${x.t.name} <small>${x.t.code}</small></strong><span class="bar"><i style="width:${x.win/ranked[0].win*100}%"></i></span><strong>${(x.win/n*100).toFixed(1)}%</strong></div>`).join("");
  $("#favoriteName").textContent=ranked[0].t.name;$("#favoriteChance").textContent=(ranked[0].win/n*100).toFixed(1)+"%";
}
function showTeam(t){
  $("#dialogContent").innerHTML=`<p class="eyebrow">GROUP ${t.group} · ${t.code}</p><h2 class="dialog-title">${t.name}</h2><div class="stats"><div class="stat"><span>Strength seed</span><strong>#${t.rank}</strong></div><div class="stat"><span>World Cup appearances</span><strong>${t.apps}</strong></div><div class="stat"><span>Titles</span><strong>${t.titles}</strong></div><div class="stat"><span>Best finish</span><strong>${t.best}</strong></div></div><p>Current model score: <strong>${score(t).toFixed(1)}</strong>${t.host?" · Includes host advantage":""}</p>`;
  $("#teamDialog").showModal();
}
["teamA","teamB"].forEach(id=>$("#"+id).onchange=updateMatch);
["strength","history","context"].forEach(k=>$("#"+k+"Weight").oninput=e=>{$("#"+k+"Value").textContent=e.target.value+"%";weights[k]=+e.target.value;updateMatch()});
$("#simulateBtn").onclick=()=>{simulate();updateMatch()};$("#closeDialog").onclick=()=>$("#teamDialog").close();
populate();updateMatch();simulate();updateLive();setInterval(updateLive,60000);

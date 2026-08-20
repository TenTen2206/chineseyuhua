
let currentLesson=null, reviewCards=[], reviewIndex=0, translationIndex=0;
let rememberedSet=new Set(), notRememberedSet=new Set();
let quizState=null;
const $=id=>document.getElementById(id);
const normalize=s=>String(s||"").trim().replace(/[\s，。！？、,.!?；;：“”"'（）()]/g,"");
const escapeHtml=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

const PROGRESS_KEY="yuhua_hsk3_progress_v16";
const REVIEW_KEY="yuhua_hsk3_review_v16";

const HSK_LEVELS = [
  {level:1, title:"HSK 1", status:"coming", desc:"Khung trình độ HSK 1 đã được tạo. Nội dung bài học sẽ được bổ sung khi có dữ liệu nguồn."},
  {level:2, title:"HSK 2", status:"coming", desc:"Khung trình độ HSK 2 đã được tạo. Nội dung bài học sẽ được bổ sung khi có dữ liệu nguồn."},
  {level:3, title:"HSK 3", status:"ready", desc:"Đã có các bài học và bài tập đã nhập: từ vựng, bài khóa, flashcard, dịch câu, điền từ, mini quiz và theo dõi tiến độ."},
  {level:4, title:"HSK 4", status:"coming", desc:"Khung trình độ HSK 4 đã được tạo. Nội dung bài học sẽ được bổ sung khi có dữ liệu nguồn."},
  {level:5, title:"HSK 5", status:"coming", desc:"Khung trình độ HSK 5 đã được tạo. Nội dung bài học sẽ được bổ sung khi có dữ liệu nguồn."},
  {level:6, title:"HSK 6", status:"coming", desc:"Khung trình độ HSK 6 đã được tạo. Nội dung bài học sẽ được bổ sung khi có dữ liệu nguồn."}
];
let selectedHSKLevel = 3;

const totalWords=HSK3_DATA.reduce((s,l)=>s+(l.words?.length||0),0);
const textCount=HSK3_DATA.reduce((s,l)=>s+(l.texts?.length||0),0);
$("globalStat").textContent=`${totalWords} mục từ • ${textCount} bài khóa • v17`;

function loadStore(key){
  try{return JSON.parse(localStorage.getItem(key)||"{}")}catch{return {}}
}
function saveStore(key,data){localStorage.setItem(key,JSON.stringify(data))}
function lessonProgressKey(n){return String(n)}
function getProgressData(){return loadStore(PROGRESS_KEY)}
function setCompleted(n,module,done=true){
  const all=getProgressData();
  const k=lessonProgressKey(n);
  all[k]=all[k]||{};
  if(done) all[k][module]=true; else delete all[k][module];
  saveStore(PROGRESS_KEY,all);
  updateProgressUI();
}
function isCompleted(n,module){
  const all=getProgressData();
  return !!all?.[lessonProgressKey(n)]?.[module];
}
function availableModules(l){
  const mods=["vocab"];
  (l.texts||[]).forEach(t=>mods.push(`text${t.id}`));
  if((l.words||[]).length) mods.push("review");
  if((l.translations||[]).length) mods.push("translate");
  if((l.texts||[]).length) mods.push("fill","quiz");
  return mods;
}
function lessonPercent(l){
  const mods=availableModules(l);
  const done=mods.filter(m=>isCompleted(l.n,m)).length;
  return mods.length?Math.round(done/mods.length*100):0;
}
function updateProgressUI(){
  const allModules=HSK3_DATA.flatMap(l=>availableModules(l).map(m=>[l.n,m]));
  const completed=allModules.filter(([n,m])=>isCompleted(n,m)).length;
  const pct=allModules.length?Math.round(completed/allModules.length*100):0;
  if($("overallProgressText")) $("overallProgressText").textContent=`${pct}% hoàn thành`;
  if($("overallProgressBar")) $("overallProgressBar").style.width=`${pct}%`;
  if(currentLesson && $("lessonProgressText")){
    const lp=lessonPercent(currentLesson);
    $("lessonProgressText").textContent=`${lp}%`;
    $("lessonProgressBar").style.width=`${lp}%`;
  }
  renderLessons();
  updateModuleCompletionBadges();
}
function updateModuleCompletionBadges(){
  if(!currentLesson)return;
  document.querySelectorAll("[data-module]").forEach(btn=>{
    const mod=btn.dataset.module;
    btn.classList.toggle("module-done",isCompleted(currentLesson.n,mod));
    let check=btn.querySelector(".module-check");
    if(isCompleted(currentLesson.n,mod)){
      if(!check){
        check=document.createElement("em");
        check.className="module-check";
        check.textContent="✓ Đã học";
        btn.appendChild(check);
      }
    }else if(check) check.remove();
  });
}

function statusText(l){
  if(l.sourceUnavailable) return `<span class="badge missing">Chưa có nội dung</span>`;
  if(l.n===15) return `<span class="badge partial">Có 3/4 bài khóa</span>`;
  return `<span class="badge complete">✓ 4/4 bài khóa</span>`;
}
function renderLessons(){
  const container=$("levelContent");
  if(!container)return;

  if(selectedHSKLevel!==3){
    const lvl=HSK_LEVELS.find(x=>x.level===selectedHSKLevel);
    container.innerHTML=`
      <div class="coming-level">
        <div class="coming-icon">📚</div>
        <h3>${lvl.title} đang được chuẩn bị</h3>
        <p>${escapeHtml(lvl.desc)}</p>
        <div class="coming-note">
          Website hiện chưa có dữ liệu nguồn cho ${lvl.title}, vì vậy nội dung chưa được tự tạo để tránh sai lệch giáo trình.
        </div>
      </div>`;
    return;
  }

  container.innerHTML=`<h2 class="lesson-heading">Các bài HSK 3</h2><div id="lessonGrid" class="lesson-grid"></div>`;
  const grid=$("lessonGrid");
  if(!grid)return;
  grid.innerHTML=HSK3_DATA.map(l=>{
    const pct=lessonPercent(l);
    return `<button class="lesson-card" onclick="openLesson(${l.n})">
      <div class="lesson-num">BÀI ${l.n}</div>
      <h3>${escapeHtml(l.title)}</h3>
      ${statusText(l)}
      <div class="muted" style="margin-top:8px">${l.words?.length||0} từ • ${l.texts?.length||0}/4 bài khóa</div>
      <div class="lesson-progress-mini">
        <span>${pct}%</span><div class="progress-track small"><div class="progress-bar" style="width:${pct}%"></div></div>
      </div>
    </button>`;
  }).join("");
}

function renderLevelGrid(){
  const grid=$("levelGrid");
  if(!grid)return;
  grid.innerHTML=HSK_LEVELS.map(l=>`
    <button class="level-card ${selectedHSKLevel===l.level?"active":""} ${l.status==="ready"?"ready":""}"
      onclick="selectHSKLevel(${l.level})">
      <div class="level-number">${l.level}</div>
      <div class="level-card-body">
        <b>${l.title}</b>
        <small>${l.status==="ready"?"Đã có nội dung":"Đang cập nhật"}</small>
      </div>
      <span class="level-status-dot"></span>
    </button>`).join("");
}

window.selectHSKLevel=level=>{
  selectedHSKLevel=level;
  const lvl=HSK_LEVELS.find(x=>x.level===level);

  $("selectedLevelTitle").textContent=lvl.title;
  $("selectedLevelDesc").textContent=lvl.desc;
  $("selectedLevelKicker").textContent="Trình độ đang chọn";

  const status=$("selectedLevelStatus");
  if(lvl.status==="ready"){
    status.className="badge complete";
    status.textContent="✓ Đã có nội dung";
    $("hsk3ProgressWrap").style.display="";
  }else{
    status.className="badge partial";
    status.textContent="Đang cập nhật";
    $("hsk3ProgressWrap").style.display="none";
  }

  renderLevelGrid();
  renderLessons();
  window.scrollTo({top:$("selectedLevelPanel").offsetTop-20,behavior:"smooth"});
};

window.openLesson=n=>{
  selectedHSKLevel=3;
  currentLesson=HSK3_DATA.find(x=>x.n===n);
  reviewIndex=0;translationIndex=0;
  $("home").classList.remove("active");$("lesson").classList.add("active");
  $("lessonNo").textContent=`BÀI ${currentLesson.n} • HSK 3`;
  $("lessonTitle").textContent=currentLesson.title;
  $("lessonStatus").innerHTML=`
    ${statusText(currentLesson)}
    <div class="lesson-progress-box">
      <span>Tiến độ bài này: <b id="lessonProgressText">${lessonPercent(currentLesson)}%</b></span>
      <div class="progress-track"><div id="lessonProgressBar" class="progress-bar" style="width:${lessonPercent(currentLesson)}%"></div></div>
    </div>`;
  $("lessonBreadcrumb").textContent=`HSK 3 / Bài ${currentLesson.n}`;
  showModule("vocab");
  updateModuleCompletionBadges();
  window.scrollTo({top:0,behavior:"smooth"});
};
$("backBtn").onclick=()=>{
  $("lesson").classList.remove("active");
  $("home").classList.add("active");
  updateProgressUI();
  window.scrollTo({top:0,behavior:"smooth"});
};
document.querySelectorAll("[data-module]").forEach(b=>b.onclick=()=>showModule(b.dataset.module));

function unavailable(){
  $("moduleContent").innerHTML=`<div class="empty-state"><b>Phần này hiện chưa có dữ liệu.</b></div>`;
}
function completionButton(mod){
  const done=isCompleted(currentLesson.n,mod);
  return `<button class="${done?"done-btn":"secondary"}" onclick="toggleComplete('${mod}')">${done?"✓ Đã hoàn thành":"✓ Đánh dấu đã học"}</button>`;
}
window.toggleComplete=mod=>{
  const next=!isCompleted(currentLesson.n,mod);
  setCompleted(currentLesson.n,mod,next);
  if(/^text/.test(mod)) renderText(Number(mod.slice(-1)));
  else if(mod==="vocab") renderVocab();
};

function showModule(mod){
  if(!currentLesson)return;
  if(currentLesson.sourceUnavailable && mod!=="vocab") return unavailable();
  if(mod==="vocab")return renderVocab();
  if(/^text[1-4]$/.test(mod))return renderText(Number(mod.slice(-1)));
  if(mod==="review")return setupReview();
  if(mod==="translate")return renderTranslation();
  if(mod==="fill")return renderFill();
  if(mod==="quiz")return renderQuiz();
}

/* ---------- vocabulary examples ---------- */
function coreWord(hanzi){
  return String(hanzi||"").replace(/[（(].*?[）)]/g,"").trim();
}
function findExampleForWord(w){
  const key=coreWord(w.hanzi);
  const lines=[];
  (currentLesson.texts||[]).forEach(t=>{
    String(t.content||"").split(/\n+/).forEach(line=>lines.push(line.trim()));
  });
  (currentLesson.translations||[]).forEach(x=>lines.push(String(x.zh||"").trim()));
  const hit=lines.find(line=>key && line.includes(key));
  if(hit)return hit;
  if(key==="草地")return "孩子们在草地上玩儿。";
  return `我正在学习“${key}”这个词。`;
}
function renderVocab(){
  const words=currentLesson.words||[];
  if(!words.length)return unavailable();
  $("moduleContent").innerHTML=`
    <div class="text-head">
      <div><h3>Từ vựng</h3><div class="muted">${words.length} mục từ • mỗi từ có ví dụ ngắn</div></div>
      ${completionButton("vocab")}
    </div>
    <div class="word-list">
      ${words.map((w,i)=>{
        const ex=findExampleForWord(w);
        return `<div class="word-row vocab-rich">
          <div class="muted">${i+1}</div>
          <div class="hanzi">${escapeHtml(w.hanzi)}</div>
          <div class="pinyin">${escapeHtml(w.pinyin)}</div>
          <div class="vi">${escapeHtml(w.vi)}</div>
          <div class="audio-pair">
            <button class="speak mini" onclick='speak(${JSON.stringify(w.hanzi)},"slow")'>🔊 Chậm</button>
            <button class="speak mini" onclick='speak(${JSON.stringify(w.hanzi)},"normal")'>▶ Chuẩn</button>
          </div>
          <div class="word-example"><b>例：</b>${escapeHtml(ex)}</div>
        </div>`;
      }).join("")}
    </div>`;
}

/* ---------- text + pinyin toggle ---------- */
function pinyinForText(text){
  if(!window.pinyinPro?.pinyin)return "";
  try{
    return String(text).split(/\n/).map(line=>{
      const py=window.pinyinPro.pinyin(line,{toneType:"symbol"});
      return `<div class="pinyin-line">${escapeHtml(py)}</div>`;
    }).join("");
  }catch{return ""}
}
function renderText(id){
  const t=(currentLesson.texts||[]).find(x=>x.id===id);
  if(!t){
    $("moduleContent").innerHTML=`<div class="empty-state"><b>Bài khóa ${id} hiện chưa có nội dung.</b></div>`;
    return;
  }
  const py=pinyinForText(t.content);
  $("moduleContent").innerHTML=`
    <div class="text-head">
      <div><h3>${escapeHtml(t.title)}</h3><div class="muted">Đọc trước không pinyin, chỉ bật khi cần kiểm tra.</div></div>
      <div class="text-actions">
        <button class="secondary" onclick="togglePinyin()">拼音 Hiện / Ẩn</button>
        <button class="speak" onclick='speak(${JSON.stringify(t.content.replace(/\n/g," "))},"slow")'>🔊 Chậm</button>
        <button class="speak" onclick='speak(${JSON.stringify(t.content.replace(/\n/g," "))},"normal")'>▶ Bình thường</button>
        ${completionButton(`text${id}`)}
      </div>
    </div>
    <div id="pinyinBlock" class="pinyin-block hidden">
      ${py||'<div class="muted">Không tải được công cụ pinyin. Hãy kiểm tra kết nối mạng rồi thử lại.</div>'}
    </div>
    <div class="textbook-text">${escapeHtml(t.content)}</div>`;
}
window.togglePinyin=()=>{
  const block=$("pinyinBlock");
  if(block)block.classList.toggle("hidden");
};

/* ---------- flashcard self-check ---------- */
function reviewStorage(){
  const all=loadStore(REVIEW_KEY);
  const k=lessonProgressKey(currentLesson.n);
  all[k]=all[k]||{remembered:[],notRemembered:[]};
  return {all,k,item:all[k]};
}
function loadReviewState(){
  const {item}=reviewStorage();
  rememberedSet=new Set(item.remembered||[]);
  notRememberedSet=new Set(item.notRemembered||[]);
}
function saveReviewState(){
  const {all,k}=reviewStorage();
  all[k]={remembered:[...rememberedSet],notRemembered:[...notRememberedSet]};
  saveStore(REVIEW_KEY,all);
}
function makeReviewCards(){
  return (currentLesson.words||[]).filter(w=>w.hanzi).map(w=>({
    hanzi:w.hanzi,pinyin:w.pinyin||"",vi:w.vi||""
  }));
}
function setupReview(){
  reviewCards=makeReviewCards();
  reviewIndex=0;
  loadReviewState();
  if(!reviewCards.length){
    $("moduleContent").innerHTML='<div class="empty-state">Chưa có từ vựng để tạo flashcard.</div>';
    return;
  }
  renderReviewCard(false);
}
function reviewCounts(){
  return {remembered:rememberedSet.size,notRemembered:notRememberedSet.size,total:reviewCards.length};
}
function renderReviewCard(showBack=false){
  const x=reviewCards[reviewIndex], c=reviewCounts();
  $("moduleContent").innerHTML=`
    <div class="exercise-wrap">
      <div class="progress">Flashcard ${reviewIndex+1}/${reviewCards.length}</div>
      <h3>Ôn tập từ vựng</h3>
      <p class="exercise-sub">Lật thẻ để kiểm tra. Sau đó chọn <b>Nhớ rồi</b> hoặc <b>Chưa nhớ</b>. Những từ chưa nhớ có thể được lọc để ôn lại.</p>

      <div class="memory-summary">
        <span class="memory-good">✓ Nhớ rồi: ${c.remembered}</span>
        <span class="memory-bad">↻ Chưa nhớ: ${c.notRemembered}</span>
        <span>Còn lại: ${Math.max(c.total-c.remembered-c.notRemembered,0)}</span>
      </div>

      <div class="card-stage">
        <div id="flipCard" class="flip-card ${showBack?'is-flipped':''}" onclick="flipReview()">
          <div class="flip-card-inner">
            <div class="flip-face flip-front">
              <div class="flash-label">Mặt trước</div>
              <div class="flash-hanzi">${escapeHtml(x.hanzi)}</div>
              <div class="face-help">Nhìn chữ Hán và đoán cách đọc + nghĩa</div>
            </div>
            <div class="flip-face flip-back">
              <div class="flash-label">Mặt sau</div>
              <div class="flash-hanzi small">${escapeHtml(x.hanzi)}</div>
              <div class="flash-pinyin">${escapeHtml(x.pinyin)}</div>
              <div class="flash-meaning">${escapeHtml(x.vi)}</div>
              <div class="audio-pair center">
                <button class="speak" onclick='event.stopPropagation();speak(${JSON.stringify(x.hanzi)},"slow")'>🔊 Chậm</button>
                <button class="speak" onclick='event.stopPropagation();speak(${JSON.stringify(x.hanzi)},"normal")'>▶ Chuẩn</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="memory-buttons">
        <button class="remember-btn" onclick="markRemembered()">✓ Nhớ rồi</button>
        <button class="forget-btn" onclick="markNotRemembered()">↻ Chưa nhớ</button>
      </div>

      <div class="controls">
        <button class="secondary" onclick="prevReview()">← Trước</button>
        <button class="secondary" onclick="flipReview()">Lật thẻ</button>
        <button class="secondary" onclick="nextReview()">Tiếp →</button>
        <button class="secondary" onclick="reviewOnlyForgotten()">Ôn từ chưa nhớ</button>
        <button class="secondary" onclick="shuffleReview()">🔀 Trộn thẻ</button>
      </div>
    </div>`;
}
window.flipReview=()=>{$("flipCard")?.classList.toggle("is-flipped")};
window.nextReview=()=>{reviewIndex=(reviewIndex+1)%reviewCards.length;renderReviewCard(false)};
window.prevReview=()=>{reviewIndex=(reviewIndex-1+reviewCards.length)%reviewCards.length;renderReviewCard(false)};
window.shuffleReview=()=>{
  for(let i=reviewCards.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [reviewCards[i],reviewCards[j]]=[reviewCards[j],reviewCards[i]];
  }
  reviewIndex=0;renderReviewCard(false);
};
window.markRemembered=()=>{
  const h=reviewCards[reviewIndex].hanzi;
  rememberedSet.add(h);notRememberedSet.delete(h);saveReviewState();
  if(rememberedSet.size===makeReviewCards().length)setCompleted(currentLesson.n,"review",true);
  nextReview();
};
window.markNotRemembered=()=>{
  const h=reviewCards[reviewIndex].hanzi;
  notRememberedSet.add(h);rememberedSet.delete(h);saveReviewState();
  setCompleted(currentLesson.n,"review",false);
  nextReview();
};
window.reviewOnlyForgotten=()=>{
  const all=makeReviewCards();
  const filtered=all.filter(x=>notRememberedSet.has(x.hanzi));
  reviewCards=filtered.length?filtered:all;
  reviewIndex=0;renderReviewCard(false);
};

/* ---------- translation: phrase-group comparison ---------- */
function renderTranslation(){
  const set=currentLesson.translations||[];
  if(!set.length)return unavailable();
  const x=set[translationIndex];
  $("moduleContent").innerHTML=`
    <div class="exercise-wrap">
      <div class="progress">Câu ${translationIndex+1}/${set.length}</div>
      <h3>Dịch câu Việt → Trung</h3>
      <p class="exercise-sub">
        Sau khi dịch, bấm <b>So sánh với đáp án gợi ý</b>.
        <b>Màu đen = phần trùng với đáp án gợi ý</b>; <b class="red-note">màu đỏ = phần khác đáp án gợi ý</b>.
        <br><strong>Câu khác đáp án vẫn có thể đúng về ngữ pháp và ý nghĩa.</strong>
      </p>
      <div class="translate-prompt">${escapeHtml(x.vi)}</div>
      <textarea id="translationInput" class="textarea" placeholder="Nhập câu tiếng Trung của bạn..."></textarea>
      <div class="controls">
        <button class="primary" onclick="compareTranslation()">So sánh với đáp án gợi ý</button>
        <button class="secondary" onclick="showTranslation()">Xem đáp án gợi ý</button>
        <button class="secondary" onclick="nextTranslation()">Câu tiếp theo</button>
      </div>
      <div id="translationFeedback" class="feedback"></div>
      <div id="comparisonResult" class="comparison-result hidden"></div>
    </div>`;
}
function lcsDiff(student,reference){
  const a=[...student],b=[...reference],m=a.length,n=b.length;
  const dp=Array.from({length:m+1},()=>Array(n+1).fill(0));
  for(let i=m-1;i>=0;i--)for(let j=n-1;j>=0;j--)
    dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
  let i=0,j=0;const studentParts=[],refParts=[];
  while(i<m&&j<n){
    if(a[i]===b[j]){studentParts.push({char:a[i],match:true});refParts.push({char:b[j],match:true});i++;j++}
    else if(dp[i+1][j]>=dp[i][j+1])studentParts.push({char:a[i++],match:false});
    else refParts.push({char:b[j++],match:false});
  }
  while(i<m)studentParts.push({char:a[i++],match:false});
  while(j<n)refParts.push({char:b[j++],match:false});
  return {studentParts,refParts};
}
function groupDiff(parts){
  const groups=[];
  for(const p of parts){
    const last=groups[groups.length-1];
    if(last&&last.match===p.match)last.text+=p.char;
    else groups.push({match:p.match,text:p.char});
  }
  return groups;
}
function renderDiff(parts){
  return groupDiff(parts).map(g=>`<span class="${g.match?"diff-match":"diff-mismatch"}">${escapeHtml(g.text)}</span>`).join("");
}
window.compareTranslation=()=>{
  const x=currentLesson.translations[translationIndex];
  const user=$("translationInput").value.trim(),box=$("comparisonResult");
  if(!user){box.classList.remove("hidden");box.innerHTML='<div class="comparison-warning">Hãy nhập câu dịch trước.</div>';return}
  const diff=lcsDiff(user,x.zh);
  const total=Math.max([...x.zh].length,1);
  const matched=diff.refParts.filter(p=>p.match).length;
  const score=Math.round(matched/total*100);
  box.classList.remove("hidden");
  box.innerHTML=`
    <div class="comparison-card">
      <div class="comparison-title">Câu của bạn</div>
      <div class="comparison-line">${renderDiff(diff.studentParts)}</div>
    </div>
    <div class="comparison-card answer-card">
      <div class="comparison-title">Đáp án gợi ý</div>
      <div class="comparison-line">${renderDiff(diff.refParts)}</div>
    </div>
    <div class="comparison-legend">
      <span><i class="legend-dot black"></i> Trùng đáp án gợi ý</span>
      <span><i class="legend-dot red"></i> Khác đáp án gợi ý</span>
    </div>
    <div class="comparison-score">Mức độ trùng với đáp án gợi ý: <b>${score}%</b></div>
    <div class="translation-caution">⚠️ Đây là công cụ đối chiếu đáp án, không phải chấm ngữ pháp. Một cách dịch khác vẫn có thể đúng.</div>`;
  setCompleted(currentLesson.n,"translate",true);
};
window.showTranslation=()=>{
  const x=currentLesson.translations[translationIndex];
  $("translationFeedback").className="feedback";
  $("translationFeedback").innerHTML=`<b>Đáp án gợi ý:</b><br>${escapeHtml(x.zh)}`;
};
window.nextTranslation=()=>{
  translationIndex=(translationIndex+1)%currentLesson.translations.length;
  renderTranslation();
};

/* ---------- fill ---------- */
function blankPassage(text,targets){
  let r=text;targets.forEach((t,i)=>r=r.replace(t,`[[${i+1}]]`));
  return escapeHtml(r).replace(/\[\[(\d+)\]\]/g,'<span class="gap">[$1] ______</span>');
}
function renderFill(selectedId){
  const texts=currentLesson.texts||[];if(!texts.length)return unavailable();
  const id=Number(selectedId||texts[0].id),t=texts.find(x=>x.id===id)||texts[0],targets=t.targets.slice(0,10);
  const bank=[...targets].sort(()=>Math.random()-.5);
  $("moduleContent").innerHTML=`
  <div class="exercise-wrap">
    <div class="fill-toolbar"><b>Chọn bài khóa:</b><select onchange="renderFill(this.value)">${texts.map(x=>`<option value="${x.id}" ${x.id===t.id?"selected":""}>Bài khóa ${x.id}</option>`).join("")}</select></div>
    <h3>Điền từ vào Bài khóa ${t.id}</h3>
    <p class="exercise-sub">Điền 10 từ/cụm từ còn thiếu, sau đó kiểm tra.</p>
    <div class="answer-bank"><b>Ngân hàng từ:</b> ${bank.map(x=>`<span>${escapeHtml(x)}</span>`).join("")}</div>
    <div class="fill-passage">${blankPassage(t.content,targets)}</div>
    <div class="gap-inputs">${targets.map((_,i)=>`<label class="gap-row"><span class="gap-num">${i+1}</span><input id="gap${i}" placeholder="Từ số ${i+1}"></label>`).join("")}</div>
    <div class="controls"><button class="primary" onclick="checkFill(${t.id})">Kiểm tra 10 từ</button><button class="secondary" onclick="showFillAnswers(${t.id})">Xem đáp án</button></div>
    <div id="fillFeedback" class="feedback"></div>
  </div>`;
}
window.renderFill=renderFill;
window.checkFill=id=>{
  const t=currentLesson.texts.find(x=>x.id===Number(id)),targets=t.targets.slice(0,10);
  let correct=0;
  targets.forEach((a,i)=>{
    const inp=$(`gap${i}`),ok=normalize(inp.value)===normalize(a);
    if(ok)correct++;inp.style.borderColor=ok?"#22c55e":"#ef4444";
  });
  $("fillFeedback").className="feedback "+(correct===10?"ok":"bad");
  $("fillFeedback").textContent=`Bạn đúng ${correct}/10 từ.`;
  setCompleted(currentLesson.n,"fill",true);
};
window.showFillAnswers=id=>{
  const t=currentLesson.texts.find(x=>x.id===Number(id));
  $("fillFeedback").className="feedback";
  $("fillFeedback").innerHTML=`<b>Đáp án:</b> ${t.targets.slice(0,10).map((x,i)=>`${i+1}. ${escapeHtml(x)}`).join(" · ")}`;
};

/* ---------- mini quiz ---------- */
function sample(arr,n){return [...arr].sort(()=>Math.random()-.5).slice(0,n)}
function uniqueChoices(correct,pool,n=4){
  const others=[...new Set(pool.filter(x=>x!==correct))];
  return sample(others,n-1).concat(correct).sort(()=>Math.random()-.5);
}
function makeQuiz(){
  const words=currentLesson.words||[],texts=currentLesson.texts||[];
  const questions=[];
  const selected=sample(words,6);
  selected.slice(0,3).forEach(w=>questions.push({
    type:"meaning",
    prompt:`“${w.hanzi}” nghĩa là gì?`,
    answer:w.vi,
    choices:uniqueChoices(w.vi,words.map(x=>x.vi))
  }));
  selected.slice(3,5).forEach(w=>questions.push({
    type:"pinyin",
    prompt:`Pinyin đúng của “${w.hanzi}” là:`,
    answer:w.pinyin,
    choices:uniqueChoices(w.pinyin,words.map(x=>x.pinyin))
  }));
  const targetPool=texts.flatMap(t=>(t.targets||[]).map(x=>({text:t.content,target:x})));
  sample(targetPool,3).forEach(item=>{
    const sentence=item.text.split(/\n/).find(line=>line.includes(item.target))||item.text;
    const blank=sentence.replace(item.target,"______");
    const allTargets=texts.flatMap(t=>t.targets||[]);
    questions.push({
      type:"cloze",
      prompt:`Chọn từ phù hợp: ${blank}`,
      answer:item.target,
      choices:uniqueChoices(item.target,allTargets)
    });
  });
  return sample(questions,8);
}
function renderQuiz(){
  if(!(currentLesson.texts||[]).length)return unavailable();
  quizState={questions:makeQuiz()};
  $("moduleContent").innerHTML=`
    <div class="exercise-wrap">
      <h3>🏁 Mini quiz cuối bài</h3>
      <p class="exercise-sub">8 câu tổng hợp: nghĩa từ vựng, pinyin và điền từ theo bài khóa.</p>
      <div class="quiz-list">
        ${quizState.questions.map((q,i)=>`
          <div class="quiz-q" id="quizq${i}">
            <div class="quiz-number">Câu ${i+1}</div>
            <div class="quiz-prompt">${escapeHtml(q.prompt)}</div>
            <div class="quiz-choices">
              ${q.choices.map((c,j)=>`
                <label class="quiz-choice">
                  <input type="radio" name="q${i}" value="${escapeHtml(c)}">
                  <span>${escapeHtml(c)}</span>
                </label>`).join("")}
            </div>
          </div>`).join("")}
      </div>
      <div class="controls"><button class="primary" onclick="submitQuiz()">Nộp bài</button><button class="secondary" onclick="renderQuiz()">Làm bộ câu hỏi mới</button></div>
      <div id="quizResult"></div>
    </div>`;
}
window.renderQuiz=renderQuiz;
window.submitQuiz=()=>{
  let correct=0,answered=0;
  quizState.questions.forEach((q,i)=>{
    const chosen=document.querySelector(`input[name="q${i}"]:checked`);
    const card=$(`quizq${i}`);
    if(chosen){answered++;if(chosen.value===q.answer){correct++;card.classList.add("quiz-correct")}else card.classList.add("quiz-wrong")}
    if(!chosen||chosen.value!==q.answer){
      const note=document.createElement("div");
      note.className="quiz-answer";
      note.textContent=`Đáp án: ${q.answer}`;
      card.appendChild(note);
    }
  });
  const pct=Math.round(correct/quizState.questions.length*100);
  $("quizResult").innerHTML=`<div class="quiz-result-box"><b>${correct}/${quizState.questions.length} câu đúng (${pct}%)</b><br>${answered<quizState.questions.length?`Bạn còn ${quizState.questions.length-answered} câu chưa trả lời.`:"Đã hoàn thành mini quiz."}</div>`;
  setCompleted(currentLesson.n,"quiz",true);
};

/* ---------- speech: female Mandarin + 2 speeds ---------- */
let yuhuaChineseVoice=null,yuhuaVoicesLoaded=false;
function chooseChineseFemaleVoice(){
  if(!("speechSynthesis" in window))return null;
  const voices=speechSynthesis.getVoices()||[];
  if(!voices.length)return null;
  const preferred=["Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)","Microsoft Xiaoxiao","Xiaoxiao","Ting-Ting","Tingting","Mei-Jia","Meijia","Sin-Ji","Google 普通话（中国大陆）","Google 普通话"];
  for(const wanted of preferred){
    const found=voices.find(v=>String(v.name||"").toLowerCase().includes(wanted.toLowerCase()));
    if(found)return found;
  }
  const zhCN=voices.filter(v=>/^zh[-_]CN$/i.test(v.lang||"")||String(v.lang||"").toLowerCase().startsWith("zh-cn"));
  const hinted=zhCN.find(v=>["xiaoxiao","ting","mei","female","woman","女","普通话"].some(h=>String(v.name||"").toLowerCase().includes(h)));
  return hinted||zhCN[0]||voices.find(v=>/^zh/i.test(v.lang||""))||null;
}
function refreshChineseVoice(){yuhuaChineseVoice=chooseChineseFemaleVoice();yuhuaVoicesLoaded=true}
if("speechSynthesis" in window){refreshChineseVoice();speechSynthesis.onvoiceschanged=refreshChineseVoice}
function speak(text,speed="slow"){
  if(!("speechSynthesis" in window)){alert("Trình duyệt này chưa hỗ trợ phát âm.");return}
  const raw=String(text||"").trim();if(!raw)return;
  speechSynthesis.cancel();
  if(!yuhuaVoicesLoaded||!yuhuaChineseVoice)refreshChineseVoice();
  const chunks=raw.replace(/\s+/g," ").match(/[^。！？!?；;，,]+[。！？!?；;，,]?/g)||[raw];
  let index=0;
  const speakNext=()=>{
    if(index>=chunks.length)return;
    const part=chunks[index++].trim();if(!part){speakNext();return}
    const u=new SpeechSynthesisUtterance(part);
    u.lang="zh-CN";if(yuhuaChineseVoice)u.voice=yuhuaChineseVoice;
    u.rate=speed==="normal"?0.95:0.72;
    u.pitch=1.03;u.volume=1;
    u.onend=()=>setTimeout(speakNext,speed==="normal"?80:140);
    u.onerror=()=>setTimeout(speakNext,100);
    speechSynthesis.speak(u);
  };
  speakNext();
}
window.speak=speak;

/* ---------- search ---------- */
$("globalSearch").oninput=e=>{
  const q=e.target.value.trim().toLowerCase();
  if(!q){$("searchResults").classList.add("hidden");return}
  const hits=[];
  HSK3_DATA.forEach(l=>(l.words||[]).forEach(w=>{
    if(`${w.hanzi} ${w.pinyin} ${w.vi}`.toLowerCase().includes(q))hits.push({l,w})
  }));
  $("searchResults").classList.remove("hidden");
  $("searchResults").innerHTML=hits.length?hits.slice(0,80).map(x=>`<div class="search-hit"><b>Bài ${x.l.n}</b><span class="hanzi">${escapeHtml(x.w.hanzi)}</span><span class="pinyin">${escapeHtml(x.w.pinyin)}</span><span>${escapeHtml(x.w.vi)}</span></div>`).join(""):'<div class="muted">Không tìm thấy.</div>';
};
$("clearSearch").onclick=()=>{$("globalSearch").value="";$("searchResults").classList.add("hidden")};
if($("resetProgressBtn")) $("resetProgressBtn").onclick=()=>{
  if(confirm("Xóa toàn bộ tiến độ học đã lưu trên thiết bị này?")){
    localStorage.removeItem(PROGRESS_KEY);
    localStorage.removeItem(REVIEW_KEY);
    updateProgressUI();
  }
};

renderLevelGrid();
selectHSKLevel(3);
updateProgressUI();


let currentLesson=null, reviewCards=[], reviewIndex=0, translationIndex=0;
const $=id=>document.getElementById(id);
const normalize=s=>String(s||"").trim().replace(/[\s，。！？、,.!?；;：“”"'（）()]/g,"");
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const totalWords=HSK3_DATA.reduce((s,l)=>s+(l.words?.length||0),0);
const textCount=HSK3_DATA.reduce((s,l)=>s+(l.texts?.length||0),0);
$("globalStat").textContent=`${totalWords} mục từ • ${textCount} bài khóa • v4`;

function statusText(l){
  if(l.sourceUnavailable) return `<span class="badge missing">PDF chưa có nội dung</span>`;
  if(l.n===15) return `<span class="badge partial">PDF có 3/4 bài khóa</span>`;
  return `<span class="badge complete">✓ 4/4 bài khóa</span>`;
}
function renderLessons(){
  $("lessonGrid").innerHTML=HSK3_DATA.map(l=>`<button class="lesson-card" onclick="openLesson(${l.n})">
    <div class="lesson-num">BÀI ${l.n}</div><h3>${escapeHtml(l.title)}</h3>${statusText(l)}
    <div class="muted" style="margin-top:8px">${l.words?.length||0} từ • ${l.texts?.length||0}/4 bài khóa</div></button>`).join("");
}
window.openLesson=n=>{
  currentLesson=HSK3_DATA.find(x=>x.n===n);reviewIndex=0;translationIndex=0;
  $("home").classList.remove("active");$("lesson").classList.add("active");
  $("lessonNo").textContent=`BÀI ${currentLesson.n} • HSK 3`;$("lessonTitle").textContent=currentLesson.title;
  $("lessonStatus").innerHTML=statusText(currentLesson)+(currentLesson.sourceNote?`<div class="muted" style="margin-top:8px">${escapeHtml(currentLesson.sourceNote)}</div>`:"");
  $("lessonBreadcrumb").textContent=`HSK 3 / Bài ${currentLesson.n}`;showModule("vocab");window.scrollTo({top:0,behavior:"smooth"});
};
$("backBtn").onclick=()=>{$("lesson").classList.remove("active");$("home").classList.add("active");window.scrollTo({top:0,behavior:"smooth"})};
document.querySelectorAll("[data-module]").forEach(b=>b.onclick=()=>showModule(b.dataset.module));

function unavailable(){ $("moduleContent").innerHTML=`<div class="source-note"><b>Chưa có dữ liệu trong nguồn đính kèm.</b><br>${escapeHtml(currentLesson.sourceNote||"")}</div>`; }
function showModule(mod){
  if(!currentLesson)return;if(currentLesson.sourceUnavailable && mod!=="vocab") return unavailable();
  if(mod==="vocab")return renderVocab();
  if(/^text[1-4]$/.test(mod))return renderText(Number(mod.slice(-1)));
  if(mod==="review")return setupReview();
  if(mod==="translate")return renderTranslation();
  if(mod==="fill")return renderFill();
}
function renderVocab(){
  const words=currentLesson.words||[];if(!words.length)return unavailable();
  $("moduleContent").innerHTML=`<div class="text-head"><div><h3>Từ vựng</h3><div class="muted">${words.length} mục từ</div></div></div>
    <div class="word-list">${words.map((w,i)=>`<div class="word-row"><div class="muted">${i+1}</div><div class="hanzi">${escapeHtml(w.hanzi)}</div><div class="pinyin">${escapeHtml(w.pinyin)}</div><div class="vi">${escapeHtml(w.vi)}</div><button class="speak" onclick='speak(${JSON.stringify(w.hanzi)})'>🔊</button></div>`).join("")}</div>`;
}
function renderText(id){
  const t=(currentLesson.texts||[]).find(x=>x.id===id);
  if(!t){$("moduleContent").innerHTML=`<div class="source-note"><b>Bài khóa ${id} chưa có trong PDF đính kèm.</b><br>${escapeHtml(currentLesson.sourceNote||"")}</div>`;return;}
  $("moduleContent").innerHTML=`<div class="text-head"><div><h3>${t.title}</h3><div class="muted">Theo giáo trình đính kèm</div></div><button class="speak" onclick='speak(${JSON.stringify(t.content.replace(/\n/g," "))})'>🔊 Đọc</button></div><div class="textbook-text">${escapeHtml(t.content)}</div>`;
}

function makeReviewCards(){
  const cards=[];
  for(const t of currentLesson.texts||[]){
    const pieces=t.content.split(/\n|(?<=[。！？])/).map(s=>s.trim()).filter(Boolean);
    for(const target of t.targets||[]){
      const sentence=pieces.find(s=>s.includes(target))||"";
      if(sentence)cards.push({textId:t.id,target,context:sentence.replace(target,"____")});
    }
  }
  return cards;
}
function setupReview(){reviewCards=makeReviewCards();reviewIndex=0;if(!reviewCards.length)return unavailable();renderReviewCard();}
function renderReviewCard(){
  const x=reviewCards[reviewIndex];
  $("moduleContent").innerHTML=`<div class="exercise-wrap"><div class="progress">Flashcard ${reviewIndex+1}/${reviewCards.length} • Bài khóa ${x.textId}</div>
  <h3>Ôn tập từ vựng bằng ngữ cảnh</h3><p class="exercise-sub">Điền từ còn thiếu trong câu trích từ bài khóa rồi lật thẻ để đối chiếu.</p>
  <div class="flashcard"><div class="flash-context">${escapeHtml(x.context).replace("____",'<span class="blank-mark">?</span>')}</div>
  <input id="reviewInput" placeholder="Nhập chữ Hán..." style="margin-top:18px"><div class="controls"><button class="primary" onclick="checkReview()">Kiểm tra</button><button class="secondary" onclick="flipReview()">Lật thẻ</button></div>
  <div id="reviewFeedback" class="feedback"></div><div id="reviewAnswer" class="flash-answer hidden"></div></div>
  <div class="controls"><button class="secondary" onclick="prevReview()">← Trước</button><button class="secondary" onclick="nextReview()">Tiếp →</button></div></div>`;
}
window.checkReview=()=>{const x=reviewCards[reviewIndex],ok=normalize($("reviewInput").value)===normalize(x.target);$("reviewFeedback").className="feedback "+(ok?"ok":"bad");$("reviewFeedback").textContent=ok?"✅ Chính xác!":"❌ Chưa đúng."};
window.flipReview=()=>{const x=reviewCards[reviewIndex],a=$("reviewAnswer");a.classList.remove("hidden");a.textContent=`Đáp án: ${x.target}`};
window.nextReview=()=>{reviewIndex=(reviewIndex+1)%reviewCards.length;renderReviewCard()};window.prevReview=()=>{reviewIndex=(reviewIndex-1+reviewCards.length)%reviewCards.length;renderReviewCard()};

function renderTranslation(){
  const set=currentLesson.translations||[];if(!set.length)return unavailable();const x=set[translationIndex];
  $("moduleContent").innerHTML=`<div class="exercise-wrap"><div class="progress">Câu ${translationIndex+1}/${set.length}</div><h3>Dịch câu Việt → Trung</h3>
  <p class="exercise-sub">Đây là câu dài dựa trên bài khóa, không phải dịch từ đơn.</p><div class="translate-prompt">${escapeHtml(x.vi)}</div>
  <textarea id="translationInput" class="textarea" placeholder="Nhập câu tiếng Trung..."></textarea>
  <div class="controls"><button class="primary" onclick="checkTranslation()">Kiểm tra</button><button class="secondary" onclick="showTranslation()">Xem đáp án</button><button class="secondary" onclick="nextTranslation()">Câu tiếp theo</button></div><div id="translationFeedback" class="feedback"></div></div>`;
}
window.checkTranslation=()=>{const x=currentLesson.translations[translationIndex],ok=normalize($("translationInput").value)===normalize(x.zh);$("translationFeedback").className="feedback "+(ok?"ok":"bad");$("translationFeedback").textContent=ok?"✅ Chính xác!":"❌ Chưa trùng với đáp án gợi ý."};
window.showTranslation=()=>{const x=currentLesson.translations[translationIndex];$("translationFeedback").className="feedback";$("translationFeedback").innerHTML=`<b>Đáp án gợi ý:</b><br>${escapeHtml(x.zh)}`};
window.nextTranslation=()=>{translationIndex=(translationIndex+1)%currentLesson.translations.length;renderTranslation()};

function blankPassage(text,targets){let r=text;targets.forEach((t,i)=>r=r.replace(t,`[[${i+1}]]`));return escapeHtml(r).replace(/\[\[(\d+)\]\]/g,'<span class="gap">[$1] ______</span>')}
function renderFill(selectedId){
  const texts=currentLesson.texts||[];if(!texts.length)return unavailable();const id=Number(selectedId||texts[0].id),t=texts.find(x=>x.id===id)||texts[0],targets=t.targets.slice(0,10);
  const bank=[...targets].sort(()=>Math.random()-.5);
  $("moduleContent").innerHTML=`<div class="exercise-wrap"><div class="fill-toolbar"><b>Chọn bài khóa:</b><select onchange="renderFill(this.value)">${texts.map(x=>`<option value="${x.id}" ${x.id===t.id?"selected":""}>Bài khóa ${x.id}</option>`).join("")}</select></div>
  <h3>Điền từ vào Bài khóa ${t.id}</h3><p class="exercise-sub">Mỗi bài khóa có đúng 10 từ/cụm từ bị khuyết.</p>
  <div class="answer-bank"><b>Ngân hàng từ:</b> ${bank.map(x=>`<span>${escapeHtml(x)}</span>`).join("")}</div><div class="fill-passage">${blankPassage(t.content,targets)}</div>
  <div class="gap-inputs">${targets.map((_,i)=>`<label class="gap-row"><span class="gap-num">${i+1}</span><input id="gap${i}" placeholder="Từ số ${i+1}"></label>`).join("")}</div>
  <div class="controls"><button class="primary" onclick="checkFill(${t.id})">Kiểm tra 10 từ</button><button class="secondary" onclick="showFillAnswers(${t.id})">Xem đáp án</button></div><div id="fillFeedback" class="feedback"></div></div>`;
}
window.renderFill=renderFill;
window.checkFill=id=>{const t=currentLesson.texts.find(x=>x.id===Number(id)),targets=t.targets.slice(0,10);let correct=0;targets.forEach((a,i)=>{const inp=$(`gap${i}`),ok=normalize(inp.value)===normalize(a);if(ok)correct++;inp.style.borderColor=ok?"#22c55e":"#ef4444"});$("fillFeedback").className="feedback "+(correct===10?"ok":"bad");$("fillFeedback").textContent=`Bạn đúng ${correct}/10 từ.`};
window.showFillAnswers=id=>{const t=currentLesson.texts.find(x=>x.id===Number(id));$("fillFeedback").className="feedback";$("fillFeedback").innerHTML=`<b>Đáp án:</b> ${t.targets.slice(0,10).map((x,i)=>`${i+1}. ${escapeHtml(x)}`).join(" · ")}`};

function speak(text){if(!("speechSynthesis" in window))return; speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="zh-CN";u.rate=.82;speechSynthesis.speak(u)}window.speak=speak;
$("globalSearch").oninput=e=>{const q=e.target.value.trim().toLowerCase();if(!q){$("searchResults").classList.add("hidden");return}const hits=[];HSK3_DATA.forEach(l=>(l.words||[]).forEach(w=>{if(`${w.hanzi} ${w.pinyin} ${w.vi}`.toLowerCase().includes(q))hits.push({l,w})}));$("searchResults").classList.remove("hidden");$("searchResults").innerHTML=hits.length?hits.slice(0,80).map(x=>`<div class="search-hit"><b>Bài ${x.l.n}</b><span class="hanzi">${escapeHtml(x.w.hanzi)}</span><span class="pinyin">${escapeHtml(x.w.pinyin)}</span><span>${escapeHtml(x.w.vi)}</span></div>`).join(""):'<div class="muted">Không tìm thấy.</div>'};
$("clearSearch").onclick=()=>{$("globalSearch").value="";$("searchResults").classList.add("hidden")};
renderLessons();

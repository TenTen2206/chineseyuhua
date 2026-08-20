
let currentLesson=null, currentModule="vocab", exIndex=0;

const $=id=>document.getElementById(id);
const totalWords=HSK3_DATA.reduce((s,l)=>s+l.words.length,0);
$("globalStat").textContent=`${totalWords} mục từ • 18 bài`;

function statusText(l){
  if(l.status==="complete") return `<span class="badge complete">✓ Có dữ liệu từ vựng</span>`;
  if(l.status==="partial") return `<span class="badge partial">⚠ Chưa đầy đủ</span>`;
  return `<span class="badge missing">Chưa có dữ liệu từ PDF</span>`;
}
function renderLessons(){
  $("lessonGrid").innerHTML=HSK3_DATA.map(l=>`
  <button class="lesson-card" onclick="openLesson(${l.n})">
    <div class="lesson-num">BÀI ${l.n}</div>
    <h3>${l.title}</h3>
    ${statusText(l)}
    <div class="muted" style="margin-top:8px">${l.words.length?l.words.length+" từ":"Chờ bổ sung"}</div>
  </button>`).join("");
}
window.openLesson=n=>{
  currentLesson=HSK3_DATA.find(x=>x.n===n); exIndex=0;
  $("home").classList.remove("active");$("lesson").classList.add("active");
  $("lessonNo").textContent=`BÀI ${currentLesson.n} • HSK 3`;
  $("lessonTitle").textContent=currentLesson.title;
  $("lessonStatus").innerHTML=statusText(currentLesson)+(currentLesson.note?`<div class="muted" style="margin-top:8px">${currentLesson.note}</div>`:"");
  $("lessonBreadcrumb").textContent=`HSK 3 / Bài ${currentLesson.n}`;
  showModule("vocab");
  window.scrollTo({top:0,behavior:"smooth"});
}
$("backBtn").onclick=()=>{$("lesson").classList.remove("active");$("home").classList.add("active");window.scrollTo({top:0,behavior:"smooth"})}

document.querySelectorAll("[data-module]").forEach(b=>b.onclick=()=>showModule(b.dataset.module));

function showModule(mod){
  currentModule=mod; exIndex=0;
  if(!currentLesson)return;
  const c=$("moduleContent");
  if(mod==="vocab") return renderVocab(c);
  if(mod.startsWith("text")) return renderText(c,Number(mod.replace("text","")));
  if(mod==="review") return renderExercise(c,"review");
  if(mod==="translate") return renderExercise(c,"translate");
  if(mod==="fill") return renderExercise(c,"fill");
}

function renderVocab(c){
  if(!currentLesson.words.length){c.innerHTML='<div class="text-placeholder">Chưa có dữ liệu từ vựng cho bài này trong PDF hiện tại.</div>';return;}
  c.innerHTML=`<h3>Từ vựng</h3><div class="word-list">${
    currentLesson.words.map((w,i)=>`<div class="word-row">
      <div class="muted">${i+1}</div><div class="hanzi">${w.hanzi}</div><div class="pinyin">${w.pinyin}</div>
      <div class="vi">${w.vi}</div><button class="speak" onclick="speak('${w.hanzi}')">🔊</button>
    </div>`).join("")
  }</div>`;
}
function renderText(c,id){
  const t=currentLesson.texts.find(x=>x.id===id);
  c.innerHTML=`<h3>${t.title}</h3>
  <div class="text-placeholder">
    <b>课文 ${id}</b><br><br>
    ${t.content? t.content : t.note}
    <br><br><span class="muted">Phần này đã được thiết kế sẵn để sau đó nhập nguyên văn bài khóa từ giáo trình.</span>
  </div>`;
}

function getExerciseSet(type){
  return currentLesson[type]||[];
}
function renderExercise(c,type){
  const set=getExerciseSet(type);
  if(!set.length){c.innerHTML='<div class="text-placeholder">Chưa có bài tập cho bài này.</div>';return;}
  const item=set[exIndex%set.length];
  let title="", prompt="", answer="";
  if(type==="review"){title="Ôn tập từ vựng";prompt=item.question;answer=item.answer;}
  if(type==="translate"){title="Dịch câu";prompt=item.vi;answer=item.zh;}
  if(type==="fill"){title="Bài tập điền từ";prompt=item.prompt;answer=item.answer;}
  c.innerHTML=`<div class="exercise">
    <div class="muted">Câu ${exIndex+1}/${set.length}</div>
    <h3>${title}</h3>
    <p style="font-size:20px">${prompt}</p>
    <div class="answer-box"><input id="exerciseAnswer" placeholder="Nhập câu trả lời..."></div>
    <div class="controls">
      <button class="primary" onclick="checkAnswer('${escapeJs(answer)}')">Kiểm tra</button>
      <button class="secondary" onclick="showAnswer('${escapeJs(answer)}')">Xem đáp án</button>
      <button class="secondary" onclick="nextExercise('${type}')">Câu tiếp theo</button>
    </div>
    <div id="feedback" class="feedback"></div>
  </div>`;
}
window.escapeJs=s=>String(s).replaceAll("\\","\\\\").replaceAll("'","\\'");
window.checkAnswer=answer=>{
  const v=$("exerciseAnswer").value.trim().replace(/\s+/g,"");
  const a=answer.trim().replace(/\s+/g,"");
  $("feedback").textContent=v===a?"✅ Chính xác!":`❌ Chưa đúng.`;
}
window.showAnswer=answer=>$("feedback").textContent=`Đáp án: ${answer}`;
window.nextExercise=type=>{const set=getExerciseSet(type);exIndex=(exIndex+1)%set.length;renderExercise($("moduleContent"),type)}

function speak(text){
  if(!("speechSynthesis" in window))return;
  speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text);u.lang="zh-CN";u.rate=.82;speechSynthesis.speak(u);
}
window.speak=speak;

$("globalSearch").oninput=e=>{
  const q=e.target.value.trim().toLowerCase();
  if(!q){$("searchResults").classList.add("hidden");return}
  const hits=[];HSK3_DATA.forEach(l=>l.words.forEach(w=>{if(`${w.hanzi} ${w.pinyin} ${w.vi}`.toLowerCase().includes(q))hits.push({l,w})}));
  $("searchResults").classList.remove("hidden");
  $("searchResults").innerHTML=hits.length?hits.slice(0,80).map(x=>`<div class="search-hit"><b>Bài ${x.l.n}</b><span class="hanzi">${x.w.hanzi}</span><span class="pinyin">${x.w.pinyin}</span><span>${x.w.vi}</span></div>`).join(""):'<div class="muted">Không tìm thấy.</div>';
}
$("clearSearch").onclick=()=>{$("globalSearch").value="";$("searchResults").classList.add("hidden")}

document.querySelectorAll("[data-global]").forEach(btn=>btn.onclick=()=>{
  const type=btn.dataset.global;
  const first=HSK3_DATA.find(l=>l.words.length);
  openLesson(first.n);showModule(type);
});

renderLessons();

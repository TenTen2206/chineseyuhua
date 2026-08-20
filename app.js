
let currentLesson = null;
let cardIndex = 0;
let flipped = false;

const $ = (id)=>document.getElementById(id);
const completeCount = HSK3_DATA.filter(x=>x.status==="complete").length;
const totalWords = HSK3_DATA.reduce((s,x)=>s+x.words.length,0);
$("globalStat").textContent = `${totalWords} mục từ • ${completeCount}/18 bài hoàn chỉnh từ PDF`;

function statusText(l){
  if(l.status==="complete") return `<span class="badge complete">✓ Đủ dữ liệu trong PDF</span>`;
  if(l.status==="partial") return `<span class="badge partial">⚠ Bài chưa đầy đủ</span>`;
  return `<span class="badge missing">Chưa có trang từ vựng trong PDF</span>`;
}
function renderLessons(){
  $("lessonGrid").innerHTML = HSK3_DATA.map(l=>`
    <button class="lesson-card" onclick="openLesson(${l.n})">
      <div class="lesson-num">BÀI ${l.n}</div>
      <h3>${l.title}</h3>
      ${statusText(l)}
      <div style="margin-top:9px;color:#6b7280;font-size:13px">${l.words.length ? `${l.words.length} từ` : "Chờ bổ sung nguồn"}</div>
    </button>`).join("");
}
window.openLesson = function(n){
  currentLesson = HSK3_DATA.find(x=>x.n===n);
  cardIndex=0; flipped=false;
  $("home").classList.remove("active"); $("lesson").classList.add("active");
  $("lessonNo").textContent=`BÀI ${currentLesson.n} • HSK 3.0`;
  $("lessonTitle").textContent=currentLesson.title;
  $("lessonStatus").innerHTML=statusText(currentLesson) + (currentLesson.note?`<div style="margin-top:9px;color:#6b7280">${currentLesson.note}</div>`:"");
  $("lessonSearch").value="";
  renderWords(currentLesson.words);
  renderCard();
  window.scrollTo({top:0,behavior:"smooth"});
}
$("backBtn").onclick=()=>{$("lesson").classList.remove("active");$("home").classList.add("active");window.scrollTo({top:0,behavior:"smooth"});}

function speak(text){
  if(!("speechSynthesis" in window)) return alert("Trình duyệt chưa hỗ trợ đọc tiếng Trung.");
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text); u.lang="zh-CN"; u.rate=.82; speechSynthesis.speak(u);
}
window.speak=speak;
function renderWords(words){
  if(!words.length){$("wordList").innerHTML=`<div class="empty">Chưa thể hiển thị từ vựng vì các trang tương ứng không có trong PDF đính kèm. Hãy bổ sung phần còn thiếu của sách để dữ liệu được chép chính xác.</div>`;return;}
  $("wordList").innerHTML=words.map((w,i)=>`
  <div class="word-row">
    <div class="word-index">${i+1}</div><div class="hanzi">${w.hanzi}</div><div class="pinyin">${w.pinyin}</div>
    <div class="vi">${w.vi}</div><div class="en">${w.en}</div>
    <button class="speak" onclick='speak(${JSON.stringify(w.hanzi)})'>🔊</button>
  </div>`).join("");
}
$("lessonSearch").oninput=e=>{
  const q=e.target.value.trim().toLowerCase();
  renderWords(currentLesson.words.filter(w=>`${w.hanzi} ${w.pinyin} ${w.vi} ${w.en}`.toLowerCase().includes(q)));
}

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active")); b.classList.add("active");
  const cards=b.dataset.mode==="cards"; $("listMode").classList.toggle("hidden",cards);$("cardsMode").classList.toggle("hidden",!cards);renderCard();
});
function renderCard(){
  const words=currentLesson?.words||[];
  if(!words.length){$("flashcard").innerHTML='<div class="empty">Chưa có dữ liệu flashcard cho bài này.</div>';return;}
  const w=words[cardIndex%words.length]; flipped=false;
  $("flashcard").innerHTML=`<div class="front"><div class="counter">${cardIndex+1}/${words.length}</div><div class="big-hanzi">${w.hanzi}</div><div class="tap">Nhấn vào thẻ để xem nghĩa</div></div>`;
}
$("flashcard").onclick=()=>{
  const words=currentLesson?.words||[]; if(!words.length)return;
  const w=words[cardIndex]; flipped=!flipped;
  $("flashcard").innerHTML=flipped
  ? `<div class="back-face"><div class="card-pinyin">${w.pinyin}</div><div class="card-vi">${w.vi}</div><div class="card-en">${w.en}</div><button class="speak" onclick="event.stopPropagation();speak('${w.hanzi}')">🔊 Nghe</button></div>`
  : `<div class="front"><div class="counter">${cardIndex+1}/${words.length}</div><div class="big-hanzi">${w.hanzi}</div><div class="tap">Nhấn vào thẻ để xem nghĩa</div></div>`;
}
$("prevCard").onclick=()=>{if(!currentLesson.words.length)return;cardIndex=(cardIndex-1+currentLesson.words.length)%currentLesson.words.length;renderCard()}
$("nextCard").onclick=()=>{if(!currentLesson.words.length)return;cardIndex=(cardIndex+1)%currentLesson.words.length;renderCard()}

$("globalSearch").oninput=e=>{
  const q=e.target.value.trim().toLowerCase();
  if(!q){$("searchResults").classList.add("hidden");return}
  const hits=[];
  HSK3_DATA.forEach(l=>l.words.forEach(w=>{if(`${w.hanzi} ${w.pinyin} ${w.vi} ${w.en}`.toLowerCase().includes(q))hits.push({l,w})}));
  $("searchResults").classList.remove("hidden");
  $("searchResults").innerHTML=hits.length?hits.slice(0,80).map(x=>`
    <div class="search-hit"><b>Bài ${x.l.n}</b><span class="hanzi">${x.w.hanzi}</span><span class="pinyin">${x.w.pinyin}</span><span>${x.w.vi}</span></div>`).join("")
    : `<div class="empty">Không tìm thấy từ phù hợp.</div>`;
}
$("clearSearch").onclick=()=>{$("globalSearch").value="";$("searchResults").classList.add("hidden")}
renderLessons();


let currentLesson=null, reviewCards=[], reviewIndex=0, translationIndex=0;
const $=id=>document.getElementById(id);
const normalize=s=>String(s||"").trim().replace(/[\s，。！？、,.!?；;：“”"'（）()]/g,"");
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

/*
  AI grading endpoint.
  GitHub Pages is static, so DO NOT put an API key in this frontend.
  Set this to your secure serverless endpoint, e.g. a Cloudflare Worker or Vercel Function.
*/
const AI_GRADER_ENDPOINT = window.AI_GRADER_ENDPOINT || "";

const totalWords=HSK3_DATA.reduce((s,l)=>s+(l.words?.length||0),0);
const textCount=HSK3_DATA.reduce((s,l)=>s+(l.texts?.length||0),0);
$("globalStat").textContent=`${totalWords} mục từ • ${textCount} bài khóa • v7`;

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
  for(const w of (currentLesson.words||[])){
    if(!w.hanzi) continue;
    cards.push({
      hanzi:w.hanzi,
      pinyin:w.pinyin||"",
      vi:w.vi||""
    });
  }
  return cards;
}

function setupReview(){
  reviewCards=makeReviewCards();
  reviewIndex=0;
  if(!reviewCards.length){
    $("moduleContent").innerHTML='<div class="source-note">Chưa có từ vựng để tạo flashcard.</div>';
    return;
  }
  renderReviewCard(false);
}


function renderReviewCard(showBack=false){
  const x=reviewCards[reviewIndex];
  $("moduleContent").innerHTML=`
    <div class="exercise-wrap">
      <div class="progress">Flashcard ${reviewIndex+1}/${reviewCards.length}</div>
      <h3>Ôn tập từ vựng bằng flashcard</h3>
      <p class="exercise-sub">
        Mặt trước hiển thị <b>chữ Hán</b>. Mặt sau hiển thị <b>chữ Hán + pinyin + nghĩa tiếng Việt</b>.
        Bấm vào thẻ hoặc nút bên dưới để lật giữa <b>Mặt trước</b> và <b>Mặt sau</b>.
      </p>

      <div class="card-stage">
        <div id="flipCard" class="flip-card ${showBack?'is-flipped':''}" onclick="flipReview()">
          <div class="flip-card-inner">
            <div class="flip-face flip-front">
              <div class="flash-label">Mặt trước</div>
              <div class="flash-hanzi">${escapeHtml(x.hanzi)}</div>
              <div class="face-help">Nhìn chữ Hán và đoán cách đọc, nghĩa</div>
            </div>

            <div class="flip-face flip-back">
              <div class="flash-label">Mặt sau</div>
              <div class="flash-hanzi small">${escapeHtml(x.hanzi)}</div>
              <div class="flash-pinyin">${escapeHtml(x.pinyin)}</div>
              <div class="flash-meaning">${escapeHtml(x.vi)}</div>
              <button class="speak" onclick='event.stopPropagation();speak(${JSON.stringify(x.hanzi)})'>🔊 Nghe phát âm</button>
            </div>
          </div>
        </div>
      </div>

      <div class="face-buttons">
        <button class="secondary" onclick="showFront()">Xem mặt trước</button>
        <button class="primary" onclick="showBack()">Xem mặt sau</button>
      </div>

      <div class="controls">
        <button class="secondary" onclick="prevReview()">← Trước</button>
        <button class="secondary" onclick="flipReview()">Lật thẻ</button>
        <button class="secondary" onclick="nextReview()">Tiếp →</button>
        <button class="secondary" onclick="shuffleReview()">🔀 Trộn thẻ</button>
      </div>
    </div>`;
}

window.flipReview=()=>{
  const card=$("flipCard");
  if(card) card.classList.toggle("is-flipped");
};

window.showFront=()=>{
  const card=$("flipCard");
  if(card) card.classList.remove("is-flipped");
};

window.showBack=()=>{
  const card=$("flipCard");
  if(card) card.classList.add("is-flipped");
};

window.nextReview=()=>{
  reviewIndex=(reviewIndex+1)%reviewCards.length;
  renderReviewCard(false);
};

window.prevReview=()=>{
  reviewIndex=(reviewIndex-1+reviewCards.length)%reviewCards.length;
  renderReviewCard(false);
};

window.shuffleReview=()=>{
  for(let i=reviewCards.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [reviewCards[i],reviewCards[j]]=[reviewCards[j],reviewCards[i]];
  }
  reviewIndex=0;
  renderReviewCard(false);
};


function renderTranslation(){
  const set=currentLesson.translations||[];
  if(!set.length)return unavailable();
  const x=set[translationIndex];

  $("moduleContent").innerHTML=`
    <div class="exercise-wrap">
      <div class="progress">Câu ${translationIndex+1}/${set.length}</div>
      <h3>Dịch câu Việt → Trung</h3>
      <p class="exercise-sub">
        Dịch câu dài dựa trên bài khóa. Bạn có thể kiểm tra nhanh bằng đáp án gợi ý hoặc dùng AI để chấm,
        chỉ ra lỗi ngữ pháp, từ vựng và cách diễn đạt.
      </p>

      <div class="translate-prompt">${escapeHtml(x.vi)}</div>
      <textarea id="translationInput" class="textarea" placeholder="Nhập câu tiếng Trung của bạn..."></textarea>

      <div class="controls">
        <button class="secondary" onclick="checkTranslation()">Kiểm tra nhanh</button>
        <button class="ai-btn" onclick="gradeTranslationWithAI()">🤖 AI chấm & nhận xét</button>
        <button class="secondary" onclick="showTranslation()">Xem đáp án gợi ý</button>
        <button class="secondary" onclick="nextTranslation()">Câu tiếp theo</button>
      </div>

      <div id="translationFeedback" class="feedback"></div>
      <div id="aiGradingResult" class="ai-result hidden"></div>
    </div>`;
}

window.checkTranslation=()=>{
  const x=currentLesson.translations[translationIndex];
  const user=$("translationInput").value;
  if(!user.trim()){
    $("translationFeedback").className="feedback bad";
    $("translationFeedback").textContent="Hãy nhập câu trả lời trước.";
    return;
  }

  const exact=normalize(user)===normalize(x.zh);

  // Lightweight local heuristic: character overlap for immediate feedback only.
  const refChars=[...new Set(normalize(x.zh))];
  const userNorm=normalize(user);
  const matched=refChars.filter(ch=>userNorm.includes(ch)).length;
  const overlap=refChars.length?Math.round(matched/refChars.length*100):0;

  $("translationFeedback").className="feedback "+(exact?"ok":"");
  $("translationFeedback").innerHTML=exact
    ? "✅ Trùng với đáp án gợi ý."
    : `Kiểm tra nhanh: chưa trùng hoàn toàn với đáp án gợi ý. Mức độ trùng ký tự khoảng <b>${overlap}%</b>. 
       Đây không phải đánh giá ngữ pháp; hãy dùng <b>AI chấm & nhận xét</b> để có phản hồi chi tiết.`;
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

window.gradeTranslationWithAI=async()=>{
  const x=currentLesson.translations[translationIndex];
  const user=$("translationInput").value.trim();
  const box=$("aiGradingResult");

  if(!user){
    box.classList.remove("hidden");
    box.innerHTML='<div class="ai-error">Hãy nhập câu dịch trước khi yêu cầu AI chấm.</div>';
    return;
  }

  if(!AI_GRADER_ENDPOINT){
    box.classList.remove("hidden");
    box.innerHTML=`
      <div class="ai-warning">
        <b>Chưa cấu hình máy chủ AI.</b><br>
        GitHub Pages không thể lưu API key an toàn trong trình duyệt.
        Website đã chuẩn bị sẵn chức năng AI chấm; bạn cần nối nó với một endpoint bảo mật
        (Cloudflare Worker, Vercel Function hoặc backend riêng).
      </div>`;
    return;
  }

  box.classList.remove("hidden");
  box.innerHTML='<div class="ai-loading">🤖 AI đang chấm bài...</div>';

  try{
    const response=await fetch(AI_GRADER_ENDPOINT,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        level:"HSK 3",
        lesson:currentLesson.n,
        sourceVietnamese:x.vi,
        referenceChinese:x.zh,
        studentChinese:user
      })
    });

    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const r=await response.json();

    const score=Number.isFinite(Number(r.score))?Number(r.score):null;
    const scoreText=score!==null?`${score}/10`:"—";
    const verdict=r.verdict||"Đã chấm";
    const strengths=Array.isArray(r.strengths)?r.strengths:[];
    const errors=Array.isArray(r.errors)?r.errors:[];
    const corrected=r.correctedChinese||x.zh;
    const explanation=r.explanation||"";

    box.innerHTML=`
      <div class="ai-score-row">
        <div class="ai-score">${escapeHtml(scoreText)}</div>
        <div><b>${escapeHtml(verdict)}</b><div class="muted">AI đánh giá theo mức HSK 3</div></div>
      </div>

      ${strengths.length?`
      <div class="ai-section"><h4>✅ Điểm làm tốt</h4>
        <ul>${strengths.map(s=>`<li>${escapeHtml(s)}</li>`).join("")}</ul>
      </div>`:""}

      ${errors.length?`
      <div class="ai-section"><h4>🔎 Lỗi cần sửa</h4>
        <div class="error-list">
          ${errors.map(e=>`
            <div class="error-item">
              <b>${escapeHtml(e.type||"Lỗi")}</b>
              ${e.original?`<div><span class="muted">Bạn viết:</span> ${escapeHtml(e.original)}</div>`:""}
              ${e.suggestion?`<div><span class="muted">Nên sửa:</span> ${escapeHtml(e.suggestion)}</div>`:""}
              ${e.reason?`<div class="error-reason">${escapeHtml(e.reason)}</div>`:""}
            </div>`).join("")}
        </div>
      </div>`:""}

      <div class="ai-section"><h4>✍️ Câu sửa gợi ý</h4>
        <div class="corrected-sentence">${escapeHtml(corrected)}</div>
      </div>

      ${explanation?`<div class="ai-section"><h4>💬 Nhận xét</h4><p>${escapeHtml(explanation)}</p></div>`:""}
    `;
  }catch(err){
    box.innerHTML=`<div class="ai-error"><b>Không thể kết nối AI grader.</b><br>${escapeHtml(err.message)}</div>`;
  }
};
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

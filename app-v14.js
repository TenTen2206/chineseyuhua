
let currentLesson=null, reviewCards=[], reviewIndex=0, translationIndex=0;
const $=id=>document.getElementById(id);
const normalize=s=>String(s||"").trim().replace(/[\s，。！？、,.!?；;：“”"'（）()]/g,"");
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

const totalWords=HSK3_DATA.reduce((s,l)=>s+(l.words?.length||0),0);
const textCount=HSK3_DATA.reduce((s,l)=>s+(l.texts?.length||0),0);
$("globalStat").textContent=`${totalWords} mục từ • ${textCount} bài khóa • v14`;

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
        Dịch câu sang tiếng Trung, sau đó bấm <b>So sánh với đáp án</b>.
        Những nội dung trùng với đáp án gợi ý sẽ hiển thị <b>màu đen</b>;
        những nội dung không trùng sẽ hiển thị <b>màu đỏ</b>.
      </p>

      <div class="translate-prompt">${escapeHtml(x.vi)}</div>

      <textarea id="translationInput" class="textarea"
        placeholder="Nhập câu tiếng Trung của bạn..."></textarea>

      <div class="controls">
        <button class="primary" onclick="compareTranslation()">So sánh với đáp án</button>
        <button class="secondary" onclick="showTranslation()">Xem đáp án gợi ý</button>
        <button class="secondary" onclick="nextTranslation()">Câu tiếp theo</button>
      </div>

      <div id="translationFeedback" class="feedback"></div>
      <div id="comparisonResult" class="comparison-result hidden"></div>
    </div>`;
}

function lcsDiff(student, reference){
  const a=[...student];
  const b=[...reference];
  const m=a.length,n=b.length;
  const dp=Array.from({length:m+1},()=>Array(n+1).fill(0));

  for(let i=m-1;i>=0;i--){
    for(let j=n-1;j>=0;j--){
      dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
    }
  }

  let i=0,j=0;
  const studentParts=[];
  const refParts=[];

  while(i<m && j<n){
    if(a[i]===b[j]){
      studentParts.push({char:a[i],match:true});
      refParts.push({char:b[j],match:true});
      i++;j++;
    }else if(dp[i+1][j] >= dp[i][j+1]){
      studentParts.push({char:a[i],match:false});
      i++;
    }else{
      refParts.push({char:b[j],match:false});
      j++;
    }
  }
  while(i<m){ studentParts.push({char:a[i++],match:false}); }
  while(j<n){ refParts.push({char:b[j++],match:false}); }

  return {studentParts,refParts};
}

function renderDiff(parts){
  return parts.map(p=>{
    const cls=p.match?"diff-match":"diff-mismatch";
    return `<span class="${cls}">${escapeHtml(p.char)}</span>`;
  }).join("");
}

window.compareTranslation=()=>{
  const x=currentLesson.translations[translationIndex];
  const user=$("translationInput").value.trim();
  const box=$("comparisonResult");

  if(!user){
    box.classList.remove("hidden");
    box.innerHTML='<div class="comparison-warning">Hãy nhập câu dịch trước.</div>';
    return;
  }

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

    <div class="comparison-card">
      <div class="comparison-title">Đáp án gợi ý</div>
      <div class="comparison-line">${renderDiff(diff.refParts)}</div>
    </div>

    <div class="comparison-legend">
      <span><i class="legend-dot black"></i> Trùng với đáp án</span>
      <span><i class="legend-dot red"></i> Không trùng với đáp án</span>
    </div>

    <div class="comparison-score">
      Mức độ trùng khớp ký tự: <b>${score}%</b>
    </div>
    <div class="muted" style="margin-top:8px">
      Lưu ý: đây là so sánh với đáp án gợi ý, không phải chấm ngữ pháp.
      Một câu khác đáp án vẫn có thể đúng về ngữ pháp và ý nghĩa.
    </div>
  `;
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

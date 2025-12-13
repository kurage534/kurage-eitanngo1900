let allQuestions=[], questions=[], current=0, score=0;
let timerId=null, startTime=0, elapsed=0;
let answering=true;

fetch("/api/words").then(r=>r.json()).then(d=>allQuestions=d);

function fmt(s){return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");}

function startTimer(){
  startTime=Date.now();
  timerId=setInterval(()=>{
    document.getElementById("timer").textContent=fmt(elapsed+Math.floor((Date.now()-startTime)/1000));
  },200);
}
function stopTimer(){
  if(!timerId)return;
  clearInterval(timerId);
  timerId=null;
  elapsed+=Math.floor((Date.now()-startTime)/1000);
}

document.getElementById("start-btn").onclick=()=>{
  questions=[...allQuestions].sort(()=>Math.random()-0.5).slice(0,10);
  current=0; score=0; elapsed=0;
  document.getElementById("setup-area").style.display="none";
  document.getElementById("game-area").style.display="";
  show();
};

function show(){
  if(current>=questions.length){
    stopTimer();
    document.getElementById("score-area").textContent=`${score}点 / ${fmt(elapsed)}`;
    localStorage.setItem("score",score);
    localStorage.setItem("time",elapsed);
    localStorage.setItem("CAN_REGISTER","YES");
    document.getElementById("to-ranking").style.display="";
    return;
  }
  answering=true;
  document.getElementById("answer").disabled=false;
  document.getElementById("question").textContent=questions[current].japanese;
  document.getElementById("answer").value="";
  document.getElementById("next-btn").style.display="none";
  document.getElementById("submit-answer").style.display="";
  startTimer();
}

document.getElementById("submit-answer").onclick=async()=>{
  if(!answering)return;
  answering=false;
  stopTimer();
  document.getElementById("answer").disabled=true;
  const a=document.getElementById("answer").value.trim().toLowerCase();
  const c=questions[current].word.toLowerCase();
  if(a===c){
    score+=10;
    document.getElementById("game-message").textContent="正解";
  }else{
    document.getElementById("game-message").innerHTML=`不正解 正解:${c}`;
    await fetch("/api/miss",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({word:c})});
  }
  document.getElementById("submit-answer").style.display="none";
  document.getElementById("next-btn").style.display="";
};

document.getElementById("next-btn").onclick=()=>{current++;show();};
document.getElementById("to-ranking").onclick=()=>location.href="ranking.html";

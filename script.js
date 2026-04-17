
const scenes = Array.from(document.querySelectorAll('.scene'));
const progressFill = document.getElementById('progressFill');
const controlCopy = document.getElementById('controlCopy');
const notificationField = document.getElementById('notificationField');
const notifyTemplateA = document.getElementById('notifyTemplateA');
const notifyTemplateB = document.getElementById('notifyTemplateB');
const notifyTemplateC = document.getElementById('notifyTemplateC');
const skipBtn = document.getElementById('skipBtn');
const startBtn = document.getElementById('startBtn');
const experience = document.getElementById('experience');
const gameScreen = document.getElementById('gameScreen');
const laptop = document.getElementById('laptop');

const questionLabel = document.getElementById('questionLabel');
const questionTitle = document.getElementById('questionTitle');
const questionPrompt = document.getElementById('questionPrompt');
const choicesEl = document.getElementById('choices');
const resultsPanel = document.getElementById('resultsPanel');
const resultHeadline = document.getElementById('resultHeadline');
const resultBody = document.getElementById('resultBody');
const statGrid = document.getElementById('statGrid');
const nextBtn = document.getElementById('nextBtn');
const restartBtn = document.getElementById('restartBtn');
const scorePill = document.getElementById('scorePill');
const questionStage = document.getElementById('questionStage');
const finalStage = document.getElementById('finalStage');
const finalHeadline = document.getElementById('finalHeadline');
const finalSummary = document.getElementById('finalSummary');
const finalScore = document.getElementById('finalScore');
const typicalScore = document.getElementById('typicalScore');
const finalScorePill = document.getElementById('finalScorePill');
const aggregateChart = document.getElementById('aggregateChart');
const restartFromFinalBtn = document.getElementById('restartFromFinalBtn');
const submitCommentBtn = document.getElementById('submitCommentBtn');
const commentMessage = document.getElementById('commentMessage');
const commentConfirmation = document.getElementById('commentConfirmation');
const finalChartDescription = document.querySelector('.final-chart-panel p');


const SCENES = [
  { index: 0, duration: 999999, label: 'Click to begin…' },
  { index: 1, duration: 4200, label: 'Desk setup…' },
  { index: 2, duration: 4600, label: 'Inbox tension…' },
  { index: 3, duration: 999999, label: 'Title card ready.' }
];

const QUESTIONS = [
  {
    label: 'Scenario 1',
    title: 'Which message would be most likely to get clicked first?',
    prompt: 'Think about urgency, familiarity, and what would feel believable during a busy workday.',
    correct: 'B',
    insight: 'Gift card scams feel personal, urgent, and often appear to come from someone in authority. Busy staff may respond before slowing down to verify.',
    choices: [
      { id: 'A', title: 'Microsoft 365 Password Notice', text: 'Your password expires today. Click here to stay active.', tag: 'Urgent system alert', votes: 24 },
      { id: 'B', title: 'Doctor / Leadership Request', text: 'Can you grab gift cards for me real quick? I will reimburse you.', tag: 'Personal authority pressure', votes: 53 },
      { id: 'C', title: 'Delivery Notice', text: 'Please confirm your address to reschedule your package.', tag: 'Common consumer lure', votes: 23 }
    ]
  },
  {
    label: 'Scenario 2',
    title: 'Which one is most likely to get someone to open the message?',
    prompt: 'Not every attack needs a click right away. Sometimes the goal is just to get attention and start a conversation.',
    correct: 'A',
    insight: 'Account-related alerts reliably pull attention. Even cautious users may open the message to see if it is legitimate.',
    choices: [
      { id: 'A', title: 'Microsoft 365 Alert', text: 'Unusual sign-in detected. Review your account activity now.', tag: 'Security fear trigger', votes: 47 },
      { id: 'B', title: 'Fax from Unknown Sender', text: 'You have received a secure fax. Download attached file.', tag: 'Legacy office workflow', votes: 29 },
      { id: 'C', title: 'Shipping Delay Notice', text: 'Your delivery is pending until address confirmation is received.', tag: 'Routine distraction', votes: 24 }
    ]
  },
  {
    label: 'Scenario 3',
    title: 'Which message would be easiest to miss as suspicious?',
    prompt: 'This one is about subtlety. Which attack blends into everyday work the best?',
    correct: 'C',
    insight: 'Vendor-style messages can blend in quietly. Routine document shares and invoice follow-ups often slip past people because they do not feel dramatic.',
    choices: [
      { id: 'A', title: 'HR Benefits Update', text: 'Review your benefits information before end of day.', tag: 'Internal admin theme', votes: 31 },
      { id: 'B', title: 'Package Pickup Reminder', text: 'A package is waiting. Confirm delivery preferences.', tag: 'Everyday household noise', votes: 18 },
      { id: 'C', title: 'Shared Document from Vendor', text: 'Invoice revision attached. Please review before processing.', tag: 'Quiet workflow blend-in', votes: 51 }
    ]
  }
];

const TYPICAL_TEAM_SCORE = 2;

const FISH = [
  "./assets/fish1.png",
  "./assets/fish2.png",
  "./assets/fish3.png",
  "./assets/fish4.png"
];

let lastFish = null;

let currentScene = 0;
let soundEnabled = true;
let audioCtx = null;
let introDone = false;
let introStarted = false;
let sceneTimer = null;
let progressTimer = null;
let progressStart = 0;
let progressDuration = 0;
let notifyInterval = null;

let currentQuestion = 0;
let answered = false;
let totalAnswered = 0;
let totalCorrect = 0;
let selectedAnswers = [];
let resultSubmitted = false;
let liveStats = null;
const sessionId = (() => {
  const key = 'spotThePhishSessionId';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const created = (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  window.localStorage.setItem(key, created);
  return created;
})();

function getFish() {
  const options = FISH.filter((f) => f !== lastFish);
  const pick = options[Math.floor(Math.random() * options.length)];
  lastFish = pick;
  return pick;
}

function swimFish(el, topRange) {
  if (!el) return;
  const img = el.querySelector("img");
  if (!img) return;

  img.src = getFish();

  const startY = Math.random() * topRange;
  el.style.transition = "none";
  el.style.transform = "translateX(0)";
  el.style.left = "-200px";
  el.style.top = `${startY}%`;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transition = "transform 10s linear";
      el.style.transform = "translateX(120vw)";
    });
  });

  setTimeout(() => swimFish(el, topRange), 10500);
}


function getFallbackQuestionBreakdowns() {
  return QUESTIONS.map((q) => {
    const total = q.choices.reduce((sum, choice) => sum + choice.votes, 0);
    const breakdown = { A: 0, B: 0, C: 0 };
    q.choices.forEach((choice) => {
      breakdown[choice.id] = Math.round((choice.votes / total) * 100);
    });
    return breakdown;
  });
}

function getCurrentStats() {
  return liveStats || {
    totalAttempts: 0,
    feedbackCount: 0,
    averageScore: 2,
    roundedAverageScore: 2,
    perfectScoreRate: 0,
    hardestQuestion: 3,
    aggregateBreakdown: { A: 34, B: 33, C: 33 },
    questionBreakdowns: getFallbackQuestionBreakdowns()
  };
}

async function fetchLiveStats() {
  try {
    const response = await fetch('/api/quiz-stats');
    if (!response.ok) throw new Error('Stats request failed');
    liveStats = await response.json();
  } catch (error) {
    console.warn('Using fallback quiz stats.', error);
  }
}

async function submitQuizResult(feedback = '') {
  if (resultSubmitted && !feedback) return getCurrentStats();

  try {
    const response = await fetch('/api/quiz-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        score: totalCorrect,
        totalQuestions: QUESTIONS.length,
        answers: selectedAnswers,
        feedback
      })
    });
    if (!response.ok) throw new Error('Submit failed');
    const payload = await response.json();
    if (payload?.stats) liveStats = payload.stats;
    resultSubmitted = true;
    return payload;
  } catch (error) {
    console.error('Could not submit quiz result.', error);
    return { ok: false, stats: getCurrentStats() };
  }
}

async function submitFeedback(message) {
  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, feedback: message })
    });
    if (!response.ok) throw new Error('Feedback submit failed');
    const payload = await response.json();
    if (payload?.stats) liveStats = payload.stats;
    return payload;
  } catch (error) {
    console.error('Could not submit feedback.', error);
    return { ok: false, emailed: false };
  }
}

function initAudio() {
  if (audioCtx) return audioCtx;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    soundEnabled = false;
    return null;
  }
  audioCtx = new AudioContextClass();
  return audioCtx;
}

function tone({ frequency = 440, type = 'sine', duration = 0.15, gain = 0.03, delay = 0 }) {
  if (!soundEnabled) return;
  const ctx = initAudio();
  if (!ctx) return;
  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const node = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  node.gain.setValueAtTime(0.0001, now);
  node.gain.exponentialRampToValueAtTime(gain, now + 0.02);
  node.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(node);
  node.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.03);
}

function chord(freqs, options = {}) {
  freqs.forEach((f, i) => tone({ ...options, frequency: f, delay: (options.delay || 0) + i * 0.02 }));
}


function setControlCopy(text) {
  if (controlCopy) controlCopy.textContent = text;
}
function setProgressWidth(value) {
  if (progressFill) progressFill.style.width = value;
}
function clearNotifications() {
  if (!notificationField) return;
  Array.from(notificationField.querySelectorAll('.notify-card.live')).forEach((el) => el.remove());
  if (notifyInterval) {
    clearInterval(notifyInterval);
    notifyInterval = null;
  }
}
function spawnNotificationBubble() {
  if (!notificationField) return;
  const templates = [notifyTemplateA, notifyTemplateB, notifyTemplateC].filter(Boolean);
  if (!templates.length) return;
  const template = templates[Math.floor(Math.random() * templates.length)];
  const clone = template.cloneNode(true);
  clone.removeAttribute('id');
  clone.classList.add('live');
  const maxLeft = window.innerWidth - 280;
  const maxTop = window.innerHeight - 180;
  const x = Math.max(24, Math.floor(Math.random() * Math.max(80, maxLeft)));
  const y = Math.max(90, Math.floor(Math.random() * Math.max(160, maxTop)));
  clone.style.left = `${x}px`;
  clone.style.top = `${y}px`;
  notificationField.appendChild(clone);
  setTimeout(() => clone.remove(), 2200);
}
function startNotificationBubbles() {
  clearNotifications();
  spawnNotificationBubble();
  notifyInterval = setInterval(spawnNotificationBubble, 900);
}

function activateScene(index) {
  if (index > scenes.length - 1) return;
  scenes.forEach((scene, i) => scene.classList.toggle('active', i === index));
  currentScene = index;
  setControlCopy(SCENES[index].label);

  if (index === 1 && laptop) {
    laptop.classList.remove('closed');
    void laptop.offsetWidth;
    laptop.classList.add('closed');
  }

  if (index === 0) {
    chord([220, 330, 440], { type: 'triangle', duration: 1.0, gain: 0.010 });
    startNotificationBubbles();
  } else {
    clearNotifications();
  }
  if (index === 1) {
    tone({ frequency: 250, type: 'triangle', duration: 0.2, gain: 0.03 });
    tone({ frequency: 520, type: 'sine', duration: 0.25, gain: 0.02, delay: 1.2 });
  }
  if (index === 2) {
    tone({ frequency: 880, type: 'sine', duration: 0.08, gain: 0.030, delay: 0.55 });
    tone({ frequency: 780, type: 'sine', duration: 0.08, gain: 0.030, delay: 1.08 });
    tone({ frequency: 680, type: 'sine', duration: 0.08, gain: 0.030, delay: 1.62 });
    chord([180, 240], { type: 'sawtooth', duration: 1.6, gain: 0.006, delay: 2.0 });
  }
  if (index === 3) {
    chord([392, 494, 587], { type: 'triangle', duration: 0.7, gain: 0.025 });
  }

  clearTimeout(sceneTimer);
  clearInterval(progressTimer);

  const duration = SCENES[index].duration;
  if (duration < 900000) {
    startProgress(duration);
    sceneTimer = setTimeout(() => activateScene(index + 1), duration);
  } else {
    setProgressWidth(index === 0 ? '0%' : '100%');
  }
}

function startProgress(duration) {
  progressStart = performance.now();
  progressDuration = duration;
  setProgressWidth('0%');
  progressTimer = setInterval(() => {
    const elapsed = performance.now() - progressStart;
    const pct = Math.min(100, (elapsed / progressDuration) * 100);
    setProgressWidth(pct + '%');
    if (pct >= 100) clearInterval(progressTimer);
  }, 40);
}

function beginIntroSequence() {
  if (introStarted) return;
  introStarted = true;
  setControlCopy('Intro running…');
  activateScene(1);
}

function finishIntro() {
  introDone = true;
  clearTimeout(sceneTimer);
  clearInterval(progressTimer);
  setControlCopy('Intro complete. Spot the Phish is ready.');
  setProgressWidth('100%');
  activateScene(3);
}

function showGame() {
  clearNotifications();
  finishIntro();
  experience.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  gameScreen.classList.add('show');
  loadQuestion(0);
  chord([330, 440, 554], { type: 'triangle', duration: 0.5, gain: 0.018 });
}

function loadQuestion(index) {
  currentQuestion = index;
  answered = false;
  const q = QUESTIONS[index];
  questionLabel.textContent = q.label;
  questionTitle.textContent = q.title;
  questionPrompt.textContent = q.prompt;
  scorePill.textContent = `Question ${index + 1} of ${QUESTIONS.length}`;

  questionStage.classList.remove('hidden');
  finalStage.classList.add('hidden');
  resultsPanel.classList.add('hidden');
  nextBtn.classList.add('hidden');
  restartBtn.classList.add('hidden');

  choicesEl.innerHTML = '';
  q.choices.forEach((choice) => {
    const button = document.createElement('button');
    button.className = 'choice-btn';
    button.type = 'button';
    button.dataset.choiceId = choice.id;
    button.innerHTML = `
      <span class="choice-letter">${choice.id}</span>
      <span class="choice-copy">
        <strong>${choice.title}</strong>
        <p>${choice.text}</p>
      </span>
      <span class="choice-tag">${choice.tag}</span>
    `;
    button.addEventListener('click', () => handleChoice(choice.id));
    choicesEl.appendChild(button);
  });
}

function handleChoice(choiceId) {
  if (answered) return;
  answered = true;
  totalAnswered += 1;
  const q = QUESTIONS[currentQuestion];
  selectedAnswers[currentQuestion] = choiceId;
  const isCorrect = choiceId === q.correct;
  if (isCorrect) totalCorrect += 1;

  Array.from(choicesEl.querySelectorAll('.choice-btn')).forEach((btn) => {
    const id = btn.dataset.choiceId;
    btn.disabled = true;
    if (id === q.correct) btn.classList.add('correct');
    if (id === choiceId && id !== q.correct) btn.classList.add('incorrect');
    if (id === choiceId) btn.classList.add('selected');
  });

  resultHeadline.textContent = isCorrect ? 'Nice catch.' : 'That one slips by a lot of teams.';
  resultBody.textContent = q.insight;
  statGrid.innerHTML = '';
  const stats = getCurrentStats();
  const breakdown = stats.questionBreakdowns?.[currentQuestion] || getFallbackQuestionBreakdowns()[currentQuestion];
  q.choices.forEach((choice) => {
    const pct = Number(breakdown?.[choice.id] ?? choice.votes);
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `
      <div class="stat-label">${choice.id}</div>
      <div class="stat-bar"><div class="stat-fill" style="width:${pct}%"></div></div>
      <div class="stat-value">${pct}%</div>
    `;
    statGrid.appendChild(row);
  });
  resultsPanel.classList.remove('hidden');

  if (currentQuestion < QUESTIONS.length - 1) {
    nextBtn.classList.remove('hidden');
  } else {
    nextBtn.textContent = 'See Final Results';
    nextBtn.classList.remove('hidden');
  }

  tone({ frequency: isCorrect ? 640 : 240, type: isCorrect ? 'triangle' : 'sawtooth', duration: 0.25, gain: 0.03 });
  if (isCorrect) tone({ frequency: 820, type: 'sine', duration: 0.22, gain: 0.02, delay: 0.08 });
}

async function showFinalScreen() {
  await submitQuizResult('');
  const stats = getCurrentStats();
  const roundedTypical = Math.max(0, Math.min(QUESTIONS.length, Math.round(stats.averageScore)));

  finalHeadline.textContent = `You spotted ${totalCorrect} of ${QUESTIONS.length} phish.`;
  finalSummary.textContent = `Live results so far: ${stats.totalAttempts} attempt${stats.totalAttempts === 1 ? '' : 's'}, ${stats.perfectScoreRate}% perfect scores, and Question ${stats.hardestQuestion} is missed the most.`;
  finalScore.textContent = `${totalCorrect} / ${QUESTIONS.length}`;
  typicalScore.textContent = `${roundedTypical} / ${QUESTIONS.length}`;
  finalScorePill.textContent = `Final Score ${totalCorrect} / ${QUESTIONS.length}`;
  if (finalChartDescription) {
    finalChartDescription.textContent = `Updated from saved submissions. Average score is ${stats.roundedAverageScore} out of ${QUESTIONS.length}.`;
  }

  const aggregate = stats.aggregateBreakdown || { A: 34, B: 33, C: 33 };
  aggregateChart.innerHTML = '';
  [
    { id: 'A', label: 'Option A average' },
    { id: 'B', label: 'Option B average' },
    { id: 'C', label: 'Option C average' },
  ].forEach((item) => {
    const pct = Number(aggregate[item.id] || 0);
    const row = document.createElement('div');
    row.className = 'aggregate-row';
    row.innerHTML = `
      <div class="aggregate-label">${item.label}</div>
      <div class="aggregate-bar"><div class="aggregate-fill" style="width:${pct}%"></div></div>
      <div class="aggregate-value">${pct}%</div>
    `;
    aggregateChart.appendChild(row);
  });

  questionStage.classList.add('hidden');
  finalStage.classList.remove('hidden');
  chord([392, 494, 587], { type: 'triangle', duration: 0.6, gain: 0.02 });
}

function restartGame() {
  currentQuestion = 0;
  answered = false;
  totalAnswered = 0;
  totalCorrect = 0;
  selectedAnswers = [];
  resultSubmitted = false;
  if (commentMessage) commentMessage.value = '';
  if (commentConfirmation) commentConfirmation.classList.add('hidden');
  nextBtn.textContent = 'Next Question';
  loadQuestion(0);
}

if (skipBtn) skipBtn.addEventListener('click', finishIntro);
if (startBtn) startBtn.addEventListener('click', showGame);
if (nextBtn) nextBtn.addEventListener('click', async () => {
  if (currentQuestion < QUESTIONS.length - 1) {
    loadQuestion(currentQuestion + 1);
  } else {
    await showFinalScreen();
  }
});
if (restartBtn) restartBtn.addEventListener('click', restartGame);
if (restartFromFinalBtn) restartFromFinalBtn.addEventListener('click', restartGame);
if (submitCommentBtn) submitCommentBtn.addEventListener('click', async () => {
  const message = commentMessage ? commentMessage.value.trim() : '';
  if (!message) {
    if (commentConfirmation) {
      commentConfirmation.textContent = 'Please add a quick message before you submit it to Patric.';
      commentConfirmation.classList.remove('hidden');
    }
    return;
  }

  if (!resultSubmitted && selectedAnswers.length) {
    await submitQuizResult('');
  }

  const payload = await submitFeedback(message);
  if (commentConfirmation) {
    commentConfirmation.textContent = payload.ok
      ? (payload.emailed
          ? 'Thanks. Your feedback was saved and emailed successfully.'
          : 'Thanks. Your feedback was saved. Add SMTP settings in .env to email it automatically.')
      : 'Your feedback could not be submitted right now. Please try again.';
    commentConfirmation.classList.remove('hidden');
  }
  if (payload.ok && commentMessage) commentMessage.value = '';
});

window.addEventListener('pointerdown', async () => {
  const ctx = initAudio();
  if (ctx?.state === 'suspended') await ctx.resume();
  if (!introStarted && !introDone) beginIntroSequence();
}, { once: true });

const introPhish = document.getElementById("introPhish");
const gamePhish = document.getElementById("gamePhish");

swimFish(introPhish, 70);
swimFish(gamePhish, 15);

fetchLiveStats().finally(() => {
  activateScene(0);
});

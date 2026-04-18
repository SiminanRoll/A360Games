
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
const leaveFeedbackBtn = document.getElementById('leaveFeedbackBtn');
const feedbackSection = document.getElementById('feedbackSection');
const typicalScore = document.getElementById('typicalScore');
const finalScorePill = document.getElementById('finalScorePill');
const aggregateChart = document.getElementById('aggregateChart');
const restartFromFinalBtn = document.getElementById('restartFromFinalBtn');
const submitCommentBtn = document.getElementById('submitCommentBtn');
const commentName = document.getElementById('commentName');
const commentMessage = document.getElementById('commentMessage');
const commentConfirmation = document.getElementById('commentConfirmation');
const averageScoreEl = document.getElementById('averageScore');
const totalAttemptsEl = document.getElementById('totalAttempts');
const perfectScoreRateEl = document.getElementById('perfectScoreRate');
const liveStatsStatus = document.getElementById('liveStatsStatus');

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

const FALLBACK_TYPICAL_TEAM_SCORE = 2;

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
let resultSubmittedForRun = false;

const APP_CONFIG = window.SPOT_THE_PHISH_CONFIG || {};
let supabaseClient = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  const hasConfig = APP_CONFIG.supabaseUrl && APP_CONFIG.supabaseAnonKey;
  const supabaseGlobal = window.supabase;
  if (!hasConfig || !supabaseGlobal?.createClient) return null;
  supabaseClient = supabaseGlobal.createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey);
  return supabaseClient;
}

function getSessionId() {
  const key = 'spotThePhishSessionId';
  let value = localStorage.getItem(key);
  if (!value) {
    value = `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, value);
  }
  return value;
}

function setLiveStatsStatus(message, variant = '') {
  if (!liveStatsStatus) return;
  liveStatsStatus.textContent = message;
  liveStatsStatus.classList.remove('ready', 'warning', 'error');
  if (variant) liveStatsStatus.classList.add(variant);
}

function getFallbackAggregateBreakdown() {
  const aggregate = { A: 0, B: 0, C: 0 };
  QUESTIONS.forEach((q) => q.choices.forEach((choice) => { aggregate[choice.id] += choice.votes; }));
  return aggregate;
}

function getFallbackStats() {
  return {
    totalAttempts: 100,
    averageScore: FALLBACK_TYPICAL_TEAM_SCORE,
    perfectScoreRate: 34,
    aggregate: getFallbackAggregateBreakdown(),
    feedbackCount: 0
  };
}

function renderAggregateChart(aggregate) {
  const total = Object.values(aggregate).reduce((sum, value) => sum + value, 0) || 1;
  aggregateChart.innerHTML = '';
  [
    { id: 'A', label: 'Option A average' },
    { id: 'B', label: 'Option B average' },
    { id: 'C', label: 'Option C average' },
  ].forEach((item) => {
    const pct = Math.round(((aggregate[item.id] || 0) / total) * 100);
    const row = document.createElement('div');
    row.className = 'aggregate-row';
    row.innerHTML = `
      <div class="aggregate-label">${item.label}</div>
      <div class="aggregate-bar"><div class="aggregate-fill" style="width:${pct}%"></div></div>
      <div class="aggregate-value">${pct}%</div>
    `;
    aggregateChart.appendChild(row);
  });
}

function renderLiveStats(stats) {
  const averageScore = Number.isFinite(stats.averageScore) ? stats.averageScore : 0;
  if (averageScoreEl) averageScoreEl.textContent = `${averageScore.toFixed(1)} / ${QUESTIONS.length}`;
  if (totalAttemptsEl) totalAttemptsEl.textContent = `${stats.totalAttempts}`;
  if (perfectScoreRateEl) perfectScoreRateEl.textContent = `${Math.round(stats.perfectScoreRate)}%`;
  if (typicalScore) typicalScore.textContent = `${averageScore.toFixed(1)} / ${QUESTIONS.length}`;
  renderAggregateChart(stats.aggregate);
}

async function submitQuizResult() {
  if (resultSubmittedForRun) return;
  const client = getSupabaseClient();
  if (!client) return;

  const payload = {
    session_id: getSessionId(),
    score: totalCorrect,
    total_questions: QUESTIONS.length,
    answers_json: selectedAnswers
  };

  const { error } = await client.from('quiz_submissions').insert(payload);
  if (error) throw error;
  resultSubmittedForRun = true;
}

async function loadLiveStats() {
  const client = getSupabaseClient();
  if (!client) {
    setLiveStatsStatus('Response totals will appear here as participation data comes in.', 'warning');
    return getFallbackStats();
  }

  const [{ data: submissions, error: submissionsError }, { data: feedback, error: feedbackError }] = await Promise.all([
    client.from('quiz_submissions').select('score,total_questions,answers_json'),
    client.from('quiz_feedback').select('id')
  ]);

  if (submissionsError) throw submissionsError;
  if (feedbackError) throw feedbackError;

  const submissionRows = submissions || [];
  if (!submissionRows.length) {
    setLiveStatsStatus('Live participation is ready. Stats will grow as people complete the challenge.', 'ready');
    return { totalAttempts: 0, averageScore: 0, perfectScoreRate: 0, aggregate: { A: 0, B: 0, C: 0 }, feedbackCount: (feedback || []).length };
  }

  const totalAttempts = submissionRows.length;
  const totalScore = submissionRows.reduce((sum, row) => sum + (Number(row.score) || 0), 0);
  const perfectScores = submissionRows.filter((row) => Number(row.score) === QUESTIONS.length).length;
  const aggregate = { A: 0, B: 0, C: 0 };

  submissionRows.forEach((row) => {
    const answers = Array.isArray(row.answers_json) ? row.answers_json : [];
    answers.forEach((answerId) => {
      if (aggregate[answerId] !== undefined) aggregate[answerId] += 1;
    });
  });

  setLiveStatsStatus(`Live participation stats loaded. ${totalAttempts} completed attempt${totalAttempts === 1 ? '' : 's'} so far.`, 'ready');
  return {
    totalAttempts,
    averageScore: totalScore / totalAttempts,
    perfectScoreRate: (perfectScores / totalAttempts) * 100,
    aggregate,
    feedbackCount: (feedback || []).length
  };
}

async function submitFeedbackMessage(name, message) {
  const client = getSupabaseClient();
  if (!client) return { ok: false, mode: 'fallback' };

  const formattedMessage = `Name: ${name}\n\nMessage:\n${message}`;

  const feedbackPayload = {
    session_id: getSessionId(),
    score: totalCorrect,
    answers_json: selectedAnswers,
    message: formattedMessage
  };

  const { error: insertError } = await client.from('quiz_feedback').insert(feedbackPayload);
  if (insertError) throw insertError;

  const feedbackUrl = APP_CONFIG.supabaseFeedbackFunctionUrl || APP_CONFIG.feedbackFunctionUrl || '';
  if (feedbackUrl) {
    const response = await fetch(feedbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(APP_CONFIG.supabaseAnonKey ? {
          } : {})
      },
      body: JSON.stringify({
        siteLabel: APP_CONFIG.siteLabel || 'Spot the Phish',
        sessionId: getSessionId(),
        score: `${totalCorrect}/${QUESTIONS.length}`,
        answers: selectedAnswers,
        name,
        message
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || 'Feedback email function failed');
    }

    return { ok: true, mode: 'email' };
  }

  return { ok: true, mode: 'saved' };
}

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

function playEnterGameSound() {
  chord([392, 494, 587], { type: 'triangle', duration: 0.6, gain: 0.02 });
}

function playVictorySong() {
  chord([392, 494, 587], { type: 'triangle', duration: 0.6, gain: 0.02 });
  tone({ frequency: 196, type: 'sine', duration: 0.12, gain: 0.02, delay: 0.00 });
  tone({ frequency: 196, type: 'sine', duration: 0.12, gain: 0.018, delay: 0.42 });
  chord([494, 587, 740], { type: 'triangle', duration: 0.28, gain: 0.02, delay: 0.22 });
  chord([523, 659, 784], { type: 'triangle', duration: 0.32, gain: 0.022, delay: 0.72 });
  tone({ frequency: 262, type: 'sine', duration: 0.14, gain: 0.018, delay: 1.04 });
  chord([587, 740, 880], { type: 'triangle', duration: 0.48, gain: 0.022, delay: 1.18 });
}

function playLoseSong() {
  tone({ frequency: 174, type: 'triangle', duration: 0.28, gain: 0.018, delay: 0.00 });
  tone({ frequency: 146, type: 'triangle', duration: 0.30, gain: 0.018, delay: 0.30 });
  tone({ frequency: 130, type: 'triangle', duration: 0.42, gain: 0.018, delay: 0.62 });
  tone({ frequency: 98, type: 'sine', duration: 0.10, gain: 0.014, delay: 0.12 });
  tone({ frequency: 98, type: 'sine', duration: 0.10, gain: 0.012, delay: 0.54 });
}

function playFinalSong() {
  if (totalCorrect === QUESTIONS.length) {
    playVictorySong();
    return;
  }
  if (totalCorrect === 0) {
    playLoseSong();
    return;
  }
  playEnterGameSound();
}

function initGameBubbles() {
  const bubbleField = document.getElementById('gameBubbles');
  if (!bubbleField || bubbleField.dataset.ready === 'true') return;

  for (let i = 0; i < 12; i += 1) {
    const bubble = document.createElement('span');
    bubble.className = 'game-bubble';
    const size = 8 + Math.random() * 18;
    const left = 4 + Math.random() * 92;
    const drift = -18 + Math.random() * 36;
    const duration = 10 + Math.random() * 9;
    const delay = Math.random() * 9;
    bubble.style.setProperty('--size', `${size}px`);
    bubble.style.setProperty('--left', `${left}%`);
    bubble.style.setProperty('--drift', `${drift}px`);
    bubble.style.setProperty('--duration', `${duration}s`);
    bubble.style.setProperty('--delay', `-${delay}s`);
    bubbleField.appendChild(bubble);
  }

  bubbleField.dataset.ready = 'true';
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

  const templates = [
    { key: 'A', el: notifyTemplateA },
    { key: 'B', el: notifyTemplateB },
    { key: 'C', el: notifyTemplateC }
  ].filter((item) => item.el);

  if (!templates.length) return;

  const visibleKeys = new Set(
    Array.from(notificationField.querySelectorAll('.notify-card.live'))
      .map((el) => el.dataset.templateKey)
      .filter(Boolean)
  );

  if (!window.__spotLastNotifyKey) window.__spotLastNotifyKey = null;

  let pool = templates.filter((item) => !visibleKeys.has(item.key) && item.key !== window.__spotLastNotifyKey);
  if (!pool.length) pool = templates.filter((item) => !visibleKeys.has(item.key));
  if (!pool.length) pool = templates;

  const selected = pool[Math.floor(Math.random() * pool.length)];
  window.__spotLastNotifyKey = selected.key;

  const clone = selected.el.cloneNode(true);
  clone.removeAttribute('id');
  clone.classList.add('live');
  clone.dataset.templateKey = selected.key;

  const cardW = window.innerWidth <= 900 ? 220 : 250;
  const cardH = window.innerWidth <= 900 ? 80 : 90;
  const pad = 26;

  const blockers = Array.from(document.querySelectorAll('.intro-center, .caption, .center-prompt, .title-card'))
    .filter((el) => el && el.offsetParent !== null)
    .map((el) => el.getBoundingClientRect());

  function overlaps(x, y) {
    const r = { left: x, top: y, right: x + cardW, bottom: y + cardH };
    return blockers.some((b) => !(r.right < b.left - 18 || r.left > b.right + 18 || r.bottom < b.top - 18 || r.top > b.bottom + 18));
  }

  const zones = [
    { xMin: pad, xMax: Math.max(pad, window.innerWidth * 0.22), yMin: 90, yMax: Math.max(110, window.innerHeight * 0.28) },
    { xMin: Math.max(pad, window.innerWidth * 0.78), xMax: Math.max(window.innerWidth * 0.78, window.innerWidth - cardW - pad), yMin: 90, yMax: Math.max(110, window.innerHeight * 0.28) },
    { xMin: pad, xMax: Math.max(pad, window.innerWidth * 0.22), yMin: Math.max(110, window.innerHeight * 0.62), yMax: Math.max(120, window.innerHeight - cardH - 90) },
    { xMin: Math.max(pad, window.innerWidth * 0.78), xMax: Math.max(window.innerWidth * 0.78, window.innerWidth - cardW - pad), yMin: Math.max(110, window.innerHeight * 0.62), yMax: Math.max(120, window.innerHeight - cardH - 90) }
  ];

  let x = pad;
  let y = 100;
  let placed = false;

  for (let i = 0; i < 20; i += 1) {
    const zone = zones[Math.floor(Math.random() * zones.length)];
    const xr = Math.max(1, zone.xMax - zone.xMin);
    const yr = Math.max(1, zone.yMax - zone.yMin);
    const cx = Math.floor(zone.xMin + Math.random() * xr);
    const cy = Math.floor(zone.yMin + Math.random() * yr);
    if (!overlaps(cx, cy)) {
      x = cx;
      y = cy;
      placed = true;
      break;
    }
  }

  clone.style.left = `${x}px`;
  clone.style.top = `${y}px`;
  notificationField.appendChild(clone);
  setTimeout(() => clone.remove(), 3800);
}


/* JS patch marker */
function getVisibleIntroBlockers() {
  return Array.from(document.querySelectorAll('.intro-center, .scene-2 .caption.right, .scene-3 .center-prompt, .scene-4 .title-card, .caption, .center-prompt, .title-card'))
    .filter((el) => el && el.offsetParent !== null)
    .map((el) => el.getBoundingClientRect());
}

function pointHitsBlocker(x, y, w, h, blockers) {
  const rect = { left: x, top: y, right: x + w, bottom: y + h };
  return blockers.some((b) => !(rect.right < b.left - 14 || rect.left > b.right + 14 || rect.bottom < b.top - 14 || rect.top > b.bottom + 14));
}


function startNotificationBubbles() {
  clearNotifications();
  spawnNotificationBubble();
  if (notifyInterval) clearInterval(notifyInterval);
  notifyInterval = setInterval(spawnNotificationBubble, 1800);
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
  initGameBubbles();
  loadQuestion(0);
  playEnterGameSound();
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
  selectedAnswers[currentQuestion] = choiceId;
  const q = QUESTIONS[currentQuestion];
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
  q.choices.forEach((choice) => {
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `
      <div class="stat-label">${choice.id}</div>
      <div class="stat-bar"><div class="stat-fill" style="width:${choice.votes}%"></div></div>
      <div class="stat-value">${choice.votes}%</div>
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
  finalHeadline.textContent = `You spotted ${totalCorrect} of ${QUESTIONS.length} phish.`;
  finalSummary.textContent = 'Thanks for taking the poll. Loading live comparison data now.';
  finalScore.textContent = `${totalCorrect} / ${QUESTIONS.length}`;
  if (typicalScore) typicalScore.textContent = `-- / ${QUESTIONS.length}`;
  finalScorePill.textContent = `Final Score ${totalCorrect} / ${QUESTIONS.length}`;

  renderLiveStats(getFallbackStats());

  questionStage.classList.add('hidden');
  finalStage.classList.remove('hidden');
  playFinalSong();

  try {
    await submitQuizResult();
    const stats = await loadLiveStats();
    renderLiveStats(stats);
    const attemptsText = stats.totalAttempts === 1 ? '1 recorded attempt' : `${stats.totalAttempts} recorded attempts`;
    finalSummary.textContent = stats.totalAttempts
      ? `Your team score is saved. Live stats are based on ${attemptsText}.`
      : 'You are the first completed run. Live stats will fill in as more people take the challenge.';
  } catch (error) {
    console.error('Live stats error', error);
    setLiveStatsStatus('Could not load live stats right now. Showing fallback demo numbers instead.', 'error');
    renderLiveStats(getFallbackStats());
    finalSummary.textContent = 'Your result is visible, but live stats could not be refreshed just now.';
  }
}

function scrollToFeedbackSection() {
  if (!feedbackSection) return;

  const scrollContainer = finalStage && finalStage.scrollHeight > finalStage.clientHeight
    ? finalStage
    : document.scrollingElement || document.documentElement;

  const containerRect = scrollContainer.getBoundingClientRect ? scrollContainer.getBoundingClientRect() : { top: 0 };
  const sectionRect = feedbackSection.getBoundingClientRect();
  const currentTop = scrollContainer.scrollTop || 0;
  const targetTop = currentTop + (sectionRect.top - containerRect.top) - 20;

  scrollContainer.scrollTo({
    top: Math.max(targetTop, 0),
    behavior: 'smooth'
  });

  window.setTimeout(() => {
    if (commentName) commentName.focus({ preventScroll: true });
  }, 350);
}

function restartGame() {
  currentQuestion = 0;
  answered = false;
  totalAnswered = 0;
  totalCorrect = 0;
  selectedAnswers = [];
  resultSubmittedForRun = false;
  if (commentName) commentName.value = '';
  if (commentMessage) commentMessage.value = '';
  if (commentConfirmation) commentConfirmation.classList.add('hidden');
  nextBtn.textContent = 'Next Question';
  loadQuestion(0);
}

if (skipBtn) skipBtn.addEventListener('click', finishIntro);
if (startBtn) startBtn.addEventListener('click', showGame);
if (nextBtn) nextBtn.addEventListener('click', () => {
  if (currentQuestion < QUESTIONS.length - 1) {
    loadQuestion(currentQuestion + 1);
  } else {
    showFinalScreen();
  }
});
if (restartBtn) restartBtn.addEventListener('click', restartGame);
if (restartFromFinalBtn) restartFromFinalBtn.addEventListener('click', restartGame);
if (leaveFeedbackBtn) leaveFeedbackBtn.addEventListener('click', scrollToFeedbackSection);
if (submitCommentBtn) submitCommentBtn.addEventListener('click', async () => {
  const name = commentName ? commentName.value.trim() : '';
  const message = commentMessage ? commentMessage.value.trim() : '';

  if (!name) {
    if (commentConfirmation) {
      commentConfirmation.textContent = 'Please add your name so Patric knows who to follow up with.';
      commentConfirmation.classList.remove('hidden');
    }
    return;
  }

  if (!message) {
    if (commentConfirmation) {
      commentConfirmation.textContent = 'Please add a quick note before you send it to Patric.';
      commentConfirmation.classList.remove('hidden');
    }
    return;
  }

  if (commentConfirmation) {
    commentConfirmation.textContent = 'Sending your note to Patric...';
    commentConfirmation.classList.remove('hidden');
  }

  try {
    const result = await submitFeedbackMessage(name, message);
    if (commentConfirmation) {
      commentConfirmation.textContent = result.mode === 'email'
        ? `Thanks, ${name}. Your note was sent to Patric.`
        : result.mode === 'saved'
          ? `Thanks, ${name}. Your note was received for Patric.`
          : `Thanks, ${name}. Your note was saved and will be shared with Patric.`;
      commentConfirmation.classList.remove('hidden');
    }
    if (commentName) commentName.value = '';
    if (commentMessage) commentMessage.value = '';
    try {
      const stats = await loadLiveStats();
      renderLiveStats(stats);
    } catch (error) {
      console.error('Feedback stats refresh failed', error);
    }
  } catch (error) {
    console.error('Feedback submit failed', error);
    if (commentConfirmation) {
      commentConfirmation.textContent = 'Something went wrong while sending your note. Please try again in a moment.';
      commentConfirmation.classList.remove('hidden');
    }
  }
});


const themeToggle = document.getElementById('themeToggle');

function getSystemTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const isLight = theme === 'light';
  document.documentElement.classList.toggle('light', isLight);
  document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
  if (themeToggle) {
    themeToggle.setAttribute('aria-pressed', isLight ? 'true' : 'false');
    themeToggle.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
  }
}

applyTheme(getSystemTheme());

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const nextTheme = document.documentElement.classList.contains('light') ? 'dark' : 'light';
    applyTheme(nextTheme);
  });
}

window.addEventListener('pointerdown', async () => {
  const ctx = initAudio();
  if (ctx?.state === 'suspended') await ctx.resume();
  if (!introStarted && !introDone) beginIntroSequence();
}, { once: true });

const introPhish = document.getElementById("introPhish");
const gamePhish = document.getElementById("gamePhish");

swimFish(introPhish, 70);
swimFish(gamePhish, 15);

activateScene(0);


(function () {
  function syncViewportMode() {
    document.documentElement.classList.toggle('is-mobile-intro', window.innerWidth <= 900);
  }
  syncViewportMode();
  window.addEventListener('resize', syncViewportMode, { passive: true });
})();


let lastNotificationTemplateKey = null;



/* === REAL FIX: bubbles restore + safe intro click === */
(function () {
  let __spotLastKey = null;

  function fixedSpawnNotificationBubble() {
    if (!notificationField) return;

    const templates = [
      { key: 'A', el: notifyTemplateA },
      { key: 'B', el: notifyTemplateB },
      { key: 'C', el: notifyTemplateC }
    ].filter((item) => item.el);

    if (!templates.length) return;

    const visibleKeys = new Set(
      Array.from(notificationField.querySelectorAll('.notify-card.live'))
        .map((el) => el.dataset.templateKey)
        .filter(Boolean)
    );

    let pool = templates.filter((item) => !visibleKeys.has(item.key) && item.key !== __spotLastKey);
    if (!pool.length) pool = templates.filter((item) => !visibleKeys.has(item.key));
    if (!pool.length) pool = templates;

    const selected = pool[Math.floor(Math.random() * pool.length)];
    __spotLastKey = selected.key;

    const clone = selected.el.cloneNode(true);
    clone.removeAttribute('id');
    clone.classList.add('live');
    clone.dataset.templateKey = selected.key;

    const cardW = window.innerWidth <= 900 ? 220 : 250;
    const cardH = window.innerWidth <= 900 ? 80 : 90;
    const pad = 28;

    const blockers = Array.from(document.querySelectorAll('.intro-center, .caption, .center-prompt, .title-card'))
      .filter((el) => el && el.offsetParent !== null)
      .map((el) => el.getBoundingClientRect());

    function overlaps(x, y) {
      const r = { left: x, top: y, right: x + cardW, bottom: y + cardH };
      return blockers.some((b) => !(r.right < b.left - 18 || r.left > b.right + 18 || r.bottom < b.top - 18 || r.top > b.bottom + 18));
    }

    const zones = [
      { xMin: pad, xMax: Math.max(pad, window.innerWidth * 0.22), yMin: 90, yMax: Math.max(110, window.innerHeight * 0.28) },
      { xMin: Math.max(pad, window.innerWidth * 0.78), xMax: Math.max(window.innerWidth * 0.78, window.innerWidth - cardW - pad), yMin: 90, yMax: Math.max(110, window.innerHeight * 0.28) },
      { xMin: pad, xMax: Math.max(pad, window.innerWidth * 0.22), yMin: Math.max(110, window.innerHeight * 0.62), yMax: Math.max(120, window.innerHeight - cardH - 90) },
      { xMin: Math.max(pad, window.innerWidth * 0.78), xMax: Math.max(window.innerWidth * 0.78, window.innerWidth - cardW - pad), yMin: Math.max(110, window.innerHeight * 0.62), yMax: Math.max(120, window.innerHeight - cardH - 90) }
    ];

    let x = pad;
    let y = 100;
    let placed = false;

    for (let i = 0; i < 20; i++) {
      const zone = zones[Math.floor(Math.random() * zones.length)];
      const xr = Math.max(1, zone.xMax - zone.xMin);
      const yr = Math.max(1, zone.yMax - zone.yMin);
      const cx = Math.floor(zone.xMin + Math.random() * xr);
      const cy = Math.floor(zone.yMin + Math.random() * yr);
      if (!overlaps(cx, cy)) {
        x = cx;
        y = cy;
        placed = true;
        break;
      }
    }

    if (!placed) {
      x = pad;
      y = 100;
    }

    clone.style.left = `${x}px`;
    clone.style.top = `${y}px`;
    notificationField.appendChild(clone);
    setTimeout(() => clone.remove(), 3800);
  }

  function fixedStartNotificationBubbles() {
    if (typeof clearNotifications === 'function') clearNotifications();
    fixedSpawnNotificationBubble();
    if (typeof notifyInterval !== 'undefined' && notifyInterval) clearInterval(notifyInterval);
    notifyInterval = setInterval(fixedSpawnNotificationBubble, 1800);
  }

  const originalActivateScene = typeof activateScene === 'function' ? activateScene : null;
  if (originalActivateScene) {
    activateScene = function(index) {
      originalActivateScene(index);
      if (index === 0) fixedStartNotificationBubbles();
    };
  }

  document.addEventListener('pointerdown', async function safeIntroStart() {
    if (typeof initAudio === 'function') {
      const ctx = initAudio();
      if (ctx && ctx.state === 'suspended') await ctx.resume();
    }
    if (typeof introStarted !== 'undefined' && typeof introDone !== 'undefined' && !introStarted && !introDone && typeof beginIntroSequence === 'function') {
      beginIntroSequence();
    }
  }, { once: true });
})();

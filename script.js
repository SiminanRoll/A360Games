
// ===== THEME SYSTEM =====
(function() {
  const root = document.documentElement;
  const STORAGE_KEY = 'a360-theme';

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
    // Update toggle UI
    const icon = document.getElementById('themeIcon');
    const label = document.getElementById('themeLabel');
    if (icon) icon.textContent = theme === 'light' ? '☀️' : '🌙';
    if (label) label.textContent = theme === 'light' ? 'Light' : 'Dark';
  }

  function getCurrentTheme() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  // Always read system preference fresh — only use stored value if user manually toggled THIS session
  // (prevents stale localStorage from a dev/test session overriding the browser default)
  const stored = localStorage.getItem(STORAGE_KEY);
  const systemTheme = getSystemTheme();

  // If stored value matches system, treat it as "no manual override" so system changes still apply
  const initial = (stored && stored !== systemTheme) ? stored : systemTheme;
  applyTheme(initial);

  // Listen for system theme changes — apply unless user manually picked the opposite
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    const manualOverride = localStorage.getItem(STORAGE_KEY);
    const newSystem = e.matches ? 'light' : 'dark';
    // Only skip if user explicitly picked the OTHER theme
    if (!manualOverride || manualOverride === newSystem) {
      applyTheme(newSystem);
    }
  });

  // Wire up toggle button after DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    function syncAllToggles(theme) {
      // Sync all toggle UIs on page
      document.querySelectorAll('[id^="themeIcon"]').forEach(el => {
        el.textContent = theme === 'light' ? '☀️' : '🌙';
      });
      document.querySelectorAll('[id^="themeLabel"]').forEach(el => {
        el.textContent = theme === 'light' ? 'Light' : 'Dark';
      });
    }

    // Initial sync
    syncAllToggles(getCurrentTheme());

    document.querySelectorAll('#themeToggle, #themeToggleGame').forEach(btn => {
      if (btn) {
        btn.addEventListener('click', function() {
          const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
          applyTheme(next);
          syncAllToggles(next);
          localStorage.setItem(STORAGE_KEY, next);
        });
      }
    });
  });
})();


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

// ===== AUDIO ENGINE =====
let reverbNode = null;

function initAudio() {
  if (audioCtx) return audioCtx;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) { soundEnabled = false; return null; }
  audioCtx = new AudioContextClass();
  // Build a simple plate reverb via convolver
  try {
    const rate = audioCtx.sampleRate;
    const len = rate * 1.4;
    const buf = audioCtx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const ch = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
      }
    }
    reverbNode = audioCtx.createConvolver();
    reverbNode.buffer = buf;
    const reverbGain = audioCtx.createGain();
    reverbGain.gain.value = 0.18;
    reverbNode.connect(reverbGain);
    reverbGain.connect(audioCtx.destination);
  } catch(e) { reverbNode = null; }
  return audioCtx;
}

/**
 * Play a rich tone with ADSR envelope and optional harmonics.
 * options: { frequency, type, attack, decay, sustain, release, gain, delay, detune, harmonics, reverb }
 */
function tone({ frequency = 440, type = 'sine', attack = 0.012, decay = 0.08, sustain = 0.6,
                release = 0.22, gain = 0.028, delay = 0, detune = 0,
                harmonics = false, reverb = true } = {}) {
  if (!soundEnabled) return;
  const ctx = initAudio();
  if (!ctx) return;
  const t = ctx.currentTime + delay;

  function makeVoice(freq, vol, det = 0) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (det) osc.detune.setValueAtTime(det, t);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(vol, t + attack);
    env.gain.linearRampToValueAtTime(vol * sustain, t + attack + decay);
    env.gain.setValueAtTime(vol * sustain, t + attack + decay);
    env.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay + release);
    osc.connect(env);
    env.connect(ctx.destination);
    if (reverb && reverbNode) env.connect(reverbNode);
    osc.start(t);
    osc.stop(t + attack + decay + release + 0.05);
  }

  makeVoice(frequency, gain);
  // Slight stereo warmth via detuned pair
  if (harmonics) {
    makeVoice(frequency * 2, gain * 0.18, detune + 4);
    makeVoice(frequency * 3, gain * 0.08, detune - 3);
  }
  // Gentle detuned double for richness
  makeVoice(frequency, gain * 0.22, detune + 6);
}

function chord(freqs, opts = {}) {
  freqs.forEach((f, i) => tone({ ...opts, frequency: f, delay: (opts.delay || 0) + i * 0.018 }));
}

// UI feedback click — quick crisp tick
function playClickSound() {
  tone({ frequency: 880, type: 'sine', attack: 0.004, decay: 0.04, sustain: 0.1, release: 0.06, gain: 0.018, reverb: false });
}

// Correct answer — bright ascending arp
function playCorrectSound() {
  const notes = [523, 659, 784];
  notes.forEach((f, i) => tone({ frequency: f, type: 'sine', attack: 0.01, decay: 0.10, sustain: 0.5, release: 0.28, gain: 0.026, delay: i * 0.09, harmonics: true }));
  // Sparkle high
  tone({ frequency: 1047, type: 'sine', attack: 0.006, decay: 0.06, sustain: 0.2, release: 0.18, gain: 0.014, delay: 0.26 });
}

// Wrong answer — soft descending minor 3rd
function playWrongSound() {
  tone({ frequency: 330, type: 'triangle', attack: 0.01, decay: 0.14, sustain: 0.4, release: 0.28, gain: 0.024, delay: 0 });
  tone({ frequency: 277, type: 'triangle', attack: 0.01, decay: 0.18, sustain: 0.3, release: 0.32, gain: 0.020, delay: 0.12 });
}

// Scene transition — airy whoosh feel
function playSceneSound(index) {
  if (index === 0) {
    // Intro ambient hum: open 5th
    chord([110, 165, 220], { type: 'sine', attack: 0.25, decay: 0.4, sustain: 0.5, release: 0.8, gain: 0.010 });
  } else if (index === 1) {
    tone({ frequency: 440, type: 'sine', attack: 0.02, decay: 0.10, sustain: 0.3, release: 0.22, gain: 0.018 });
    tone({ frequency: 660, type: 'sine', attack: 0.02, decay: 0.08, sustain: 0.2, release: 0.18, gain: 0.012, delay: 0.18 });
  } else if (index === 2) {
    // Tension: descending half-steps
    [740, 698, 659].forEach((f, i) => tone({ frequency: f, type: 'sine', attack: 0.008, decay: 0.10, sustain: 0.3, release: 0.20, gain: 0.018, delay: i * 0.28 }));
  } else if (index === 3) {
    // Title card: bright major triad swell
    chord([392, 494, 587], { type: 'triangle', attack: 0.05, decay: 0.20, sustain: 0.55, release: 0.50, gain: 0.022, harmonics: true });
  }
}

// Enter game — smooth rising major arpeggio, single voice per note, no clashing
function playEnterGameSound() {
  // Clean C major arpeggio: C4 → E4 → G4 → C5, spaced evenly
  [261, 329, 392, 523].forEach((f, i) =>
    tone({ frequency: f, type: 'sine', attack: 0.015, decay: 0.14, sustain: 0.35,
           release: 0.32, gain: 0.024, delay: i * 0.11, harmonics: false, reverb: true })
  );
  // Soft warm chord bloom underneath at the end
  chord([261, 329, 392], { type: 'triangle', attack: 0.06, decay: 0.20, sustain: 0.45,
    release: 0.55, gain: 0.014, delay: 0.40, harmonics: false });
}

// Perfect score — jubilant fanfare
function playVictorySong() {
  // Bass hit
  tone({ frequency: 196, type: 'triangle', attack: 0.008, decay: 0.22, sustain: 0.4, release: 0.40, gain: 0.030, delay: 0 });
  // Rising triad
  chord([392, 494, 587], { type: 'triangle', attack: 0.015, decay: 0.20, sustain: 0.55, release: 0.45, gain: 0.026, delay: 0.05, harmonics: true });
  // Second chord up a 4th
  chord([523, 659, 784], { type: 'triangle', attack: 0.015, decay: 0.22, sustain: 0.55, release: 0.50, gain: 0.026, delay: 0.55, harmonics: true });
  // Octave jump sparkle
  tone({ frequency: 1047, type: 'sine', attack: 0.008, decay: 0.10, sustain: 0.3, release: 0.25, gain: 0.018, delay: 0.72 });
  // Final flourish: high arp
  [784, 880, 1047, 1175].forEach((f, i) => tone({ frequency: f, type: 'sine', attack: 0.006, decay: 0.08, sustain: 0.2, release: 0.22, gain: 0.016, delay: 0.95 + i * 0.09 }));
  // Warm low chord landing
  chord([261, 329, 392], { type: 'triangle', attack: 0.04, decay: 0.30, sustain: 0.6, release: 0.80, gain: 0.022, delay: 1.35, harmonics: true });
}

// Partial score — hopeful, bittersweet
function playPartialSong() {
  chord([330, 415, 494], { type: 'triangle', attack: 0.02, decay: 0.18, sustain: 0.45, release: 0.50, gain: 0.024, delay: 0, harmonics: true });
  tone({ frequency: 494, type: 'sine', attack: 0.01, decay: 0.14, sustain: 0.35, release: 0.38, gain: 0.018, delay: 0.45 });
  chord([370, 466, 554], { type: 'triangle', attack: 0.025, decay: 0.20, sustain: 0.45, release: 0.55, gain: 0.022, delay: 0.72, harmonics: true });
}

// Zero score — gentle consolation (not harsh)
function playLoseSong() {
  tone({ frequency: 294, type: 'triangle', attack: 0.02, decay: 0.22, sustain: 0.4, release: 0.50, gain: 0.024, delay: 0 });
  tone({ frequency: 247, type: 'triangle', attack: 0.02, decay: 0.24, sustain: 0.35, release: 0.55, gain: 0.020, delay: 0.32 });
  tone({ frequency: 220, type: 'triangle', attack: 0.02, decay: 0.30, sustain: 0.35, release: 0.65, gain: 0.020, delay: 0.68 });
  // Soft low resolution
  tone({ frequency: 165, type: 'sine', attack: 0.04, decay: 0.40, sustain: 0.5, release: 0.80, gain: 0.018, delay: 1.0 });
}

function playFinalSong() {
  if (totalCorrect === QUESTIONS.length) { playVictorySong(); return; }
  if (totalCorrect === 0) { playLoseSong(); return; }
  playPartialSong();
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

// Extended pool of notification messages with variety
const NOTIFY_POOL = [
  { accent: 'cyan',   dot: '',       title: 'Inbox activity',        body: '3 new messages detected' },
  { accent: 'amber',  dot: 'amber',  title: 'Urgent request',        body: 'Review before you click' },
  { accent: 'purple', dot: 'purple', title: 'Email challenge',        body: 'Can your team spot it?' },
  { accent: 'cyan',   dot: '',       title: 'IT Security Alert',      body: 'Suspicious link detected' },
  { accent: 'amber',  dot: 'amber',  title: 'Password Expiry',        body: 'Reset required within 24 hrs' },
  { accent: 'purple', dot: 'purple', title: 'HR Notification',        body: 'Action needed: payroll update' },
  { accent: 'cyan',   dot: '',       title: 'Microsoft 365',          body: 'Verify your account now' },
  { accent: 'amber',  dot: 'amber',  title: 'Wire Transfer Request',  body: 'Approve before close of day' },
  { accent: 'purple', dot: 'purple', title: 'Shared Document',        body: 'Click to view: Q4_Financials' },
  { accent: 'cyan',   dot: '',       title: 'Delivery Notice',        body: 'Confirm your address below' },
  { accent: 'amber',  dot: 'amber',  title: 'CEO Message',            body: 'Need gift cards ASAP – urgent' },
  { accent: 'purple', dot: 'purple', title: 'Dropbox',                body: 'File shared with you – open now' },
  { accent: 'cyan',   dot: '',       title: 'Account Suspended',      body: 'Verify identity to restore' },
  { accent: 'amber',  dot: 'amber',  title: 'Invoice #4821',          body: 'Payment due: click to review' },
  { accent: 'purple', dot: 'purple', title: 'VPN Access Request',     body: 'Approve new device login?' },
];

let lastNotifyIndex = -1;
const activeNotifySet = new Set();

function spawnNotificationBubble() {
  if (!notificationField) return;

  // Pick a random message, never the same as last, never one currently on screen
  let idx;
  let attempts = 0;
  do {
    idx = Math.floor(Math.random() * NOTIFY_POOL.length);
    attempts++;
  } while ((idx === lastNotifyIndex || activeNotifySet.has(idx)) && attempts < 20);
  lastNotifyIndex = idx;
  activeNotifySet.add(idx);

  const msg = NOTIFY_POOL[idx];

  // Build the card from scratch so we don't depend on template cloning
  const card = document.createElement('div');
  card.className = `notify-card notify-template ${msg.accent} live`;

  const dot = document.createElement('div');
  dot.className = `float-dot${msg.dot ? ' ' + msg.dot : ''}`;

  const copy = document.createElement('div');
  copy.className = 'float-copy';
  copy.innerHTML = `<strong>${msg.title}</strong><span>${msg.body}</span>`;

  card.appendChild(dot);
  card.appendChild(copy);

  // Safe spawn zone: avoid the center card (roughly center 40% x 30-70% y)
  const W = window.innerWidth;
  const H = window.innerHeight;
  const cardW = 260;
  const cardH = 70;
  const safeLeft = W * 0.30;
  const safeRight = W * 0.70;
  const safeTop = H * 0.30;
  const safeBot = H * 0.70;

  let x, y, safe = false, tries = 0;
  while (!safe && tries < 30) {
    x = Math.max(16, Math.floor(Math.random() * Math.max(80, W - cardW - 24)));
    y = Math.max(70, Math.floor(Math.random() * Math.max(160, H - cardH - 80)));
    // Outside the center safe zone
    const xOk = x + cardW < safeLeft || x > safeRight;
    const yOk = y + cardH < safeTop || y > safeBot;
    safe = xOk || yOk;
    tries++;
  }

  card.style.left = `${x}px`;
  card.style.top = `${y}px`;
  notificationField.appendChild(card);

  const lifetime = 2800;
  setTimeout(() => {
    card.remove();
    activeNotifySet.delete(idx);
  }, lifetime);
}

function startNotificationBubbles() {
  clearNotifications();
  // Initial bubble after a short delay so the scene settles first
  setTimeout(spawnNotificationBubble, 600);
  // Slower cadence: one every 2.2s instead of 0.9s
  notifyInterval = setInterval(spawnNotificationBubble, 2200);
}

function activateScene(index, silent = false) {
  if (index > scenes.length - 1) return;
  scenes.forEach((scene, i) => scene.classList.toggle('active', i === index));
  currentScene = index;
  setControlCopy(SCENES[index].label);

  if (index === 1 && laptop) {
    laptop.classList.remove('closed');
    void laptop.offsetWidth;
    laptop.classList.add('closed');
  }

  if (!silent) {
    if (index === 0) {
      playSceneSound(0);
      startNotificationBubbles();
    } else {
      clearNotifications();
    }
    if (index === 1) playSceneSound(1);
    if (index === 2) playSceneSound(2);
    if (index === 3) playSceneSound(3);
  } else {
    if (index === 0) startNotificationBubbles();
    else clearNotifications();
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

function finishIntro(silent = false) {
  introDone = true;
  clearTimeout(sceneTimer);
  clearInterval(progressTimer);
  setControlCopy('Intro complete. Spot the Phish is ready.');
  setProgressWidth('100%');
  activateScene(3, silent);
}

function showGame() {
  clearNotifications();
  finishIntro(true); // silent — we play our own enter sound
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

  if (isCorrect) { playCorrectSound(); } else { playWrongSound(); }
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

// Feedback CTA — scroll to comment panel and focus name field
const feedbackCtaBtn = document.getElementById('feedbackCtaBtn');
if (feedbackCtaBtn) {
  feedbackCtaBtn.addEventListener('click', () => {
    const panel = document.getElementById('commentPanel');
    const gameScreen = document.getElementById('gameScreen');
    if (panel && gameScreen) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        const nameInput = document.getElementById('commentName');
        if (nameInput) nameInput.focus();
      }, 500);
    }
  });
}
if (nextBtn) nextBtn.addEventListener('click', () => {
  if (currentQuestion < QUESTIONS.length - 1) {
    loadQuestion(currentQuestion + 1);
  } else {
    showFinalScreen();
  }
});
if (restartBtn) restartBtn.addEventListener('click', restartGame);
if (restartFromFinalBtn) restartFromFinalBtn.addEventListener('click', restartGame);
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

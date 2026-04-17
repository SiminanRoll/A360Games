
const scenes = Array.from(document.querySelectorAll('.scene'));
const progressFill = document.getElementById('progressFill');
const controlCopy = document.getElementById('controlCopy');
const skipBtn = document.getElementById('skipBtn');
const startBtn = document.getElementById('startBtn');
const experience = document.getElementById('experience');
const gameScreen = document.getElementById('gameScreen');

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

const SCENES = [
  { index: 0, duration: 5200, label: 'Arrival scene…' },
  { index: 1, duration: 4600, label: 'Desk setup…' },
  { index: 2, duration: 5200, label: 'Inbox tension…' },
  { index: 3, duration: 999999, label: 'Title card ready.' }
];

const QUESTIONS = [
  {
    label: 'Scenario 1',
    title: 'Which message would be most likely to get clicked first?',
    prompt: 'Think about urgency, familiarity, and what would feel believable during a busy workday.',
    correct: 'B',
    insightTitle: 'Gift card scams are surprisingly effective.',
    insight: 'They feel personal, urgent, and often appear to come from someone in authority. Busy staff may respond before slowing down to verify.',
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
    insightTitle: 'Account-related messages reliably pull attention.',
    insight: 'People are trained to care about account access. Even cautious users may open the message to check whether it is legitimate.',
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
    insightTitle: 'Vendor-style messages can blend in quietly.',
    insight: 'Routine document shares and invoice-style follow-ups often slip past people because they do not feel dramatic. That low drama is exactly why they work.',
    choices: [
      { id: 'A', title: 'HR Benefits Update', text: 'Review your benefits information before end of day.', tag: 'Internal admin theme', votes: 31 },
      { id: 'B', title: 'Package Pickup Reminder', text: 'A package is waiting. Confirm delivery preferences.', tag: 'Everyday household noise', votes: 18 },
      { id: 'C', title: 'Shared Document from Vendor', text: 'Invoice revision attached. Please review before processing.', tag: 'Quiet workflow blend-in', votes: 51 }
    ]
  }
];

let currentScene = 0;
let soundEnabled = true;
let audioCtx = null;
let introDone = false;
let sceneTimer = null;
let progressTimer = null;
let progressStart = 0;
let progressDuration = 0;

let currentQuestion = 0;
let answered = false;
let totalAnswered = 0;
let totalCorrect = 0;

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

function activateScene(index) {
  if (index > scenes.length - 1) return;
  scenes.forEach((scene, i) => scene.classList.toggle('active', i === index));
  currentScene = index;
  controlCopy.textContent = SCENES[index].label;

  if (index === 0) {
    chord([220, 330, 440], { type: 'triangle', duration: 1.2, gain: 0.012 });
  }
  if (index === 1) {
    tone({ frequency: 250, type: 'triangle', duration: 0.2, gain: 0.03 });
    tone({ frequency: 520, type: 'sine', duration: 0.25, gain: 0.02, delay: 1.7 });
  }
  if (index === 2) {
    tone({ frequency: 880, type: 'sine', duration: 0.08, gain: 0.032, delay: 0.55 });
    tone({ frequency: 780, type: 'sine', duration: 0.08, gain: 0.032, delay: 1.08 });
    tone({ frequency: 680, type: 'sine', duration: 0.08, gain: 0.032, delay: 1.62 });
    chord([180, 240], { type: 'sawtooth', duration: 1.8, gain: 0.006, delay: 2.2 });
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
    progressFill.style.width = '100%';
  }
}

function startProgress(duration) {
  progressStart = performance.now();
  progressDuration = duration;
  progressFill.style.width = '0%';
  progressTimer = setInterval(() => {
    const elapsed = performance.now() - progressStart;
    const pct = Math.min(100, (elapsed / progressDuration) * 100);
    progressFill.style.width = pct + '%';
    if (pct >= 100) clearInterval(progressTimer);
  }, 40);
}

function finishIntro() {
  if (introDone) return;
  introDone = true;
  clearTimeout(sceneTimer);
  clearInterval(progressTimer);
  controlCopy.textContent = 'Intro complete. Spot the Phish is ready.';
  progressFill.style.width = '100%';
  activateScene(3);
}

function showGame() {
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
  resultsPanel.classList.add('hidden');
  nextBtn.classList.add('hidden');
  restartBtn.classList.add('hidden');

  choicesEl.innerHTML = '';
  q.choices.forEach(choice => {
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
  const isCorrect = choiceId === q.correct;
  if (isCorrect) totalCorrect += 1;

  Array.from(choicesEl.querySelectorAll('.choice-btn')).forEach(btn => {
    const id = btn.dataset.choiceId;
    btn.disabled = true;
    btn.classList.add('selected');
    if (id === q.correct) btn.classList.add('correct');
    if (id === choiceId && id !== q.correct) btn.classList.add('incorrect');
  });

  resultHeadline.textContent = isCorrect ? 'Nice catch.' : 'That one slips by a lot of teams.';
  resultBody.textContent = q.insight;
  statGrid.innerHTML = '';

  q.choices.forEach(choice => {
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
    restartBtn.textContent = `Play Again • Score ${totalCorrect}/${totalAnswered}`;
    restartBtn.classList.remove('hidden');
  }

  tone({ frequency: isCorrect ? 640 : 240, type: isCorrect ? 'triangle' : 'sawtooth', duration: 0.25, gain: 0.03 });
  if (isCorrect) tone({ frequency: 820, type: 'sine', duration: 0.22, gain: 0.02, delay: 0.08 });
}

function restartGame() {
  currentQuestion = 0;
  answered = false;
  totalAnswered = 0;
  totalCorrect = 0;
  loadQuestion(0);
}

skipBtn.addEventListener('click', finishIntro);
startBtn.addEventListener('click', showGame);
nextBtn.addEventListener('click', () => loadQuestion(currentQuestion + 1));
restartBtn.addEventListener('click', restartGame);

window.addEventListener('pointerdown', async () => {
  const ctx = initAudio();
  if (ctx?.state === 'suspended') await ctx.resume();
}, { once: true });

activateScene(0);

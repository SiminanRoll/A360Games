const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'submissions.json');

const QUESTION_SEEDS = [
  { A: 24, B: 53, C: 23, correct: 'B' },
  { A: 47, B: 29, C: 24, correct: 'A' },
  { A: 31, B: 18, C: 51, correct: 'C' }
];

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ submissions: [] }, null, 2));
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

function safeReadData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.submissions)) {
      return { submissions: [] };
    }
    return parsed;
  } catch (error) {
    console.error('Failed reading submissions.json', error);
    return { submissions: [] };
  }
}

function safeWriteData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function buildStats(submissions) {
  const totalQuestions = QUESTION_SEEDS.length;
  const totalAttempts = submissions.length;
  const feedbackCount = submissions.filter((item) => item.feedback && item.feedback.trim()).length;
  const totalScore = submissions.reduce((sum, item) => sum + Number(item.score || 0), 0);
  const averageScore = totalAttempts ? totalScore / totalAttempts : 2;
  const perfectScores = submissions.filter((item) => Number(item.score || 0) === totalQuestions).length;
  const perfectScoreRate = totalAttempts ? (perfectScores / totalAttempts) * 100 : 0;

  const perQuestionCounts = QUESTION_SEEDS.map((seed) => ({
    A: seed.A,
    B: seed.B,
    C: seed.C,
    total: seed.A + seed.B + seed.C,
    misses: seed.A + seed.B + seed.C - seed[seed.correct]
  }));

  submissions.forEach((submission) => {
    const answers = Array.isArray(submission.answers) ? submission.answers : [];
    answers.forEach((answer, index) => {
      if (!perQuestionCounts[index] || !['A', 'B', 'C'].includes(answer)) return;
      perQuestionCounts[index][answer] += 1;
      perQuestionCounts[index].total += 1;
      if (answer !== QUESTION_SEEDS[index].correct) {
        perQuestionCounts[index].misses += 1;
      }
    });
  });

  const aggregateCounts = { A: 0, B: 0, C: 0, total: 0 };
  perQuestionCounts.forEach((question) => {
    aggregateCounts.A += question.A;
    aggregateCounts.B += question.B;
    aggregateCounts.C += question.C;
    aggregateCounts.total += question.total;
  });

  const questionBreakdowns = perQuestionCounts.map((question, index) => {
    const total = question.total || 1;
    return {
      questionIndex: index,
      A: Math.round((question.A / total) * 100),
      B: Math.round((question.B / total) * 100),
      C: Math.round((question.C / total) * 100),
      mostSelected: ['A', 'B', 'C'].sort((a, b) => question[b] - question[a])[0],
      missRate: Math.round((question.misses / total) * 100)
    };
  });

  const aggregateBreakdown = {
    A: Math.round((aggregateCounts.A / aggregateCounts.total) * 100),
    B: Math.round((aggregateCounts.B / aggregateCounts.total) * 100),
    C: Math.round((aggregateCounts.C / aggregateCounts.total) * 100)
  };

  const hardestQuestionIndex = questionBreakdowns
    .map((item, index) => ({ index, missRate: item.missRate }))
    .sort((a, b) => b.missRate - a.missRate)[0]?.index ?? 0;

  return {
    totalAttempts,
    feedbackCount,
    averageScore: Number(averageScore.toFixed(2)),
    roundedAverageScore: Math.round(averageScore * 10) / 10,
    perfectScores,
    perfectScoreRate: Number(perfectScoreRate.toFixed(1)),
    hardestQuestion: hardestQuestionIndex + 1,
    aggregateBreakdown,
    questionBreakdowns
  };
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    auth: { user, pass }
  });
}

async function maybeSendFeedbackEmail(submission) {
  const transporter = getTransporter();
  const to = process.env.FEEDBACK_TO;
  if (!submission.feedback || !submission.feedback.trim() || !transporter || !to) {
    return { emailed: false };
  }

  const answerText = Array.isArray(submission.answers) ? submission.answers.join(', ') : 'n/a';
  const subject = 'Spot the Phish feedback submission';
  const text = [
    'A new Spot the Phish submission came in.',
    '',
    `Submitted: ${submission.createdAt}`,
    `Score: ${submission.score}/${submission.totalQuestions}`,
    `Answers: ${answerText}`,
    `Session ID: ${submission.sessionId}`,
    '',
    'Feedback:',
    submission.feedback.trim()
  ].join('\n');

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text
  });

  return { emailed: true };
}

app.get('/api/quiz-stats', (req, res) => {
  const data = safeReadData();
  res.json(buildStats(data.submissions));
});

app.post('/api/quiz-result', async (req, res) => {
  try {
    const { sessionId, score, totalQuestions, answers, feedback } = req.body || {};
    if (!sessionId || !Array.isArray(answers) || typeof score !== 'number' || typeof totalQuestions !== 'number') {
      return res.status(400).json({ error: 'Invalid quiz submission payload.' });
    }

    const cleanSubmission = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sessionId: String(sessionId).slice(0, 100),
      score,
      totalQuestions,
      answers: answers.filter((item) => ['A', 'B', 'C'].includes(item)).slice(0, totalQuestions),
      feedback: typeof feedback === 'string' ? feedback.trim().slice(0, 4000) : '',
      createdAt: new Date().toISOString()
    };

    const data = safeReadData();
    const existingIndex = data.submissions.findIndex((item) => item.sessionId === cleanSubmission.sessionId);
    if (existingIndex >= 0) {
      data.submissions[existingIndex] = {
        ...data.submissions[existingIndex],
        ...cleanSubmission,
        feedback: cleanSubmission.feedback || data.submissions[existingIndex].feedback || ''
      };
    } else {
      data.submissions.push(cleanSubmission);
    }
    safeWriteData(data);

    let emailStatus = { emailed: false };
    try {
      emailStatus = await maybeSendFeedbackEmail(cleanSubmission);
    } catch (error) {
      console.error('Feedback email failed', error);
    }

    res.json({
      ok: true,
      emailed: emailStatus.emailed,
      stats: buildStats(data.submissions)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not save quiz result.' });
  }
});

app.post('/api/feedback', async (req, res) => {
  try {
    const { sessionId, feedback } = req.body || {};
    if (!sessionId || typeof feedback !== 'string' || !feedback.trim()) {
      return res.status(400).json({ error: 'Feedback is required.' });
    }

    const data = safeReadData();
    let submission = data.submissions.find((item) => item.sessionId === sessionId);

    if (!submission) {
      submission = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sessionId: String(sessionId).slice(0, 100),
        score: 0,
        totalQuestions: QUESTION_SEEDS.length,
        answers: [],
        feedback: '',
        createdAt: new Date().toISOString()
      };
      data.submissions.push(submission);
    }

    submission.feedback = feedback.trim().slice(0, 4000);
    safeWriteData(data);

    let emailed = false;
    try {
      const result = await maybeSendFeedbackEmail(submission);
      emailed = result.emailed;
    } catch (error) {
      console.error('Feedback email failed', error);
    }

    res.json({ ok: true, emailed, stats: buildStats(data.submissions) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not save feedback.' });
  }
});

app.listen(PORT, () => {
  console.log(`Spot the Phish running at http://localhost:${PORT}`);
});

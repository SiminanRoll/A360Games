Spot the Phish with live stats + feedback email

How to run
1. Open a terminal in this folder
2. Run: npm install
3. Optional: copy .env.example to .env and fill in your SMTP values + FEEDBACK_TO
4. Run: npm start
5. Open: http://localhost:3000

What is included
- Live quiz result saving to data/submissions.json
- Real aggregate stats loaded from /api/quiz-stats
- Quiz submissions saved through /api/quiz-result
- Feedback form saved through /api/feedback
- Optional email sending through SMTP when .env is configured

Important notes
- Do not launch with file:// if you want the live stats and feedback API to work
- If SMTP is not configured, feedback is still saved locally in data/submissions.json
- FEEDBACK_TO should be the inbox that should receive the comments

Suggested .env values
PORT=3000
FEEDBACK_TO=you@example.com
SMTP_HOST=smtp.yourmailserver.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM="Spot the Phish <noreply@yourdomain.com>"

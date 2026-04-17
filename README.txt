Spot the Phish - Static + Supabase Edition

This version is designed for a static host such as DigitalOcean Static Sites.

What changed
- No Express backend
- Live quiz stats use Supabase from the browser
- Feedback can be emailed through a Supabase Edge Function using Resend
- Safe fallback mode still works if Supabase is not configured yet

Files to edit
1. config.js
2. supabase/setup.sql
3. supabase/functions/send-feedback/index.ts

Quick setup
1. Create a Supabase project.
2. In Supabase SQL Editor, run supabase/setup.sql.
3. Create a Resend API key.
4. In Supabase Edge Functions, deploy supabase/functions/send-feedback/index.ts.
5. Set secrets for the edge function:
   - RESEND_API_KEY
   - FEEDBACK_TO_EMAIL
6. Copy your Supabase project URL and anon key into config.js.
7. Copy your deployed edge function URL into config.js as supabaseFeedbackFunctionUrl.
8. Deploy this folder as a static site.

Expected behavior
- Quiz completions are inserted into quiz_submissions.
- Final screen pulls live aggregate stats from Supabase.
- Feedback messages are inserted into quiz_feedback.
- Feedback email is sent by the Supabase Edge Function.

Notes
- The Supabase anon key is safe to use in the browser.
- Do not put a Supabase service role key or Resend API key into config.js.
- If config.js is left blank, the experience still runs using fallback demo stats.

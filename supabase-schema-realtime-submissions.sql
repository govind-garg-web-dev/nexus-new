-- Enable Realtime on challenge_submissions so SubmissionStatus page
-- updates instantly when a submission is approved/rejected by peer reviewers.
-- Run in Supabase → SQL Editor
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_submissions;

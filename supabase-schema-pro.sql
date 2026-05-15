-- ============================================================
-- MATCHBATCH PRO SUBSCRIPTION SCHEMA
-- Run in Supabase → SQL Editor → New Query → paste → Run
-- ============================================================

-- ── Pro status on users ────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pro_plan       TEXT CHECK (pro_plan IN ('monthly','yearly'));

-- ── subscriptions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan            TEXT        NOT NULL CHECK (plan IN ('monthly','yearly')),
  status          TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','expired','cancelled')),
  amount_paise    INT         NOT NULL,   -- 99900 = ₹999
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  starts_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sub_user_idx ON public.subscriptions (user_id, expires_at DESC);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub_select_own" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sub_insert_own" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── pro_courses ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pro_courses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT        NOT NULL CHECK (category IN ('college','coding')),
  title       TEXT        NOT NULL,
  description TEXT        NOT NULL,
  difficulty  TEXT        NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner','intermediate','advanced')),
  lessons     INT         NOT NULL DEFAULT 0,
  duration_hrs FLOAT      NOT NULL DEFAULT 0,
  thumbnail_url TEXT,
  order_idx   INT         NOT NULL DEFAULT 0,
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pro_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses_select" ON public.pro_courses FOR SELECT USING (auth.role() = 'authenticated');

INSERT INTO public.pro_courses (category, title, description, difficulty, lessons, duration_hrs, order_idx) VALUES
  -- College courses
  ('college', 'Data Structures & Algorithms', 'Master arrays, linked lists, trees, graphs, and all classic DSA topics with Indian exam focus.', 'intermediate', 45, 30, 1),
  ('college', 'Database Management Systems', 'SQL, normalization, transactions, indexing — everything for DBMS university exams and interviews.', 'beginner', 30, 18, 2),
  ('college', 'Operating Systems', 'Processes, memory management, scheduling, deadlocks — deep dives with real examples.', 'intermediate', 35, 22, 3),
  ('college', 'Computer Networks', 'OSI model, TCP/IP, routing, DNS, HTTP — explained for both exams and placements.', 'beginner', 28, 16, 4),
  ('college', 'Software Engineering', 'SDLC, design patterns, testing, agile — the full software development lifecycle.', 'beginner', 20, 12, 5),
  ('college', 'Theory of Computation', 'Automata, formal languages, Turing machines — with solved exam problems.', 'advanced', 25, 15, 6),
  -- Coding courses
  ('coding', 'Python for Data Science', 'NumPy, Pandas, Matplotlib, Seaborn — data wrangling and visualization from scratch.', 'beginner', 40, 25, 1),
  ('coding', 'Full-Stack Web Development', 'HTML/CSS → JavaScript → React → Node.js → databases. Build real projects.', 'intermediate', 80, 60, 2),
  ('coding', 'Machine Learning Fundamentals', 'Linear regression to neural networks — with code, math, and intuition.', 'intermediate', 50, 35, 3),
  ('coding', 'System Design', 'Design Twitter, YouTube, WhatsApp — scalability, caching, load balancing, databases.', 'advanced', 30, 20, 4),
  ('coding', 'Competitive Programming', 'Dynamic programming, graphs, segment trees — from Codeforces to ICPC.', 'advanced', 60, 40, 5),
  ('coding', 'DevOps & Cloud Basics', 'Docker, Kubernetes, CI/CD, AWS basics — the tools every backend dev needs.', 'intermediate', 35, 22, 6)
ON CONFLICT DO NOTHING;

-- ── practice_questions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.practice_questions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT        NOT NULL
    CHECK (category IN ('dsa','system_design','interview','aptitude','coding')),
  sub_category TEXT,
  title       TEXT        NOT NULL,
  content     TEXT        NOT NULL,   -- the full question
  difficulty  TEXT        NOT NULL DEFAULT 'medium'
    CHECK (difficulty IN ('easy','medium','hard')),
  answer      TEXT,                  -- shown after user attempts
  hints       TEXT[],
  tags        TEXT[]      NOT NULL DEFAULT '{}',
  is_premium  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.practice_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pq_select" ON public.practice_questions FOR SELECT USING (auth.role() = 'authenticated');

-- Seed practice questions
INSERT INTO public.practice_questions (category, sub_category, title, content, difficulty, answer, tags) VALUES
  -- DSA
  ('dsa', 'Arrays', 'Two Sum', 'Given an array of integers and a target sum, return the indices of two numbers that add up to the target. You cannot use the same element twice.', 'easy', 'Use a hash map. For each element, check if (target - element) exists in the map. O(n) time, O(n) space.', ARRAY['array','hashmap','two-pointers']),
  ('dsa', 'Trees', 'Binary Tree Level Order Traversal', 'Given the root of a binary tree, return the level order traversal of its nodes'' values (i.e., from left to right, level by level).', 'medium', 'Use a queue (BFS). For each level, process all nodes at that level before moving to the next. O(n) time.', ARRAY['tree','bfs','queue']),
  ('dsa', 'Dynamic Programming', 'Longest Common Subsequence', 'Given two strings, find the length of their longest common subsequence. A subsequence is a sequence derived by deleting some characters without changing the order.', 'medium', 'Use a 2D DP table. dp[i][j] = length of LCS of s1[0..i] and s2[0..j]. If characters match, dp[i][j] = dp[i-1][j-1] + 1.', ARRAY['dp','string','classic']),
  ('dsa', 'Graphs', 'Detect Cycle in Directed Graph', 'Given a directed graph, determine if it contains a cycle.', 'medium', 'Use DFS with three-color marking: white (unvisited), gray (in current DFS path), black (fully processed). A cycle exists if we encounter a gray node.', ARRAY['graph','dfs','cycle-detection']),
  ('dsa', 'Sliding Window', 'Minimum Window Substring', 'Find the minimum window in string S that contains all characters of string T.', 'hard', 'Use two pointers with a character frequency map. Expand right pointer, shrink left when all characters are covered. Track minimum window.', ARRAY['sliding-window','string','two-pointers']),
  -- System Design
  ('system_design', 'Databases', 'Design a URL Shortener', 'Design a URL shortening service like bit.ly. Handle 100M URLs/day, read-heavy workload, short latency.', 'medium', 'Key decisions: Base62 encoding for short URLs, NoSQL for scale, CDN for read performance, consistent hashing for distributed storage, rate limiting.', ARRAY['url-shortener','nosql','hashing','cdn']),
  ('system_design', 'Scaling', 'Design Twitter Feed', 'Design a Twitter-like feed system. Users follow others, timelines show recent posts from followed accounts.', 'hard', 'Fan-out on write (push to followers'' feeds) for most users. Fan-out on read for celebrity accounts. Use Redis for feed cache, Kafka for async processing.', ARRAY['feed','fanout','cache','kafka']),
  ('system_design', 'Messaging', 'Design WhatsApp', 'Design a real-time chat application like WhatsApp. Support 1-on-1 and group chats, delivery receipts, offline message storage.', 'hard', 'WebSocket connections per user, message queues for offline delivery, distributed databases for messages, end-to-end encryption, ACK system for receipts.', ARRAY['websocket','messaging','distributed','e2e']),
  -- Interview
  ('interview', 'Behavioral', 'Tell me about a time you failed', 'HR Interview: Describe a significant failure in a project or team situation. What happened, what did you learn, and how did you handle it?', 'medium', 'Use the STAR method: Situation, Task, Action, Result. Be specific, own the failure, focus on learnings. Avoid blaming others. Show growth mindset.', ARRAY['behavioral','hr','star-method','failure']),
  ('interview', 'Technical HR', 'Why should we hire you over others?', 'Classic interview question. How do you differentiate yourself while remaining humble and factual?', 'easy', 'Combine: specific technical skills (with proof), soft skills (with examples), genuine interest in the role/company, and one unique thing about you. Be concrete, not generic.', ARRAY['hr','differentiation','self-promotion']),
  ('interview', 'Leadership', 'Describe a conflict with a teammate', 'Tell me about a time you had a disagreement with a colleague or team member. How did you handle it?', 'medium', 'Focus on professional disagreement (not personal). Show active listening, seeking to understand their perspective, finding common ground, and a constructive resolution.', ARRAY['behavioral','conflict','leadership','teamwork']),
  -- Aptitude
  ('aptitude', 'Quant', 'Trains Problem', 'Two trains start from cities A and B at the same time toward each other. City A to B is 300 km. Train 1 speed: 60 km/h, Train 2 speed: 90 km/h. When do they meet?', 'easy', 'They approach each other at 60+90=150 km/h. Time = 300/150 = 2 hours. They meet after 2 hours.', ARRAY['trains','speed-distance','quantitative']),
  ('aptitude', 'Logical', 'Number Series: 2, 6, 12, 20, 30, ?', 'Find the next number in the series: 2, 6, 12, 20, 30, ?', 'easy', '42. The differences are 4, 6, 8, 10, 12. Each difference increases by 2. So 30 + 12 = 42.', ARRAY['series','pattern','logical']),
  -- Coding
  ('coding', 'OOP', 'Design a Library Management System', 'Design classes for a library system: books, members, borrowing, returning, fines. What are the key classes, attributes, and methods?', 'medium', 'Classes: Book (isbn, title, author, copies), Member (id, name, borrowed_books), Library (books, members), BorrowRecord (book, member, due_date). Key methods: borrow(), return(), calculate_fine().', ARRAY['oop','design','classes','real-world']),
  ('coding', 'SQL', 'Find Second Highest Salary', 'Write a SQL query to find the second highest salary from an Employee table.', 'easy', 'SELECT MAX(salary) FROM Employee WHERE salary < (SELECT MAX(salary) FROM Employee). OR use: SELECT salary FROM Employee ORDER BY salary DESC LIMIT 1 OFFSET 1.', ARRAY['sql','aggregation','subquery'])
ON CONFLICT DO NOTHING;

-- ── group_sessions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.group_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT        NOT NULL CHECK (type IN ('discussion','mock_interview')),
  title           TEXT        NOT NULL,
  description     TEXT,
  host_name       TEXT        NOT NULL DEFAULT 'MatchBatch Team',
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_mins   INT         NOT NULL DEFAULT 60,
  max_participants INT        NOT NULL DEFAULT 20,
  meet_link       TEXT,
  status          TEXT        NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming','live','completed','cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.session_registrations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.group_sessions(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_registration UNIQUE (session_id, user_id)
);

ALTER TABLE public.group_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_registrations  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_select"    ON public.group_sessions        FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "sessions_reg_select" ON public.session_registrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_reg_insert" ON public.session_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);

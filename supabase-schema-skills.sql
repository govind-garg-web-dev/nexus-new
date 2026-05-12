-- ============================================================
-- NEXUS — SKILLS SCHEMA (Block 2)
-- Run AFTER supabase-schema-behavioral.sql
-- Supabase → SQL Editor → New Query → paste → Run
-- ============================================================

-- ── skill_challenges ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.skill_challenges (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category            TEXT        NOT NULL CHECK (category IN ('coding','writing','quiz','design')),
  difficulty          SMALLINT    NOT NULL CHECK (difficulty IN (1,2,3)),
  title               TEXT        NOT NULL,
  description         TEXT        NOT NULL,
  time_limit_seconds  INT         NOT NULL DEFAULT 600,
  -- coding
  starter_code        TEXT,
  language_default    TEXT        DEFAULT 'python',
  test_cases          JSONB,
  -- writing
  word_limit          INT,
  -- quiz
  questions           JSONB,
  -- design
  reference_image_url TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── challenge_submissions ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.challenge_submissions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  challenge_id        UUID        NOT NULL REFERENCES public.skill_challenges(id),
  status              TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','passed','failed','under_review')),
  submitted_code      TEXT,
  language            TEXT,
  judge0_results      JSONB,
  submitted_text      TEXT,
  submitted_answers   JSONB,
  score               SMALLINT,
  time_taken_seconds  INT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── badges ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.badges (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  challenge_id    UUID        NOT NULL REFERENCES public.skill_challenges(id),
  submission_id   UUID        NOT NULL REFERENCES public.challenge_submissions(id),
  category        TEXT        NOT NULL,
  difficulty      SMALLINT    NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '18 months'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_badge_per_challenge UNIQUE (user_id, challenge_id)
);

-- ── endorsements ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.endorsements (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  endorser_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endorsee_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category        TEXT        NOT NULL,
  match_event_id  UUID        REFERENCES public.match_events(id),
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_endorse CHECK (endorser_id <> endorsee_id),
  CONSTRAINT one_endorsement_per_pair UNIQUE (endorser_id, endorsee_id, category)
);

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE public.skill_challenges     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endorsements         ENABLE ROW LEVEL SECURITY;

-- challenges: public read
DROP POLICY IF EXISTS "challenges_select" ON public.skill_challenges;
CREATE POLICY "challenges_select" ON public.skill_challenges
  FOR SELECT USING (auth.role() = 'authenticated');

-- submissions: own only
DROP POLICY IF EXISTS "submissions_select" ON public.challenge_submissions;
CREATE POLICY "submissions_select" ON public.challenge_submissions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "submissions_insert" ON public.challenge_submissions;
CREATE POLICY "submissions_insert" ON public.challenge_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "submissions_update" ON public.challenge_submissions;
CREATE POLICY "submissions_update" ON public.challenge_submissions
  FOR UPDATE USING (auth.uid() = user_id);

-- badges: own readable; others can see via profiles join (app layer)
DROP POLICY IF EXISTS "badges_select" ON public.badges;
CREATE POLICY "badges_select" ON public.badges
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "badges_insert" ON public.badges;
CREATE POLICY "badges_insert" ON public.badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- endorsements: authenticated read; own insert
DROP POLICY IF EXISTS "endorsements_select" ON public.endorsements;
CREATE POLICY "endorsements_select" ON public.endorsements
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "endorsements_insert" ON public.endorsements;
CREATE POLICY "endorsements_insert" ON public.endorsements
  FOR INSERT WITH CHECK (auth.uid() = endorser_id);

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS submissions_user_idx     ON public.challenge_submissions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS submissions_challenge_idx ON public.challenge_submissions (challenge_id);
CREATE INDEX IF NOT EXISTS badges_user_idx          ON public.badges (user_id);
CREATE INDEX IF NOT EXISTS badges_expiry_idx        ON public.badges (expires_at);
CREATE INDEX IF NOT EXISTS endorsements_endorsee_idx ON public.endorsements (endorsee_id);

-- ── Seed: Coding challenges ────────────────────────────────
INSERT INTO public.skill_challenges (category, difficulty, title, description, time_limit_seconds, starter_code, language_default, test_cases) VALUES

('coding', 1, 'Two Sum',
'Given an array of integers `nums` and an integer `target`, return **indices** of the two numbers that add up to `target`.

You may assume each input has exactly one solution and you may not use the same element twice. Output the two indices separated by a space, in ascending order.

**Example**
```
Input:  2 7 11 15
        9
Output: 0 1
```',
600,
'def two_sum(nums, target):
    # Your solution here
    pass

# --- runner (do not modify) ---
line1 = input().split()
nums = list(map(int, line1))
target = int(input())
result = two_sum(nums, target)
print(*sorted(result))',
'python',
'[
  {"input": "2 7 11 15\n9",  "expected": "0 1", "hidden": false},
  {"input": "3 2 4\n6",      "expected": "1 2", "hidden": false},
  {"input": "3 3\n6",        "expected": "0 1", "hidden": true},
  {"input": "1 5 3 2\n4",    "expected": "2 3", "hidden": true}
]'::jsonb),

('coding', 1, 'Fibonacci',
'Write a function that returns the **nth Fibonacci number**.

`F(0) = 0`, `F(1) = 1`, `F(n) = F(n-1) + F(n-2)`.

**Example**
```
Input:  10
Output: 55
```',
600,
'def fibonacci(n):
    # Your solution here
    pass

# --- runner ---
n = int(input())
print(fibonacci(n))',
'python',
'[
  {"input": "0",  "expected": "0",   "hidden": false},
  {"input": "1",  "expected": "1",   "hidden": false},
  {"input": "10", "expected": "55",  "hidden": false},
  {"input": "20", "expected": "6765","hidden": true},
  {"input": "30", "expected": "832040","hidden": true}
]'::jsonb),

('coding', 1, 'Valid Palindrome',
'A phrase is a palindrome if, after converting all uppercase letters to lowercase and removing all non-alphanumeric characters, it reads the same forward and backward.

Given a string `s`, return `true` if it is a palindrome, `false` otherwise.

**Example**
```
Input:  A man a plan a canal Panama
Output: true
```',
600,
'def is_palindrome(s):
    # Your solution here
    pass

# --- runner ---
s = input()
print(str(is_palindrome(s)).lower())',
'python',
'[
  {"input": "A man a plan a canal Panama", "expected": "true",  "hidden": false},
  {"input": "race a car",                 "expected": "false", "hidden": false},
  {"input": " ",                          "expected": "true",  "hidden": true},
  {"input": "Was it a car or a cat I saw","expected": "true",  "hidden": true}
]'::jsonb),

('coding', 2, 'Maximum Subarray',
'Given an integer array `nums`, find the contiguous subarray with the largest sum and return its sum (Kadane''s algorithm).

**Example**
```
Input:  -2 1 -3 4 -1 2 1 -5 4
Output: 6
```
The subarray `[4, -1, 2, 1]` has the largest sum = 6.',
900,
'def max_subarray(nums):
    # Your solution here
    pass

# --- runner ---
nums = list(map(int, input().split()))
print(max_subarray(nums))',
'python',
'[
  {"input": "-2 1 -3 4 -1 2 1 -5 4", "expected": "6",  "hidden": false},
  {"input": "1",                       "expected": "1",  "hidden": false},
  {"input": "5 4 -1 7 8",             "expected": "23", "hidden": false},
  {"input": "-1 -2 -3 -4",            "expected": "-1", "hidden": true},
  {"input": "1 2 3 4 5",              "expected": "15", "hidden": true}
]'::jsonb),

('coding', 2, 'Valid Parentheses',
'Given a string `s` containing only `(`, `)`, `{`, `}`, `[`, `]`, determine if the input string is valid.

A string is valid if:
- Every open bracket is closed by the same type of bracket.
- Open brackets are closed in the correct order.

**Example**
```
Input:  ()[]{}
Output: true
```',
900,
'def is_valid(s):
    # Your solution here
    pass

# --- runner ---
s = input()
print(str(is_valid(s)).lower())',
'python',
'[
  {"input": "()",     "expected": "true",  "hidden": false},
  {"input": "()[]{}", "expected": "true",  "hidden": false},
  {"input": "(]",     "expected": "false", "hidden": false},
  {"input": "([)]",   "expected": "false", "hidden": true},
  {"input": "{[]}",   "expected": "true",  "hidden": true},
  {"input": "",       "expected": "true",  "hidden": true}
]'::jsonb),

('coding', 2, 'Longest Substring Without Repeating Characters',
'Given a string `s`, find the length of the **longest substring** without repeating characters.

**Example**
```
Input:  abcabcbb
Output: 3
```
The answer is `"abc"`, with length 3.',
900,
'def length_of_longest_substring(s):
    # Your solution here
    pass

# --- runner ---
s = input()
print(length_of_longest_substring(s))',
'python',
'[
  {"input": "abcabcbb", "expected": "3", "hidden": false},
  {"input": "bbbbb",    "expected": "1", "hidden": false},
  {"input": "pwwkew",   "expected": "3", "hidden": false},
  {"input": "",         "expected": "0", "hidden": true},
  {"input": "dvdf",     "expected": "3", "hidden": true}
]'::jsonb),

('coding', 3, 'Coin Change',
'You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.

Return the **fewest number of coins** needed to make up that amount. If it is not possible, return `-1`.

**Example**
```
Input:  1 5 11
        11
Output: 1
```',
1200,
'def coin_change(coins, amount):
    # Your solution here
    pass

# --- runner ---
coins = list(map(int, input().split()))
amount = int(input())
print(coin_change(coins, amount))',
'python',
'[
  {"input": "1 5 11\n11",  "expected": "1",  "hidden": false},
  {"input": "1 5 11\n15",  "expected": "3",  "hidden": false},
  {"input": "2\n3",         "expected": "-1", "hidden": false},
  {"input": "1 2 5\n11",   "expected": "3",  "hidden": true},
  {"input": "186 419 83 408\n6249","expected":"20","hidden": true}
]'::jsonb),

('coding', 3, 'Word Break',
'Given a string `s` and a list of words (space-separated on second line), return `true` if `s` can be segmented into a space-separated sequence of one or more dictionary words.

**Example**
```
Input:  leetcode
        leet code
Output: true
```',
1200,
'def word_break(s, word_dict):
    # Your solution here
    pass

# --- runner ---
s = input().strip()
words = input().strip().split()
print(str(word_break(s, set(words))).lower())',
'python',
'[
  {"input": "leetcode\nleet code",          "expected": "true",  "hidden": false},
  {"input": "applepenapple\napple pen",     "expected": "true",  "hidden": false},
  {"input": "catsandog\ncats dog sand and cat","expected":"false","hidden": false},
  {"input": "nexus\nnex us",               "expected": "true",  "hidden": true},
  {"input": "aaaaaaa\naaaa aaa",           "expected": "true",  "hidden": true}
]'::jsonb);

-- ── Seed: Writing challenges ───────────────────────────────
INSERT INTO public.skill_challenges (category, difficulty, title, description, time_limit_seconds, word_limit) VALUES

('writing', 1, 'Cold Email',
'Write a cold email to a startup founder asking for a 20-minute coffee chat.

**Context:** You are a 2nd year B.Tech student interested in their startup (you choose which one). You have a specific reason for reaching out — not just "I admire your work."

**Evaluated on:** Clarity, specificity, respect for their time, a clear ask, and a genuine hook.', 480, 200),

('writing', 2, 'Project Retrospective',
'Describe your most challenging technical project — what you built, what broke, what you learned.

**Requirements:**
- Be specific about the technical decisions made
- Include at least one thing you would do differently
- Explain what the experience changed about how you work

**Evaluated on:** Technical depth, honest self-reflection, clarity of writing.', 720, 300),

('writing', 3, 'Technical Blog Introduction',
'Write the opening section of a technical blog post explaining a CS concept to a fellow student who has never encountered it.

Choose **one** of: Consistent Hashing, CAP Theorem, Bloom Filters, or Skip Lists.

**Evaluated on:** Accuracy, use of analogy, clarity, avoiding unnecessary jargon, compelling hook.', 900, 400);

-- ── Seed: Quiz challenges ──────────────────────────────────
INSERT INTO public.skill_challenges (category, difficulty, title, description, time_limit_seconds, questions) VALUES

('quiz', 1, 'Time Complexity Basics',
'10 questions on Big-O notation and time complexity analysis. Score 70% or above to earn the badge.',
900,
'[
  {
    "q": "What is the time complexity of binary search on a sorted array of n elements?",
    "options": ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
    "correct": 1,
    "explanation": "Binary search halves the search space each step, giving O(log n)."
  },
  {
    "q": "What is the worst-case time complexity of QuickSort?",
    "options": ["O(n log n)", "O(n²)", "O(n)", "O(log n)"],
    "correct": 1,
    "explanation": "When the pivot is always the smallest or largest element (already sorted array), QuickSort degrades to O(n²)."
  },
  {
    "q": "Inserting an element at the beginning of a singly linked list is:",
    "options": ["O(n)", "O(log n)", "O(1)", "O(n²)"],
    "correct": 2,
    "explanation": "You only need to update the head pointer — O(1)."
  },
  {
    "q": "What is the time complexity of accessing an element in a hash table (average case)?",
    "options": ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
    "correct": 3,
    "explanation": "Hash tables provide O(1) average-case access via direct index calculation."
  },
  {
    "q": "Which sorting algorithm has the best worst-case time complexity?",
    "options": ["QuickSort", "MergeSort", "BubbleSort", "SelectionSort"],
    "correct": 1,
    "explanation": "MergeSort guarantees O(n log n) in all cases. QuickSort is O(n²) worst-case."
  },
  {
    "q": "The time complexity of finding the height of a balanced binary search tree with n nodes is:",
    "options": ["O(n)", "O(log n)", "O(1)", "O(n log n)"],
    "correct": 1,
    "explanation": "A balanced BST has height O(log n)."
  },
  {
    "q": "What is the time complexity of the following: for i in range(n): for j in range(i, n)?",
    "options": ["O(n)", "O(n²)", "O(n log n)", "O(2ⁿ)"],
    "correct": 1,
    "explanation": "The inner loop runs n + (n-1) + ... + 1 = n(n+1)/2 times = O(n²)."
  },
  {
    "q": "DFS on a graph with V vertices and E edges has time complexity:",
    "options": ["O(V)", "O(E)", "O(V + E)", "O(V × E)"],
    "correct": 2,
    "explanation": "DFS visits every vertex and edge once: O(V + E)."
  },
  {
    "q": "Which data structure gives O(log n) insert, delete, and search?",
    "options": ["Array", "Hash Table", "Balanced BST", "Stack"],
    "correct": 2,
    "explanation": "A balanced BST (AVL, Red-Black) maintains O(log n) for all three operations."
  },
  {
    "q": "Dynamic programming solves problems by:",
    "options": [
      "Always using recursion without memoization",
      "Breaking into subproblems and storing results to avoid recomputation",
      "Using greedy choices at each step",
      "Sorting the input first"
    ],
    "correct": 1,
    "explanation": "DP avoids recomputing overlapping subproblems via memoization (top-down) or tabulation (bottom-up)."
  }
]'::jsonb),

('quiz', 2, 'Data Structures',
'10 questions on choosing and using the right data structure. Score 70% or above to earn the badge.',
1200,
'[
  {
    "q": "You need O(1) push, pop, and peek. Which structure?",
    "options": ["Queue", "Stack", "Heap", "Linked List"],
    "correct": 1,
    "explanation": "A stack (array or linked list) gives O(1) push, pop, and peek."
  },
  {
    "q": "A priority queue is most efficiently implemented using a:",
    "options": ["Sorted Array", "Binary Heap", "Linked List", "Hash Table"],
    "correct": 1,
    "explanation": "A binary heap gives O(log n) insert and O(log n) extract-min/max."
  },
  {
    "q": "Which data structure is used in BFS traversal?",
    "options": ["Stack", "Queue", "Heap", "Tree"],
    "correct": 1,
    "explanation": "BFS uses a queue (FIFO) to process nodes level by level."
  },
  {
    "q": "A trie is most suitable for:",
    "options": [
      "Storing integers",
      "Prefix-based string search",
      "Graph traversal",
      "Range queries"
    ],
    "correct": 1,
    "explanation": "Tries store strings character by character, making prefix lookups O(L) where L is key length."
  },
  {
    "q": "Which structure allows O(1) median finding after each insertion?",
    "options": ["Sorted Array", "Two Heaps (max + min)", "AVL Tree", "Hash Map"],
    "correct": 1,
    "explanation": "Two heaps — a max-heap for the lower half and a min-heap for the upper half — allow O(log n) insert and O(1) median."
  },
  {
    "q": "An LRU Cache is typically implemented using:",
    "options": [
      "Array + Binary Search",
      "HashMap + Doubly Linked List",
      "Stack + Queue",
      "Binary Search Tree"
    ],
    "correct": 1,
    "explanation": "HashMap for O(1) lookup, Doubly Linked List for O(1) insert/delete to maintain order."
  },
  {
    "q": "Segment trees are used for:",
    "options": [
      "Hash-based lookups",
      "Range queries and point updates in O(log n)",
      "Graph shortest paths",
      "String pattern matching"
    ],
    "correct": 1,
    "explanation": "Segment trees handle range sum, min, max queries and point updates in O(log n)."
  },
  {
    "q": "A deque (double-ended queue) supports:",
    "options": [
      "O(1) insert/delete at both ends",
      "O(1) random access only",
      "O(log n) all operations",
      "O(1) insert at front, O(n) at back"
    ],
    "correct": 0,
    "explanation": "A deque supports O(1) push/pop from both front and back."
  },
  {
    "q": "Which structure detects cycles in a directed graph efficiently?",
    "options": ["BFS", "DFS with coloring (white/gray/black)", "Union-Find", "Topological Sort only"],
    "correct": 1,
    "explanation": "DFS with 3-color marking detects back edges (gray → gray) which indicate cycles in O(V+E)."
  },
  {
    "q": "Union-Find (Disjoint Set Union) with path compression and union by rank achieves:",
    "options": ["O(log n) per operation", "O(n) per operation", "O(α(n)) ≈ O(1) amortized", "O(n log n) total"],
    "correct": 2,
    "explanation": "With both optimizations, each operation is nearly O(1) — amortized O(α(n)) where α is the inverse Ackermann function."
  }
]'::jsonb),

('quiz', 3, 'Advanced Algorithms',
'10 questions on advanced algorithmic techniques. Score 70% or above to earn the badge.',
1500,
'[
  {
    "q": "Dijkstra''s algorithm fails on graphs with:",
    "options": ["Disconnected components", "Negative weight edges", "Cycles", "Undirected edges"],
    "correct": 1,
    "explanation": "Dijkstra assumes non-negative weights. Use Bellman-Ford for negative weights."
  },
  {
    "q": "The time complexity of Bellman-Ford is:",
    "options": ["O(V log V)", "O(V + E)", "O(V × E)", "O(E log V)"],
    "correct": 2,
    "explanation": "Bellman-Ford relaxes all E edges V-1 times: O(V × E)."
  },
  {
    "q": "KMP string matching achieves:",
    "options": ["O(n × m)", "O(n + m)", "O(n log m)", "O(m log n)"],
    "correct": 1,
    "explanation": "KMP preprocesses the pattern in O(m) and searches in O(n), total O(n + m)."
  },
  {
    "q": "Which paradigm does the activity selection problem use?",
    "options": ["Dynamic Programming", "Greedy", "Divide and Conquer", "Backtracking"],
    "correct": 1,
    "explanation": "Activity selection uses a greedy approach — always pick the activity that finishes earliest."
  },
  {
    "q": "Floyd-Warshall computes:",
    "options": [
      "Single-source shortest paths",
      "Minimum spanning tree",
      "All-pairs shortest paths",
      "Maximum flow"
    ],
    "correct": 2,
    "explanation": "Floyd-Warshall finds shortest paths between all pairs of vertices in O(V³)."
  },
  {
    "q": "A problem is NP-Complete if:",
    "options": [
      "It can be solved in polynomial time",
      "It is in NP and every NP problem reduces to it in polynomial time",
      "It cannot be solved at all",
      "It only has exponential-time solutions"
    ],
    "correct": 1,
    "explanation": "NP-Complete = in NP (solution verifiable in poly time) AND NP-Hard (every NP problem reduces to it)."
  },
  {
    "q": "Topological sort is only defined for:",
    "options": ["Undirected graphs", "Weighted graphs", "Directed Acyclic Graphs (DAGs)", "Complete graphs"],
    "correct": 2,
    "explanation": "Topological ordering requires a DAG — cycles make it impossible."
  },
  {
    "q": "The master theorem applies to recurrences of the form:",
    "options": ["T(n) = T(n-1) + f(n)", "T(n) = aT(n/b) + f(n)", "T(n) = T(n/2) + T(n/3)", "T(n) = 2T(n) + 1"],
    "correct": 1,
    "explanation": "Master theorem handles divide-and-conquer recurrences of the form T(n) = aT(n/b) + f(n)."
  },
  {
    "q": "Which algorithm finds the Minimum Spanning Tree?",
    "options": ["Dijkstra", "Bellman-Ford", "Kruskal", "Floyd-Warshall"],
    "correct": 2,
    "explanation": "Kruskal''s (and Prim''s) algorithm finds the MST. Dijkstra finds shortest paths."
  },
  {
    "q": "The 0/1 Knapsack problem with n items and capacity W runs in:",
    "options": ["O(n log n)", "O(n × W)", "O(2ⁿ)", "O(n²)"],
    "correct": 1,
    "explanation": "DP table is n × W, giving O(n × W) — pseudo-polynomial (not polynomial in input size)."
  }
]'::jsonb);

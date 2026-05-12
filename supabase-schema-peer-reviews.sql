-- ============================================================
-- NEXUS — PEER REVIEWS + DESIGN SEED (Block 2 completion)
-- Run AFTER supabase-schema-skills.sql
-- Supabase → SQL Editor → New Query → paste → Run
-- ============================================================

-- ── peer_reviews ───────────────────────────────────────────
-- Tracks writing & design peer reviews (need 2 approvals for badge)
CREATE TABLE IF NOT EXISTS public.peer_reviews (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID        NOT NULL REFERENCES public.challenge_submissions(id) ON DELETE CASCADE,
  reviewer_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  verdict         TEXT        NOT NULL CHECK (verdict IN ('approved', 'rejected')),
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_review_per_submission UNIQUE (submission_id, reviewer_id)
);

ALTER TABLE public.peer_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "peer_reviews_select" ON public.peer_reviews;
CREATE POLICY "peer_reviews_select" ON public.peer_reviews
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "peer_reviews_insert" ON public.peer_reviews;
CREATE POLICY "peer_reviews_insert" ON public.peer_reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE INDEX IF NOT EXISTS peer_reviews_submission_idx ON public.peer_reviews (submission_id);
CREATE INDEX IF NOT EXISTS peer_reviews_reviewer_idx   ON public.peer_reviews (reviewer_id);

-- ── Supabase Storage bucket ─────────────────────────────────
-- Run this separately in Supabase Storage dashboard OR via the API:
--   Bucket name: challenge-submissions
--   Public: false
--   File size limit: 10 MB
--   Allowed MIME types: image/png, image/jpeg, image/webp

-- ── Seed: Adaptive quiz challenges ────────────────────────
-- These have per-question difficulty fields for adaptive selection
INSERT INTO public.skill_challenges (category, difficulty, title, description, time_limit_seconds, questions)
VALUES

('quiz', 2, 'Adaptive: Systems & OS',
'Adaptive quiz on Operating Systems and Computer Architecture. The difficulty of each question adjusts based on your performance. Score 70%+ to earn the badge.',
1200,
'[
  {"q":"What is a context switch?","options":["Switching between applications","Saving and restoring CPU state when switching processes","Changing the operating system","Switching network interfaces"],"correct":1,"difficulty":1,"explanation":"A context switch saves the state of the current process and restores the state of the next process to run."},
  {"q":"Which scheduling algorithm can cause starvation?","options":["Round Robin","FCFS","Priority Scheduling","Multilevel Queue"],"correct":2,"difficulty":1,"explanation":"Priority Scheduling can starve low-priority processes if high-priority processes keep arriving."},
  {"q":"Virtual memory allows:","options":["Faster CPU execution","Programs larger than physical RAM to run","Multiple CPUs to work together","Network sharing of memory"],"correct":1,"difficulty":1,"explanation":"Virtual memory maps logical addresses to physical RAM + disk swap, letting programs exceed physical RAM size."},
  {"q":"A deadlock requires all four of:","options":["Mutex, Semaphore, Monitor, Spinlock","Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait","CPU, RAM, Disk, Network","Starvation, Livelock, Race Condition, Priority Inversion"],"correct":1,"difficulty":1,"explanation":"Coffman conditions: Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait — all four must hold for deadlock."},
  {"q":"In paging, what does the TLB do?","options":["Stores recently used page table entries for fast lookup","Translates URLs to IPs","Manages disk blocks","Controls I/O devices"],"correct":0,"difficulty":1,"explanation":"Translation Lookaside Buffer (TLB) is a hardware cache for page table entries, reducing address translation time."},
  {"q":"Banker''s Algorithm is used to:","options":["Detect deadlocks after they occur","Prevent deadlocks by ensuring safe state","Recover from deadlocks","Schedule processes fairly"],"correct":1,"difficulty":2,"explanation":"Banker''s Algorithm avoids deadlock by only granting resources if the resulting state is provably safe."},
  {"q":"Internal fragmentation occurs when:","options":["Processes are too large for memory","Allocated memory block is larger than requested","Free memory is scattered","Page table is full"],"correct":1,"difficulty":2,"explanation":"Internal fragmentation is wasted space inside an allocated region because the block size is larger than what was requested."},
  {"q":"What is thrashing?","options":["CPU overheating","Excessive page swapping causing near-zero useful work","Disk fragmentation","Memory corruption"],"correct":1,"difficulty":2,"explanation":"Thrashing occurs when a process spends more time swapping pages in/out than executing useful instructions."},
  {"q":"In a multi-level feedback queue:","options":["All processes have equal priority","Processes can move between queues based on behavior","Priority never changes","Only I/O-bound processes are scheduled"],"correct":1,"difficulty":2,"explanation":"MLFQ adjusts process priority dynamically: CPU-bound processes sink to lower-priority queues; I/O-bound stay high."},
  {"q":"Copy-on-Write (CoW) in fork() means:","options":["Child copies all parent memory immediately","Parent and child share pages until one writes, then copy","Both processes write to the same memory always","Child gets fresh zeroed memory"],"correct":1,"difficulty":2,"explanation":"CoW defers copying: pages are shared read-only until either process writes, then only the written page is copied."},
  {"q":"What is the difference between a process and a thread?","options":["No difference","Threads share the same address space; processes have separate address spaces","Processes are faster","Threads cannot be scheduled"],"correct":1,"difficulty":2,"explanation":"Threads within a process share code, data, and heap; each process has its own isolated virtual address space."},
  {"q":"The dining philosophers problem illustrates:","options":["CPU scheduling fairness","Deadlock and starvation in resource allocation","Memory management","Network congestion"],"correct":1,"difficulty":3,"explanation":"Dining Philosophers models circular wait deadlock — each philosopher holds one fork and waits for the other, causing deadlock."},
  {"q":"What is the purpose of a semaphore?","options":["Only mutual exclusion","Signaling between processes and controlling access to shared resources","Memory allocation","Process creation"],"correct":1,"difficulty":3,"explanation":"Semaphores provide both mutual exclusion (binary) and signaling/counting (counting semaphores) for synchronization."},
  {"q":"In the working set model, the working set W(t,Δ) is:","options":["All pages ever accessed","Pages accessed in the last Δ time units","Pages currently in RAM","Pages on disk"],"correct":1,"difficulty":3,"explanation":"The working set is the set of pages referenced in the past Δ time units — it approximates a process''s active memory needs."},
  {"q":"What distinguishes a monolithic kernel from a microkernel?","options":["Monolithic kernels run in user space","Microkernels run all services in kernel space","Monolithic kernels run all services (drivers, FS, network) in kernel space; microkernels move them to user space","Microkernels are always faster"],"correct":2,"difficulty":3,"explanation":"Monolithic: all OS services in one kernel-space binary (fast, less fault isolation). Microkernel: minimal kernel + user-space servers (stable, slower IPC)."}
]'::jsonb),

('quiz', 2, 'Adaptive: Computer Networks',
'Adaptive quiz on networking fundamentals. Difficulty adjusts per question. Score 70%+ to earn the badge.',
1200,
'[
  {"q":"Which layer of the OSI model does TCP operate at?","options":["Network","Transport","Session","Data Link"],"correct":1,"difficulty":1,"explanation":"TCP operates at Layer 4 (Transport), providing reliable, ordered delivery."},
  {"q":"What does DNS do?","options":["Routes packets","Translates domain names to IP addresses","Encrypts data","Manages IP addresses"],"correct":1,"difficulty":1,"explanation":"DNS (Domain Name System) resolves human-readable domain names to numeric IP addresses."},
  {"q":"HTTP is stateless. What does this mean?","options":["It is slow","Each request is independent; the server retains no session state between requests","It uses UDP","It cannot handle files"],"correct":1,"difficulty":1,"explanation":"HTTP treats each request independently; cookies/sessions are used at the application layer to simulate state."},
  {"q":"What is the purpose of ARP?","options":["Resolve IP to MAC address","Assign IP addresses","Encrypt packets","Route between networks"],"correct":0,"difficulty":1,"explanation":"ARP (Address Resolution Protocol) maps a known IP address to the corresponding MAC address on a local network."},
  {"q":"What is the difference between TCP and UDP?","options":["UDP is connection-oriented","TCP is connectionless","TCP guarantees delivery and ordering; UDP does not","UDP is faster but unreliable — both are correct"],"correct":3,"difficulty":1,"explanation":"TCP: reliable, ordered, connection-oriented. UDP: unreliable, unordered, connectionless — used where speed > reliability (video, DNS)."},
  {"q":"What is subnetting?","options":["Connecting two networks","Dividing an IP network into smaller sub-networks","Encrypting network traffic","Load balancing across servers"],"correct":1,"difficulty":2,"explanation":"Subnetting partitions an IP address space using subnet masks, enabling efficient routing and address management."},
  {"q":"A /24 subnet has how many usable host addresses?","options":["256","254","255","128"],"correct":1,"difficulty":2,"explanation":"/24 = 256 total addresses. Subtract network address (x.x.x.0) and broadcast (x.x.x.255) = 254 usable hosts."},
  {"q":"What happens during a TCP three-way handshake?","options":["SYN → SYN-ACK → ACK","SYN → ACK → FIN","ACK → SYN → FIN","DATA → ACK → FIN"],"correct":0,"difficulty":2,"explanation":"Client sends SYN → Server replies SYN-ACK → Client sends ACK. Connection is established after all three."},
  {"q":"What is BGP used for?","options":["Routing within a data center","Routing between autonomous systems on the internet","Assigning IP addresses","DNS resolution"],"correct":1,"difficulty":2,"explanation":"BGP (Border Gateway Protocol) is the inter-AS routing protocol that powers internet-wide routing between ISPs."},
  {"q":"What is the purpose of NAT?","options":["Speed up DNS","Allow multiple devices to share one public IP","Encrypt traffic","Prevent DDoS attacks"],"correct":1,"difficulty":2,"explanation":"NAT (Network Address Translation) maps multiple private IPs to one public IP, conserving the IPv4 address space."},
  {"q":"HTTPS uses TLS. What does TLS provide?","options":["Authentication only","Encryption only","Authentication, encryption, and integrity","Faster HTTP"],"correct":2,"difficulty":2,"explanation":"TLS provides: server authentication (certificates), data encryption (symmetric keys negotiated via asymmetric), and integrity (MACs)."},
  {"q":"What is HOL (Head-of-Line) blocking?","options":["A firewall rule","When a blocked packet prevents subsequent packets from moving forward","A DNS failure","A routing loop"],"correct":1,"difficulty":3,"explanation":"HOL blocking occurs when a queue''s first packet is delayed, blocking all packets behind it — a problem in TCP and some switch architectures."},
  {"q":"What does HTTP/2 solve over HTTP/1.1?","options":["Security","HOL blocking via multiplexing on a single connection","DNS resolution speed","Compression only"],"correct":1,"difficulty":3,"explanation":"HTTP/2 multiplexes multiple streams over one TCP connection, eliminating HTTP/1.1''s one-request-at-a-time limitation."},
  {"q":"What is the difference between symmetric and asymmetric encryption in TLS?","options":["Asymmetric is used for bulk data; symmetric for key exchange","Symmetric is used for key exchange; asymmetric for bulk data","Both are used equally","Only asymmetric is used"],"correct":1,"difficulty":3,"explanation":"TLS uses asymmetric (RSA/ECC) for key exchange and authentication, then switches to symmetric (AES) for bulk data — faster for large payloads."},
  {"q":"What is a CDN and why does it reduce latency?","options":["A type of database","A network of geographically distributed servers that serve content from the closest node","A security protocol","A load balancer"],"correct":1,"difficulty":3,"explanation":"CDNs cache content at edge nodes near users, reducing round-trip time. Latency drops because packets travel shorter distances."}
]'::jsonb);

-- ── Seed: Design challenges ────────────────────────────────
-- Reference images should be updated in the Supabase table with actual Figma screenshots
INSERT INTO public.skill_challenges (category, difficulty, title, description, time_limit_seconds, reference_image_url)
VALUES

('design', 1, 'Replicate: Login Card',
'Recreate the login card UI shown in the reference image.

**Requirements:**
- Dark background with glassmorphism card
- Email + password inputs with proper labels
- Primary CTA button with gradient
- "Forgot password?" link
- Correct spacing, typography hierarchy, and color usage

**Evaluated by 2 verified design badge holders on:**
Accuracy to reference · Visual polish · Spacing & alignment · Typography choice

Submit your design as a PNG or JPG (max 5MB). Tools: Figma, Sketch, Adobe XD, or any design tool.',
3600,
'https://placehold.co/800x600/0d0d1a/a855f7?text=Login+Card+Reference+(Update+this+URL+in+Supabase)'),

('design', 2, 'Replicate: Dashboard Stats',
'Recreate the analytics dashboard stats section shown in the reference image.

**Requirements:**
- 4 stat cards in a row with icons, values, and trend indicators
- Clean data visualization (sparkline or bar)
- Consistent card sizing and internal padding
- Proper use of color to indicate positive/negative trends

**Evaluated by 2 verified design badge holders on:**
Accuracy · Data visualization clarity · Grid consistency · Color semantics

Submit as PNG or JPG (max 5MB).',
3600,
'https://placehold.co/800x600/0d0d1a/3b82f6?text=Dashboard+Stats+Reference+(Update+in+Supabase)'),

('design', 3, 'Original: Mobile Onboarding Flow',
'Design a 3-screen mobile onboarding flow for a campus app.

**Requirements:**
- Screen 1: Welcome / value proposition
- Screen 2: Key feature highlight
- Screen 3: Sign-up CTA
- Consistent design system: colors, fonts, spacing
- Show both light and dark variants OR just dark

**You choose the visual direction.** Evaluated by 2 design badge holders on:**
Originality · Visual hierarchy · Consistency · Mobile-first thinking

Submit all 3 screens in one PNG (max 10MB).',
7200,
'https://placehold.co/800x600/0d0d1a/10b981?text=Original+Design+Prompt+(No+Reference)');

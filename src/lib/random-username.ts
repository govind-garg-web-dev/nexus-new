const ADJECTIVES = [
  "Agile","Atomic","Binary","Bold","Bright","Byte","Calm","Clever","Cosmic",
  "Crafty","Crisp","Curious","Cyber","Daring","Deep","Digital","Dynamic",
  "Epic","Fast","Fearless","Fierce","Fluid","Focused","Fuzzy","Galactic",
  "Glitch","Hyper","Infinite","Keen","Kinetic","Laser","Lateral","Lean",
  "Lucid","Lunar","Matrix","Meta","Neural","Nimble","Neon","Noble","Open",
  "Optimal","Parallel","Pixel","Prime","Quantum","Rapid","Raw","Recursive",
  "Sharp","Silent","Sleek","Smart","Solar","Sonic","Static","Stellar",
  "Swift","Synced","Tactical","Turbo","Ultra","Vector","Vivid","Warp",
  "Wild","Zen","Zero","Zenith","Radiant","Cubic","Stochastic","Abstract",
];

const NOUNS = [
  "Apex","Arc","Array","Atom","Axiom","Cache","Cipher","Circuit","Codec",
  "Coder","Commit","Core","Debug","Delta","Deploy","Dev","Driver","Engine",
  "Epoch","Error","Flux","Forge","Frame","Grid","Hash","Index","Iterator",
  "Kernel","Lambda","Layer","Link","Logic","Loop","Maven","Merge","Method",
  "Module","Nexus","Node","Null","Object","Orbit","Parser","Patch","Pixel",
  "Pivot","Pointer","Port","Probe","Pulse","Query","Queue","Regex","Relay",
  "Route","Runtime","Script","Scope","Seed","Signal","Socket","Sort","Stack",
  "State","Stream","Struct","Syntax","Thread","Token","Trace","Tree","Tuple",
  "Type","Union","Vector","Vertex","Void","Wizard","Worker","Stack","Build",
];

function rand(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateUsername(): string {
  const adj  = rand(ADJECTIVES);
  const noun = rand(NOUNS);
  const num  = String(Math.floor(Math.random() * 90) + 10); // 10–99
  return `${adj}${noun}${num}`;
}

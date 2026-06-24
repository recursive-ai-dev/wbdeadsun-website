export interface Track {
  title: string;
  file: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  tech: string[];
  category: ProjectCategory;
  type: 'game' | 'music' | 'program' | 'ai' | 'lyrics';
  link?: string;
  path?: string;
  tracks?: Track[];
  details?: string;
  files?: string[];
  year?: string;
}

export type ProjectCategory = 'games' | 'music' | 'programs' | 'ai';

export const categoryInfo: Record<ProjectCategory, { icon: string; subtitle: string; label: string }> = {
  games: { icon: "⚔", subtitle: "Playable Web Games", label: "Games" },
  music: { icon: "♪", subtitle: "Music & Lyrics", label: "Music" },
  programs: { icon: "◈", subtitle: "Software & Tools", label: "Programs" },
  ai: { icon: "⬡", subtitle: "AI Research & Prompts", label: "AI" },
};

export const projects: Project[] = [
  // ===== GAMES =====
  {
    id: "cold-snap",
    title: "Cold Snap",
    description: "Survive the Calgary slums in this top-down survival arcade game. Scrape together cash, stay warm, outrun the cold and the cops.",
    tech: ["React", "Vite", "Tailwind"],
    category: "games",
    type: "game",
    path: "projects/games/cold-snap/index.html",
    details: "A top-down survival arcade game set in snowy Calgary. Scrape together cash, stay warm, outrun the cold and the cops.",
  },
  {
    id: "crossbone",
    title: "Wrangler Roundup",
    description: "A western-themed arcade game built with React. Lasso, ride, and wrangle your way through the wild frontier.",
    tech: ["React", "Vite", "Tailwind"],
    category: "games",
    type: "game",
    path: "projects/games/crossbone/index.html",
    details: "A western-themed arcade game. Built with React/Vite/Tailwind.",
  },
  {
    id: "caveman-smash",
    title: "Rock & Smash",
    description: "A caveman-themed smashing game. Smash rocks, beat enemies, and survive the prehistoric world.",
    tech: ["React", "Vite", "Tailwind"],
    category: "games",
    type: "game",
    path: "projects/games/caveman-smash/index.html",
    details: "A caveman-themed smashing game built with React.",
  },

  // ===== MUSIC =====
  {
    id: "aash-white",
    title: "Aash White",
    description: "Dark electronic music with female AI vocals. AI-assisted production, original lyrics.",
    tech: ["AI Vocals", "AI Production", "Original Lyrics"],
    category: "music",
    type: "music",
    tracks: [
      { title: "Abysscore", file: "projects/music/aash-white/Aash White - Abysscore.mp3" },
      { title: "Corrosive", file: "projects/music/aash-white/Aash White - Corrosive.mp3" },
      { title: "Flux", file: "projects/music/aash-white/Aash White - Flux.mp3" },
      { title: "Hold That Thought", file: "projects/music/aash-white/Aash White - Hold That Thought.mp3" },
      { title: "Hounds", file: "projects/music/aash-white/Aash White - Hounds.mp3" },
      { title: "Meet Me Where Reality Breaks", file: "projects/music/aash-white/Aash White - Meet Me Where Reality Breaks.mp3" },
      { title: "Rain", file: "projects/music/aash-white/Aash White - Rain.mp3" },
      { title: "Roadkill", file: "projects/music/aash-white/Aash White - Roadkill.mp3" },
      { title: "Rot", file: "projects/music/aash-white/Aash White - Rot.mp3" },
      { title: "Ruin It", file: "projects/music/aash-white/Aash White - Ruin It.mp3" },
      { title: "Stargore", file: "projects/music/aash-white/Aash White - Stargore.mp3" },
      { title: "Take Me Away", file: "projects/music/aash-white/Aash White - Take Me Away.mp3" },
    ],
    details: "My lyrics, female AI voice, AI assisted production.",
  },
  {
    id: "icryafterikill",
    title: "icryafterikill",
    description: "Dark electronic music with male AI vocals. AI-assisted production, original lyrics.",
    tech: ["AI Vocals", "AI Production", "Original Lyrics"],
    category: "music",
    type: "music",
    tracks: [
      { title: "A Little Line of Why I Try", file: "projects/music/icryafterikill/icryafterikill - A little line of why I try.mp3" },
      { title: "Ambition", file: "projects/music/icryafterikill/icryafterikill - Ambition.mp3" },
      { title: "Broken Moon", file: "projects/music/icryafterikill/icryafterikill - Broken Moon.mp3" },
      { title: "Crossings", file: "projects/music/icryafterikill/icryafterikill - Crossings.mp3" },
      { title: "Crows All on the Hunt", file: "projects/music/icryafterikill/icryafterikill - Crows all on the hunt.mp3" },
      { title: "Hydroplaning", file: "projects/music/icryafterikill/icryafterikill - Hydroplaning.mp3" },
      { title: "I Don't Get It", file: "projects/music/icryafterikill/icryafterikill - I don't get it.mp3" },
      { title: "Landlord of Spiders", file: "projects/music/icryafterikill/icryafterikill - Landlord of spiders.mp3" },
      { title: "One More", file: "projects/music/icryafterikill/icryafterikill - One_More.mp3" },
      { title: "Recursion", file: "projects/music/icryafterikill/icryafterikill - Recursion.mp3" },
      { title: "Shadows", file: "projects/music/icryafterikill/icryafterikill - Shadows.mp3" },
      { title: "Today Is a Lot", file: "projects/music/icryafterikill/icryafterikill - Today is a lot.mp3" },
    ],
    details: "My lyrics, male AI voice, AI assisted production.",
  },
  {
    id: "witheringbloomdeadsun",
    title: "witheringbloomdeadsun",
    description: "Dark atmospheric music with real vocals. Original lyrics and voice, AI-assisted production.",
    tech: ["Real Vocals", "AI Production", "Original Lyrics"],
    category: "music",
    type: "music",
    tracks: [
      { title: "A Dog Never Hears When a Thought Dies", file: "projects/music/witheringbloomdeadsun/witheringbloomdeadsun - adogneverhearswhenathoughtdies.mp3" },
      { title: "Crows", file: "projects/music/witheringbloomdeadsun/witheringbloomdeadsun - crows.mp3" },
      { title: "Dead Leaves", file: "projects/music/witheringbloomdeadsun/witheringbloomdeadsun - deadleaves.mp3" },
      { title: "Distant Shadows", file: "projects/music/witheringbloomdeadsun/witheringbloomdeadsun - distantshadows.mp3" },
      { title: "Dysfunctional", file: "projects/music/witheringbloomdeadsun/witheringbloomdeadsun - dysfunctional.mp3" },
      { title: "Easy Way", file: "projects/music/witheringbloomdeadsun/witheringbloomdeadsun - easyway.mp3" },
      { title: "Memory Fades", file: "projects/music/witheringbloomdeadsun/witheringbloomdeadsun - memoryfades.mp3" },
      { title: "Mostly Rehab", file: "projects/music/witheringbloomdeadsun/witheringbloomdeadsun - mostlyrehab.mp3" },
      { title: "Pain On You", file: "projects/music/witheringbloomdeadsun/witheringbloomdeadsun -  painonyou.mp3" },
      { title: "Push Me Under", file: "projects/music/witheringbloomdeadsun/witheringbloomdeadsun -  pushmeunder.mp3" },
      { title: "Suffer Days", file: "projects/music/witheringbloomdeadsun/witheringbloomdeadsun - sufferdays.mp3" },
      { title: "Weathered", file: "projects/music/witheringbloomdeadsun/witheringbloomdeadsun - weathered.mp3" },
    ],
    details: "My own voice, my own lyrics, AI assisted production.",
  },
  {
    id: "lyrics",
    title: "Lyrics Collection",
    description: "Original poetry and lyrics exploring dark themes of mental health, addiction, isolation, and self-reflection.",
    tech: ["Poetry", "Lyrics", "Dark Themes"],
    category: "music",
    type: "lyrics",
    details: "Three original lyric poems exploring dark introspective themes.",
    files: ["chaos", "ruin", "toxins"],
  },

  // ===== AI =====
  {
    id: "cadencetty",
    title: "CadenceTTY",
    description: "Conversational Adaptive Dynamics with Entrained Neural Coherence Engine — a voice-first conversational AI with spiking neural audio front-end and Kuramoto-coupled oscillator for turn-taking.",
    tech: ["PyTorch", "TorchAudio", "Spiking Networks", "Safetensors"],
    category: "ai",
    type: "ai",
    path: "projects/ai/ipynb/CadenceTTY_Notebook.ipynb",
    details: "Combines fiber-bundle-inspired geometric voice representation, Kuramoto-coupled oscillator for turn-taking, event-driven spiking audio front-end, hypernetwork-conditioned decoder, and evolving conversational niche. Trained end-to-end on real recorded speech (YESNO corpus).",
  },
  {
    id: "tensegritylm",
    title: "TensegrityLM",
    description: "A byte-level decoder-only language model combining RoPE, RMSNorm, Grouped-Query Attention, MoE, and homeostatic residual-gain regularization with Net2Net growth.",
    tech: ["PyTorch", "LLM", "MoE", "Safetensors"],
    category: "ai",
    type: "ai",
    path: "projects/ai/ipynb/TensegrityLM_Notebook.ipynb",
    details: "Combines RoPE, RMSNorm, Grouped-Query Attention (GQA), alternating local sliding-window / global causal attention, SwiGLU feed-forward alternating with Mixture-of-Experts, homeostatic residual-gain regularization, depth-scaled LayerDrop, and a confidence head.",
  },
  {
    id: "dark-fantasy-prompts",
    title: "Dark Fantasy System Prompts",
    description: "22 dark fantasy AI persona prompts — each casting the AI as a battle-hardened fantasy being providing coding/architecture advice with mathematically rigorous implementation.",
    tech: ["Prompt Engineering", "Dark Fantasy", "System Prompts"],
    category: "ai",
    type: "ai",
    path: "projects/ai/prompts/medieval-system-prompts/dark_fantasy_system_prompts.md",
    details: "A collection of 22 medieval dark fantasy system prompts designed for AI roleplay/coding personas. Races include Undead, Orc, Dark Elf, Goblin, Vampire, Demon, Troll, Lich, Dark Dwarf, Wraith, Minotaur, Dragon, and more.",
  },

  // ===== PROGRAMS =====
  {
    id: "asis",
    title: "ASIS 2.0",
    description: "Algebraic Swarm Intelligence System — a deterministic multi-agent architecture built on typed lambda calculus with 10 algebraic operators and a live cyberpunk HTML dashboard.",
    tech: ["Python", "Lambda Calculus", "Multi-Agent", "Visualization"],
    category: "programs",
    type: "program",
    details: "Built on a typed lambda calculus variant with 10 algebraic operators (COMPOSE, UNION, NEGATE, PROJECT, INJECT, BIND, REDUCE, TRANSFORM, GUARD, FIXPOINT). 6 specialized agent types: Orchestrator, Analyst, Planner, Executor, Validator, Synthesizer. Comes with a self-contained cyberpunk HTML dashboard with force-directed agent network visualization, neon glow effects, and particle systems.",
    files: ["asis.py", "asis_dashboard.html", "asis_trace.json", "README.md"],
  },
  {
    id: "labyr",
    title: "Labyr",
    description: "Ephemeral VM with Diegetic Dark Fantasy Filesystem — launches lightweight VMs running a Rust daemon inside a RAM-only initramfs with a labyrinth-themed maze engine.",
    tech: ["Python", "Rust", "Firecracker/QEMU", "Initramfs"],
    category: "programs",
    type: "program",
    details: "Full-stack ephemeral virtual machine project. Host Python launcher -> Hypervisor (Firecracker/QEMU) -> Guest VM with initramfs + tmpfs overlay. Guest runs a Rust daemon (labyr_daemon) with labyrinth engine, diegetic FS adapter, and API server. Two diegetic themes: dark_fantasy and cosmic_horror. Security: namespaces, seccomp, AppArmor, capability dropping, cgroups.",
  },
  {
    id: "vaeru",
    title: "VAERU",
    description: "Variance-Adaptive Entropic Reasoning Unit — a defensive-first MVP host-observation and response engine with 12 primitives for local Linux host monitoring and threat classification.",
    tech: ["Python", "Linux", "Security", "Monitoring"],
    category: "programs",
    type: "program",
    details: "Implements 12 primitives (P1-P12) for local Linux host monitoring: snapshot collection from procfs, differential analysis, residue accumulation/decay, threat classification, and safe action recommendations. Intentionally does NOT ship offensive probes, payload reflection, exploit logic, or destructive actions. SQLite-backed state layer, CLI commands: init, tick, demo, daemon, status, residues, threats, actions, topology, explain, doctor.",
  },
];

export const projectsByCategory = projects.reduce((acc, p) => {
  if (!acc[p.category]) acc[p.category] = [];
  acc[p.category].push(p);
  return acc;
}, {} as Record<ProjectCategory, Project[]>);

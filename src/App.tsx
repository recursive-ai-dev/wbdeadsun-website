import { useState, useEffect, useRef } from 'react';
import { projects, projectsByCategory, categoryInfo, type Project, type ProjectCategory } from './projects';

const BlackFlame = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 50 56" className={`${className} drop-shadow-[0_0_10px_rgba(255,255,255,0.12)]`}>
    <defs>
      <filter id="flame-glow">
        <feGaussianBlur stdDeviation="1.2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <g filter="url(#flame-glow)">
      <path d="M25 54 C25 54 6 30 6 18 C6 9 13 2 25 2 C37 2 44 9 44 18 C44 30 25 54 25 54 Z" fill="#1a1a1a" stroke="#444" strokeWidth="0.6" />
      <path d="M25 48 C25 48 11 28 11 19 C11 12 17 6 25 6 C33 6 39 12 39 19 C39 28 25 48 25 48 Z" fill="#222" />
      <path d="M25 40 C25 40 15 25 15 19 C15 14 19 10 25 10 C31 10 35 14 35 19 C35 25 25 40 25 40 Z" fill="#333" />
      <path d="M25 32 C25 32 19 22 19 18 C19 15 22 12 25 12 C28 12 31 15 31 18 C31 22 25 32 25 32 Z" fill="#444" />
      <path d="M25 26 C25 26 22 20 22 18 C22 16 23.5 14 25 14 C26.5 14 28 16 28 18 C28 20 25 26 25 26 Z" fill="#555" />
    </g>
  </svg>
);

const GothicDivider = () => (
  <div className="flex items-center justify-center gap-4 my-12">
    <div className="h-px w-24 bg-gradient-to-r from-transparent via-zinc-600 to-zinc-500" />
    <BlackFlame className="w-8 h-8 fill-zinc-500" />
    <div className="h-px w-24 bg-gradient-to-l from-transparent via-zinc-600 to-zinc-500" />
  </div>
);

const Navigation = ({ activeSection, onNavigate }: { activeSection: string; onNavigate: (section: string) => void }) => {
  const sections = ['home', 'about', ...Object.keys(projectsByCategory)] as const;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-700/50">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="flex items-center justify-between h-16">
          <button onClick={() => onNavigate('home')} className="font-bold tracking-widest text-zinc-100 text-lg cursor-pointer">
            ARCHIVE
          </button>

          <div className="hidden md:flex items-center gap-1">
            {sections.map((section) => (
              <button
                key={section}
                onClick={() => onNavigate(section)}
                className={`px-4 py-2 text-xs tracking-widest uppercase transition-colors cursor-pointer
                           ${activeSection === section
                             ? 'text-zinc-100 border-b border-zinc-500'
                             : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {section === 'about' ? 'About' : categoryInfo[section as ProjectCategory]?.label || section}
              </button>
            ))}
          </div>

           <button className="md:hidden text-zinc-300 hover:text-zinc-100 transition-colors cursor-pointer">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
};

const Hero = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="/images/hero-bg.jpg"
          alt=""
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />
      </div>

      <div
        className="absolute w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none
                   bg-gradient-radial from-zinc-500 to-transparent transition-all duration-1000 ease-out"
        style={{
          left: mousePos.x - 192,
          top: mousePos.y - 192,
        }}
      />

      <div className="relative text-center z-10 px-6">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 opacity-40 animate-pulse">
            <BlackFlame className="w-8 h-8" />
          </div>
          <img src="/images/profile(1)(1).png" alt="WBDEADSUN" className="w-32 h-32 rounded-full object-cover border-2 border-zinc-700/50 grayscale hover:grayscale-0 transition-all duration-700 shadow-[0_0_20px_rgba(255,255,255,0.05)]" />
        </div>
        <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white mb-4">
          WBDEADSUN
        </h1>
        <p className="text-zinc-500 tracking-[0.5em] uppercase text-sm md:text-base">
          Digital Necromancy &bull; Sonic Occultism
        </p>
      </div>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
        <span className="text-xs tracking-widest uppercase text-zinc-400">Scroll to Enter</span>
      </div>
    </section>
  );
};

const About = () => {
  const totalGames = projectsByCategory['games'].length;
  const totalAI = projectsByCategory['ai'].length;
  const totalPrograms = projectsByCategory['programs'].length;
  const totalTracks = projectsByCategory['music'].reduce((acc, p) => acc + (p.tracks?.length || 0), 0);

  return (
    <section id="about" className="py-24 px-6 md:px-12 lg:px-24 bg-gradient-to-b from-black to-zinc-950">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold tracking-widest uppercase text-zinc-100 mb-8">About</h2>
        <GothicDivider />
        <p className="text-zinc-300 text-lg leading-relaxed mb-8">
          I enjoy vibe coding, have been writing lyrics for 20 years, and can never seem to finish a project.
        </p>
        <GothicDivider />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-8">
          {[
            { label: "Games", value: `${totalGames}` },
            { label: "AI Projects", value: `${totalAI}` },
            { label: "Tracks", value: `${totalTracks}+` },
            { label: "Programs", value: `${totalPrograms}` },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-zinc-200 mb-2">{stat.value}</div>
              <div className="text-xs text-zinc-500 tracking-widest uppercase">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

interface MusicState {
  currentTrack: { title: string; file: string; projectTitle: string } | null;
  isPlaying: boolean;
  togglePlay: (track?: { title: string; file: string; projectTitle: string }) => void;
}

const AudioPlayer = ({ tracks, projectTitle, musicState }: { tracks: { title: string; file: string }[], projectTitle: string, musicState: MusicState }) => {
  return (
    <div className="space-y-1 mt-4">
      {tracks.map((track, i) => {
        const isCurrent = musicState.currentTrack?.file === track.file;
        return (
          <div
            key={i}
            className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors group
                       ${isCurrent ? 'bg-zinc-800/50 text-zinc-200' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'}`}
          >
            <button
              className="w-6 text-center font-mono text-xs cursor-pointer"
              onClick={() => musicState.togglePlay({ ...track, projectTitle })}
            >
              {isCurrent && musicState.isPlaying ? '⏸' : '▶'}
            </button>
            <span className="flex-1 truncate cursor-pointer" onClick={() => musicState.togglePlay({ ...track, projectTitle })}>{track.title}</span>
            <a
              href={track.file}
              download
              className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 transition-opacity"
              title="Download MP3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
            <span className="text-zinc-600 text-xs">MP3</span>
          </div>
        );
      })}
    </div>
  );
};

const GlobalPlayer = ({ musicState }: { musicState: MusicState }) => {
  if (!musicState.currentTrack) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-zinc-950 border-t border-zinc-800 px-6 py-3 flex items-center justify-between backdrop-blur-lg">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
          <span className="text-zinc-500 text-xl">♪</span>
        </div>
        <div className="min-w-0">
          <h4 className="text-zinc-100 text-sm font-bold truncate">{musicState.currentTrack.title}</h4>
          <p className="text-zinc-500 text-xs truncate">{musicState.currentTrack.projectTitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={() => musicState.togglePlay()}
          className="w-10 h-10 rounded-full bg-zinc-100 text-black flex items-center justify-center hover:bg-white transition-colors cursor-pointer shrink-0"
        >
          {musicState.isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          ) : (
            <svg className="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>
      </div>

      <div className="hidden md:block">
        <a
          href={musicState.currentTrack.file}
          download
          className="text-xs tracking-widest uppercase text-zinc-500 hover:text-zinc-200 transition-colors flex items-center gap-2"
        >
          Download <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        </a>
      </div>
    </div>
  );
};

const ProjectModal = ({ project, onClose, musicState }: { project: Project; onClose: () => void; musicState: MusicState }) => {
  const [lyrics, setLyrics] = useState<Record<string, string>>({});

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (project.type === 'lyrics' && project.files) {
      project.files.forEach(async (f) => {
        try {
          const res = await fetch(`/projects/music/lyrics/${f}`);
          const text = await res.text();
          setLyrics(prev => ({ ...prev, [f]: text }));
        } catch (e) {
          console.error("Failed to load lyrics", e);
        }
      });
    }
  }, [project]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative max-w-2xl w-full max-h-[80vh] overflow-y-auto bg-zinc-950 border border-zinc-800 p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 text-2xl cursor-pointer">&times;</button>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-bold text-zinc-100 tracking-wide">{project.title}</h3>
            <p className="text-zinc-500 text-sm tracking-widest uppercase mt-1">{categoryInfo[project.category].label}</p>
          </div>
        </div>

        <p className="text-zinc-200 text-sm leading-relaxed mb-6">{project.details || project.description}</p>

        <div className="flex flex-wrap gap-2 mb-6">
          {project.tech.map((t) => (
            <span key={t} className="text-xs px-2 py-1 bg-zinc-900 text-zinc-400 border border-zinc-700">{t}</span>
          ))}
        </div>

        {project.type === 'music' && project.tracks && (
          <div className="mb-6">
            <h4 className="text-xs tracking-widest uppercase text-zinc-500 mb-3">Tracks ({project.tracks.length})</h4>
            <AudioPlayer tracks={project.tracks} projectTitle={project.title} musicState={musicState} />
          </div>
        )}

        {project.type === 'lyrics' && project.files && (
          <div className="mb-6 space-y-8">
            <h4 className="text-xs tracking-widest uppercase text-zinc-500 mb-3">Lyric Sheets</h4>
            {project.files.map((f) => (
              <div key={f} className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-sm">
                <h5 className="text-zinc-100 font-bold mb-4 uppercase tracking-widest text-xs border-b border-zinc-800 pb-2">{f}</h5>
                <pre className="text-zinc-400 text-sm whitespace-pre-wrap font-serif italic leading-relaxed">
                  {lyrics[f] || "Loading..."}
                </pre>
              </div>
            ))}
          </div>
        )}

        {project.files && project.type === 'program' && (
          <div className="mb-6">
            <h4 className="text-xs tracking-widest uppercase text-zinc-500 mb-3">Files</h4>
            <div className="flex flex-wrap gap-2">
              {project.files.map((f) => (
                <span key={f} className="text-xs px-2 py-1 bg-zinc-900 text-zinc-400 border border-zinc-700">{f}</span>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
               <a
                href={`/projects/programs/${project.id}.zip`}
                className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-700 px-4 py-2 hover:border-zinc-500"
              >
                Download Source &rarr;
              </a>
            </div>
          </div>
        )}

        {project.path && project.type === 'ai' && (
          <a
            href={project.path}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-700 px-4 py-2 hover:border-zinc-500"
          >
            Open File &rarr;
          </a>
        )}

        {project.path && project.type === 'game' && (
          <a
            href={project.path}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-700 px-4 py-2 hover:border-zinc-500"
          >
            Play Game &rarr;
          </a>
        )}
      </div>
    </div>
  );
};

const ProjectCard = ({ project, index, onSelect }: { project: Project; index: number; onSelect: (p: Project) => void }) => {
  const [isHovered, setIsHovered] = useState(false);

  const categoryLabel = categoryInfo[project.category].icon;

  return (
    <div
      className="group relative bg-gradient-to-b from-zinc-900/90 to-black/95 border border-zinc-800/50
                 hover:border-zinc-600/60 transition-all duration-500 overflow-hidden cursor-pointer"
      style={{ animationDelay: `${index * 100}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(project)}
    >
      <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-zinc-600/50 group-hover:border-zinc-500 transition-colors" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-zinc-600/50 group-hover:border-zinc-500 transition-colors" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-zinc-600/50 group-hover:border-zinc-500 transition-colors" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-zinc-600/50 group-hover:border-zinc-500 transition-colors" />

      <div className={`absolute inset-0 bg-gradient-radial from-zinc-800/20 via-transparent to-transparent
                       transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

      <div className="relative p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-zinc-100 tracking-wide group-hover:text-white transition-colors">
            {categoryLabel} {project.title}
          </h3>
          <span className={`text-xs font-mono tracking-wider px-2 py-0.5 border ${
            project.type === 'game' ? 'text-emerald-400 border-emerald-800/50' :
            project.type === 'music' ? 'text-violet-400 border-violet-800/50' :
            project.type === 'ai' ? 'text-cyan-400 border-cyan-800/50' :
            'text-amber-400 border-amber-800/50'
          }`}>
            {project.type}
          </span>
        </div>

        <p className="text-zinc-300 text-sm leading-relaxed mb-4 group-hover:text-zinc-200 transition-colors line-clamp-3">
          {project.description}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {project.tech.slice(0, 3).map((tech) => (
            <span key={tech} className="text-xs px-2 py-1 bg-zinc-900/80 text-zinc-400 border border-zinc-700
                                       group-hover:border-zinc-600 transition-colors">
              {tech}
            </span>
          ))}
          {project.tech.length > 3 && (
            <span className="text-xs px-2 py-1 text-zinc-500">+{project.tech.length - 3}</span>
          )}
        </div>

        <div className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
          <span>View Details</span>
          <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
        </div>
      </div>
    </div>
  );
};

const LyricsBar = ({ project, onSelect }: { project: Project; onSelect: (p: Project) => void }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative bg-gradient-to-b from-zinc-900/90 to-black/95 border border-zinc-800/50
                 hover:border-zinc-600/60 transition-all duration-500 overflow-hidden cursor-pointer col-span-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(project)}
    >
      <div className={`absolute inset-0 bg-gradient-radial from-zinc-800/20 via-transparent to-transparent
                       transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
      <div className="relative flex items-center gap-4 p-3 md:p-4">
        <span className="text-2xl opacity-60">{categoryInfo[project.category].icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-zinc-100 tracking-wide">{project.title}</h3>
          <p className="text-zinc-400 text-sm leading-relaxed truncate">{project.description}</p>
        </div>
        <span className="text-xs font-mono tracking-wider px-2 py-0.5 border text-amber-400 border-amber-800/50 shrink-0">
          {project.type}
        </span>
        <div className="flex items-center gap-2 text-xs text-zinc-400 shrink-0">
          <span>View Details</span>
          <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
        </div>
      </div>
    </div>
  );
};

const Section = ({ category, onSelectProject }: { category: ProjectCategory; onSelectProject: (p: Project) => void }) => {
  const info = categoryInfo[category];
  const categoryProjects = projectsByCategory[category];
  const normalProjects = categoryProjects.filter(p => p.type !== 'lyrics');
  const lyricsProject = categoryProjects.find(p => p.type === 'lyrics');

  return (
    <section className="py-16 px-6 md:px-12 lg:px-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-4xl mb-4 block opacity-60">{info.icon}</span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-widest uppercase text-zinc-100 mb-2">
            {info.label}
          </h2>
          <p className="text-zinc-500 text-sm tracking-widest uppercase">{info.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {normalProjects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} onSelect={onSelectProject} />
          ))}
        </div>

        {lyricsProject && (
          <div className="mt-6">
            <LyricsBar project={lyricsProject} onSelect={onSelectProject} />
          </div>
        )}
      </div>
    </section>
  );
};

const Contact = () => (
  <section className="py-24 px-6 md:px-12 lg:px-24 bg-black border-t border-zinc-700/50">
    <div className="max-w-4xl mx-auto text-center">
      <h2 className="text-3xl md:text-4xl font-bold tracking-widest uppercase text-zinc-100 mb-8">Contact</h2>
      <GothicDivider />
      <p className="text-zinc-300 mb-8">
        Interested in collaborating or have questions? Reach out.
      </p>
      <div className="flex flex-wrap justify-center gap-6 mb-12">
        <a
          href="https://github.com/recursive-ai-dev"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 border border-zinc-700 text-zinc-300 hover:border-zinc-500
                     hover:text-zinc-100 transition-all text-sm tracking-widest uppercase"
        >
          GitHub &rarr;
        </a>
        <a
          href="https://www.youtube.com/@wbdeadsun"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 border border-zinc-700 text-zinc-300 hover:border-zinc-500
                     hover:text-zinc-100 transition-all text-sm tracking-widest uppercase"
        >
          YouTube &rarr;
        </a>
        <a
          href="tel:+15069535591"
          className="px-6 py-3 border border-zinc-700 text-zinc-300 hover:border-zinc-500
                     hover:text-zinc-100 transition-all text-sm tracking-widest uppercase"
        >
          +1 506-953-5591 &rarr;
        </a>
      </div>
      <div className="pt-12 border-t border-zinc-800/50">
        <p className="text-zinc-500 text-xs tracking-widest mb-2">&copy; 2025 &bull; WBDEADSUN Archives</p>
        <p className="text-zinc-600 text-[10px] tracking-widest uppercase">+1 506-953-5591</p>
      </div>
    </div>
  </section>
);

export default function App() {
  const [activeSection, setActiveSection] = useState('home');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Global Audio State
  const [currentTrack, setCurrentTrack] = useState<{ title: string; file: string; projectTitle: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.addEventListener('ended', () => setIsPlaying(false));
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const togglePlay = (track?: { title: string; file: string; projectTitle: string }) => {
    if (!audioRef.current) return;

    if (track) {
      if (currentTrack?.file === track.file) {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          audioRef.current.play();
          setIsPlaying(true);
        }
      } else {
        audioRef.current.src = track.file;
        audioRef.current.play();
        setCurrentTrack(track);
        setIsPlaying(true);
      }
    } else {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const musicState: MusicState = {
    currentTrack,
    isPlaying,
    togglePlay,
  };

  const scrollToSection = (section: string) => {
    setActiveSection(section);
    if (section === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const element = document.getElementById(section);
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 antialiased pb-24">
      <Navigation activeSection={activeSection} onNavigate={scrollToSection} />

      <main>
        <Hero />
        <About />

        {(Object.keys(projectsByCategory) as ProjectCategory[]).map((category) => (
          <div key={category} id={category}>
            <Section category={category} onSelectProject={setSelectedProject} />
            <GothicDivider />
          </div>
        ))}

        <Contact />
      </main>

      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          musicState={musicState}
        />
      )}

      <GlobalPlayer musicState={musicState} />
    </div>
  );
}

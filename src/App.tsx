import { useState, useEffect, useRef } from 'react';
import ProjectExplorer from './components/ProjectExplorer';
import profileImg from './assets/profile(1)(1).png';
import heroBg from './assets/hero-bg.jpg';
import { projects, projectsByCategory, categoryInfo, type Project, type ProjectCategory } from './projects';

interface MusicTrack {
  title: string;
  file: string;
  projectTitle: string;
}

interface MusicState {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playlist: MusicTrack[];
  togglePlay: (track?: MusicTrack, playlist?: MusicTrack[]) => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;
}

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
  const sections = ['home', 'about', 'archives', ...Object.keys(projectsByCategory)] as const;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-700/50">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="flex items-center justify-between h-16">
          <button onClick={() => onNavigate('home')} className="font-bold tracking-widest text-zinc-100 text-lg cursor-pointer uppercase">
            wbdeadsun
          </button>

          <div className="hidden md:flex items-center gap-1">
            {sections.map((section) => (
              <button
                key={section}
                onClick={() => onNavigate(section)}
                className={`px-4 py-2 text-[10px] tracking-widest uppercase transition-colors cursor-pointer
                           ${activeSection === section
                             ? 'text-zinc-100 border-b border-zinc-500'
                             : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {section === 'about' ? 'About' : section === 'archives' ? 'Archives' : categoryInfo[section as ProjectCategory]?.label || section}
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
          src={heroBg}
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
          <img src={profileImg} alt="WBDEADSUN" className="w-56 h-56 rounded-lg object-cover border-t border-l border-zinc-700/30 shadow-[20px_20px_40px_rgba(0,0,0,0.9),-5px_-5px_15px_rgba(255,255,255,0.02)] hover:scale-[1.02] transition-all duration-1000" />
        </div>
        <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white mb-4">
          WBDEADSUN
        </h1>
        <p className="text-zinc-500 tracking-[0.5em] uppercase text-sm md:text-base">
          Digital Summoning Rituals and Music
        </p>
      </div>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
        <span className="text-xs tracking-widest uppercase text-zinc-400">Scroll to Enter</span>
      </div>
    </section>
  );
};

const About = () => {
  const totalGames = projectsByCategory['games']?.length || 0;
  const totalAI = projectsByCategory['ai']?.length || 0;
  const totalPrograms = projectsByCategory['programs']?.length || 0;
  const totalTracks = (projectsByCategory['music'] || []).reduce((acc, p) => acc + (p.tracks?.length || 0), 0);

  return (
    <section id="about" className="py-24 px-6 md:px-12 lg:px-24 bg-gradient-to-b from-black to-zinc-950">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold tracking-widest uppercase text-zinc-100 mb-8">About</h2>
        <GothicDivider />
        <p className="text-zinc-300 text-lg leading-relaxed mb-8">
          I enjoy vibe coding, have been writing lyrics for 20 years, and can never seem to finish a project.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="p-4 border border-zinc-800/50 bg-zinc-900/20">
            <span className="block text-2xl font-bold text-zinc-100 mb-1">{totalTracks}</span>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Audio Records</span>
          </div>
          <div className="p-4 border border-zinc-800/50 bg-zinc-900/20">
            <span className="block text-2xl font-bold text-zinc-100 mb-1">{totalAI}</span>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">AI Entities</span>
          </div>
          <div className="p-4 border border-zinc-800/50 bg-zinc-900/20">
            <span className="block text-2xl font-bold text-zinc-100 mb-1">{totalPrograms}</span>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Ritual Scripts</span>
          </div>
          <div className="p-4 border border-zinc-800/50 bg-zinc-900/20">
            <span className="block text-2xl font-bold text-zinc-100 mb-1">{totalGames}</span>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Simulations</span>
          </div>
        </div>
        <GothicDivider />
      </div>
    </section>
  );
};

const GlobalArchiveExplorer = () => {
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  return (
    <section id="archives" className="py-24 px-6 md:px-12 lg:px-24 bg-black border-t border-zinc-900">
      <div className="max-w-6xl mx-auto">
         <div className="text-center mb-12">
          <span className="text-4xl mb-4 block opacity-60">📁</span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-widest uppercase text-zinc-100 mb-2">
            The Archives
          </h2>
          <p className="text-zinc-500 text-sm tracking-widest uppercase">Deep filesystem inspection</p>
        </div>

        <div className="h-[600px] shadow-2xl bg-zinc-950 border border-zinc-800">
           {previewFile ? (
             <FilePreview path={previewFile} onClose={() => setPreviewFile(null)} />
           ) : (
             <ProjectExplorer
              initialPath="projects"
              onOpenFile={(path) => setPreviewFile(path)}
              className="h-full border-none"
             />
           )}
        </div>
      </div>
    </section>
  );
};

const AudioPlayer = ({ tracks, projectTitle, musicState }: { tracks: { title: string; file: string }[], projectTitle: string, musicState: MusicState }) => {
  const playlist: MusicTrack[] = tracks.map(t => ({ ...t, projectTitle }));

  return (
    <div className="space-y-1 mt-4">
      {tracks.map((track, i) => {
        const isCurrent = musicState.currentTrack?.file === track.file;
        const trackWithProject = { ...track, projectTitle };

        return (
          <div
            key={i}
            className={`flex items-center gap-3 px-3 py-2 text-sm transition-all duration-300 group
                       ${isCurrent ? "bg-zinc-800/80 text-zinc-100 border-l-2 border-zinc-400" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"}`}
          >
            <button
              className="w-6 text-center font-mono text-xs cursor-pointer hover:scale-110 transition-transform"
              onClick={() => musicState.togglePlay(trackWithProject, playlist)}
            >
              {isCurrent && musicState.isPlaying ? (
                 <div className="flex items-center justify-center gap-0.5 h-3">
                    <div className="w-0.5 bg-zinc-200 animate-music-bar-1 h-full" />
                    <div className="w-0.5 bg-zinc-200 animate-music-bar-2 h-full" />
                    <div className="w-0.5 bg-zinc-200 animate-music-bar-3 h-full" />
                 </div>
              ) : (
                <span className="opacity-60 group-hover:opacity-100">▶</span>
              )}
            </button>
            <span
              className="flex-1 truncate cursor-pointer font-medium tracking-tight"
              onClick={() => musicState.togglePlay(trackWithProject, playlist)}
            >
              {track.title}
            </span>
            <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <a
                href={track.file}
                download
                className="text-zinc-600 hover:text-zinc-300 transition-colors"
                title="Download MP3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
              <span className="text-[10px] font-mono text-zinc-700">MP3</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const GlobalPlayer = ({ musicState }: { musicState: MusicState }) => {
  if (!musicState.currentTrack) return null;

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-zinc-950/90 border-t border-zinc-800 px-4 md:px-6 py-3 backdrop-blur-xl flex flex-col gap-2 md:gap-0 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4 min-w-0 md:w-1/4">
        <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 relative overflow-hidden group">
           {musicState.isPlaying && (
             <div className="absolute inset-0 flex items-center justify-center gap-0.5 opacity-30">
                <div className="w-1 bg-zinc-400 animate-music-bar-1 h-3" />
                <div className="w-1 bg-zinc-400 animate-music-bar-2 h-5" />
                <div className="w-1 bg-zinc-400 animate-music-bar-3 h-4" />
             </div>
           )}
          <span className="text-zinc-500 text-xl relative z-10">♪</span>
        </div>
        <div className="min-w-0">
          <h4 className="text-zinc-100 text-sm font-bold truncate tracking-wide">{musicState.currentTrack.title}</h4>
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest truncate">{musicState.currentTrack.projectTitle}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 flex-1 max-w-2xl px-4">
        <div className="flex items-center gap-4 md:gap-8">
          <button
            onClick={() => musicState.previousTrack()}
            className="text-zinc-500 hover:text-zinc-100 transition-colors cursor-pointer p-1"
            title="Previous Track"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
          </button>

          <button
            onClick={() => musicState.togglePlay()}
            className="w-10 h-10 rounded-full bg-zinc-100 text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 shadow-lg shadow-white/5"
          >
            {musicState.isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg className="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>

          <button
            onClick={() => musicState.nextTrack()}
            className="text-zinc-500 hover:text-zinc-100 transition-colors cursor-pointer p-1"
            title="Next Track"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
        </div>

        <div className="w-full flex items-center gap-3">
          <span className="text-[10px] font-mono text-zinc-500 w-8 text-right">{formatTime(musicState.currentTime)}</span>
          <div className="relative flex-1 group py-2 flex items-center">
            <input
              type="range"
              min="0"
              max={musicState.duration || 0}
              value={musicState.currentTime}
              onChange={(e) => musicState.seek(parseFloat(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-400 hover:accent-zinc-200 transition-all"
            />
          </div>
          <span className="text-[10px] font-mono text-zinc-500 w-8">{formatTime(musicState.duration)}</span>
        </div>
      </div>

      <div className="hidden md:flex items-center justify-end gap-6 md:w-1/4">
         <div className="flex items-center gap-2 group">
            <svg className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={musicState.volume}
              onChange={(e) => musicState.setVolume(parseFloat(e.target.value))}
              className="w-20 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-500 hover:accent-zinc-300 transition-all"
            />
         </div>
        <a
          href={musicState.currentTrack.file}
          download
          className="text-[10px] tracking-widest uppercase text-zinc-500 hover:text-zinc-200 transition-colors flex items-center gap-2 border border-zinc-800 px-3 py-1.5 hover:bg-zinc-900"
        >
          MP3 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        </a>
      </div>
    </div>
  );
};

const FilePreview = ({ path, onClose }: { path: string; onClose: () => void }) => {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(path);
  const isAudio = /\.mp3$/i.test(path);

  useEffect(() => {
    if (isImage || isAudio) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/${path}`)
      .then(res => res.text())
      .then(text => {
        setContent(text);
        setLoading(false);
      })
      .catch(err => {
        setContent("Error loading file.");
        setLoading(false);
      });
  }, [path]);

  return (
    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-zinc-900/80 px-4 py-2 border-b border-zinc-800 flex justify-between items-center">
        <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-mono truncate mr-4">{path}</span>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors">&times; CLOSE PREVIEW</button>
      </div>
      <div className="flex-1 overflow-auto p-6 bg-black/20 custom-scrollbar">
        {loading ? (
          <div className="h-full flex items-center justify-center text-zinc-600 font-mono text-xs animate-pulse">ACCESSING ENCRYPTED DATA...</div>
        ) : isImage ? (
          <div className="h-full flex items-center justify-center">
            <img src={`/${path}`} alt="" className="max-w-full max-h-full object-contain border border-zinc-800 shadow-2xl" />
          </div>
        ) : isAudio ? (
          <div className="h-full flex flex-col items-center justify-center gap-6">
            <div className="text-4xl">🎵</div>
            <audio src={`/${path}`} controls className="w-full max-w-md accent-zinc-500" />
          </div>
        ) : (
          <pre className="text-xs md:text-sm font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {content}
          </pre>
        )}
      </div>
    </div>
  );
};

const ProjectModal = ({ project, onClose, musicState }: { project: Project; onClose: () => void; musicState: MusicState }) => {
  const [lyrics, setLyrics] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'explorer' | 'live'>('overview');
  const [previewFile, setPreviewFile] = useState<string | null>(null);

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

  const hasLivePreview = project.path && (project.type === 'game' || project.path.endsWith('.html'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative max-w-4xl w-full h-[85vh] flex flex-col bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-zinc-900/50 p-4 border-b border-zinc-800 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div>
              <h3 className="text-lg font-bold text-zinc-100 tracking-wide uppercase leading-tight">{project.title}</h3>
              <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase">{project.type}</p>
            </div>

            <div className="flex items-center gap-1 ml-4 bg-black/40 p-1 rounded-sm border border-zinc-800">
               <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1 text-[10px] uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('explorer')}
                className={`px-3 py-1 text-[10px] uppercase tracking-widest transition-all ${activeTab === 'explorer' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Explorer
              </button>
              {hasLivePreview && (
                 <button
                  onClick={() => setActiveTab('live')}
                  className={`px-3 py-1 text-[10px] uppercase tracking-widest transition-all ${activeTab === 'live' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Live
                </button>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 text-2xl px-2 cursor-pointer transition-colors">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'overview' && (
            <div className="animate-in fade-in duration-500">
              <p className="text-zinc-200 text-sm leading-relaxed mb-8 border-l-2 border-zinc-800 pl-4 py-2">{project.details || project.description}</p>

              <div className="flex flex-wrap gap-2 mb-8">
                {project.tech.map((t) => (
                  <span key={t} className="text-[10px] font-mono px-2 py-1 bg-zinc-900 text-zinc-500 border border-zinc-800">{t}</span>
                ))}
              </div>

              {project.type === 'music' && project.tracks && (
                <div className="mb-8">
                  <h4 className="text-[10px] tracking-widest uppercase text-zinc-500 mb-4 pb-2 border-b border-zinc-900">Archives ({project.tracks.length} tracks)</h4>
                  <AudioPlayer tracks={project.tracks} projectTitle={project.title} musicState={musicState} />
                </div>
              )}

              {project.type === 'lyrics' && project.files && (
                <div className="space-y-12">
                  <h4 className="text-[10px] tracking-widest uppercase text-zinc-500 mb-4">Original Manuscripts</h4>
                  {project.files.map((f) => (
                    <div key={f} className="relative">
                      <div className="absolute -top-4 left-4 bg-zinc-950 px-2 text-[10px] text-zinc-600 uppercase tracking-widest">{f}</div>
                      <div className="p-8 bg-zinc-900/20 border border-zinc-800/50 rounded-sm">
                        <pre className="text-zinc-400 text-sm whitespace-pre-wrap font-serif italic leading-relaxed">
                          {lyrics[f] || "CRAWLING SOURCE..."}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {project.files && project.type === 'program' && (
                <div className="mb-8">
                  <h4 className="text-[10px] tracking-widest uppercase text-zinc-500 mb-4">Core Components</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {project.files.map((f) => (
                      <div key={f} className="text-[10px] px-3 py-2 bg-zinc-900/50 text-zinc-400 border border-zinc-800 font-mono truncate">{f}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-12 flex gap-4 border-t border-zinc-900 pt-8">
                 {project.path && (
                   <a
                    href={project.path}
                    target="_blank"
                    className="px-6 py-3 border border-zinc-700 text-zinc-300 hover:border-zinc-100 hover:text-white transition-all text-[10px] tracking-widest uppercase"
                   >
                    {project.type === 'game' ? 'Execute Simulation' : project.type === 'ai' ? 'Access Entity' : 'Source View'}
                   </a>
                 )}
                 {project.type === 'program' && (
                    <button className="px-6 py-3 border border-zinc-800 text-zinc-600 transition-all text-[10px] tracking-widest uppercase cursor-not-allowed">
                      Binary Locked
                    </button>
                 )}
              </div>
            </div>
          )}

          {activeTab === 'explorer' && (
            <div className="h-full flex flex-col animate-in slide-in-from-bottom-4 duration-500">
              {previewFile ? (
                <FilePreview path={previewFile} onClose={() => setPreviewFile(null)} />
              ) : (
                <ProjectExplorer
                  initialPath={`projects/${project.category}/${project.id}`}
                  onOpenFile={(path) => setPreviewFile(path)}
                  className="flex-1 border-none bg-transparent"
                />
              )}
            </div>
          )}

          {activeTab === 'live' && hasLivePreview && (
            <div className="h-full flex flex-col animate-in zoom-in-95 duration-500">
              <iframe
                src={project.path}
                className="flex-1 w-full border border-zinc-800 bg-white"
                title={project.title}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



const ProjectCard = ({ project, index, onSelect }: { project: Project; index: number; onSelect: (p: Project) => void }) => {
  const [isHovered, setIsHovered] = useState(false);

  const categoryLabel = categoryInfo[project.category]?.icon || '◈';

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
          <span className={`text-[10px] font-mono tracking-wider px-2 py-0.5 border ${
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
            <span key={tech} className="text-[10px] px-2 py-1 bg-zinc-900/80 text-zinc-400 border border-zinc-700
                                       group-hover:border-zinc-600 transition-colors">
              {tech}
            </span>
          ))}
          {project.tech.length > 3 && (
            <span className="text-[10px] px-2 py-1 text-zinc-500">+{project.tech.length - 3}</span>
          )}
        </div>

        <div className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
          <span className="text-[10px] uppercase tracking-widest font-bold">View Archive</span>
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
          <h3 className="text-lg font-bold text-zinc-100 tracking-wide uppercase">{project.title}</h3>
          <p className="text-zinc-400 text-sm leading-relaxed truncate">{project.description}</p>
        </div>
        <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 border text-amber-400 border-amber-800/50 shrink-0">
          {project.type}
        </span>
        <div className="flex items-center gap-2 text-xs text-zinc-400 shrink-0">
          <span className="text-[10px] uppercase tracking-widest font-bold">View Details</span>
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
      <p className="text-zinc-300 mb-8 uppercase tracking-widest text-xs">
        Interested in collaborating or have questions? Reach out.
      </p>
      <div className="flex flex-wrap justify-center gap-6 mb-12">
        <a
          href="https://github.com/recursive-ai-dev"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 border border-zinc-700 text-zinc-300 hover:border-zinc-500
                     hover:text-zinc-100 transition-all text-[10px] tracking-widest uppercase"
        >
          GitHub &rarr;
        </a>
        <a
          href="https://www.youtube.com/@wbdeadsun"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 border border-zinc-700 text-zinc-300 hover:border-zinc-500
                     hover:text-zinc-100 transition-all text-[10px] tracking-widest uppercase"
        >
          YouTube &rarr;
        </a>
        <a
          href="tel:+15069535591"
          className="px-6 py-3 border border-zinc-700 text-zinc-300 hover:border-zinc-500
                     hover:text-zinc-100 transition-all text-[10px] tracking-widest uppercase"
        >
          +1 506-953-5591 &rarr;
        </a>
      </div>
      <div className="pt-12 border-t border-zinc-800/50">
        <p className="text-zinc-500 text-[10px] tracking-[0.4em] mb-2 uppercase">&copy; 2025 &bull; WBDEADSUN Archives</p>
        <p className="text-zinc-600 text-[9px] tracking-[0.2em] uppercase">+1 506-953-5591</p>
      </div>
    </div>
  </section>
);

export default function App() {
  const [activeSection, setActiveSection] = useState('home');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Global Audio State
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [playlist, setPlaylist] = useState<MusicTrack[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();

    const audio = audioRef.current;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => nextTrack();
    const handleVolumeChange = () => setVolumeState(audio.volume);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("volumechange", handleVolumeChange);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("volumechange", handleVolumeChange);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const togglePlay = (track?: MusicTrack, playlistData?: MusicTrack[]) => {
    if (!audioRef.current) return;

    if (track) {
      if (playlistData) setPlaylist(playlistData);
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
        if (currentTrack) {
          audioRef.current.play();
          setIsPlaying(true);
        }
      }
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const setVolume = (v: number) => {
    if (audioRef.current) {
      audioRef.current.volume = v;
      setVolumeState(v);
    }
  };

  const nextTrack = () => {
    if (playlist.length > 0 && currentTrack) {
      const currentIndex = playlist.findIndex(t => t.file === currentTrack.file);
      const nextIndex = (currentIndex + 1) % playlist.length;
      togglePlay(playlist[nextIndex], playlist);
    }
  };

  const previousTrack = () => {
    if (playlist.length > 0 && currentTrack) {
      const currentIndex = playlist.findIndex(t => t.file === currentTrack.file);
      const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
      togglePlay(playlist[prevIndex], playlist);
    }
  };

  const musicState: MusicState = {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    playlist,
    togglePlay,
    seek,
    setVolume,
    nextTrack,
    previousTrack,
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
        <GlobalArchiveExplorer />

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

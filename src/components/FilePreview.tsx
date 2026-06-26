import React, { useEffect, useState } from 'react';

interface FilePreviewProps {
  path: string;
  onClose: () => void;
}

type PreviewStatus = 'loading' | 'ready' | 'error';

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i;
const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|flac|aac|m4a)$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|mkv|avi)$/i;
const PDF_EXTENSION = /\.pdf$/i;
const BINARY_CONTENT_TYPES = /^(image|audio|video|application\/pdf|application\/octet-stream)/i;

function assetUrl(path: string): string {
  // Build a relative URL so the single-file build works on any base path.
  const encoded = path
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');
  return `./${encoded}`;
}

const FilePreview: React.FC<FilePreviewProps> = ({ path, onClose }) => {
  const [content, setContent] = useState<string>('');
  const [status, setStatus] = useState<PreviewStatus>('loading');
  const [error, setError] = useState<string>('');

  const isImage = IMAGE_EXTENSIONS.test(path);
  const isAudio = AUDIO_EXTENSIONS.test(path);
  const isVideo = VIDEO_EXTENSIONS.test(path);
  const isPdf = PDF_EXTENSION.test(path);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setError('');
    setContent('');

    if (isImage || isAudio || isVideo || isPdf) {
      // Binary assets are rendered directly; no text fetch needed.
      setStatus('ready');
      return;
    }

    const url = assetUrl(path);

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const contentType = res.headers.get('content-type') || '';
        if (BINARY_CONTENT_TYPES.test(contentType)) {
          throw new Error('Binary files cannot be previewed as text.');
        }
        const text = await res.text();
        setContent(text);
        setStatus('ready');
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load file.');
        setStatus('error');
      });

    return () => controller.abort();
  }, [path]);

  return (
    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-zinc-900/80 px-4 py-2 border-b border-zinc-800 flex justify-between items-center">
        <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-mono truncate mr-4">
          {path}
        </span>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-200 transition-colors text-[10px] tracking-widest uppercase shrink-0"
        >
          &times; Close Preview
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-black/20 custom-scrollbar">
        {status === 'loading' && (
          <div className="h-full flex items-center justify-center text-zinc-600 font-mono text-xs animate-pulse">
            ACCESSING ARCHIVE DATA...
          </div>
        )}

        {status === 'error' && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 font-mono text-xs gap-4">
            <span className="text-2xl">⚠</span>
            <div className="text-center max-w-md">
              <p className="text-zinc-300 mb-2">ARCHIVE ACCESS FAILED</p>
              <p className="text-zinc-600">{error}</p>
            </div>
          </div>
        )}

        {status === 'ready' && isImage && (
          <div className="h-full flex items-center justify-center">
            <img
              src={assetUrl(path)}
              alt={path}
              className="max-w-full max-h-full object-contain border border-zinc-800 shadow-2xl"
              onError={() => {
                setStatus('error');
                setError('Image failed to load.');
              }}
            />
          </div>
        )}

        {status === 'ready' && isAudio && (
          <div className="h-full flex flex-col items-center justify-center gap-6">
            <div className="text-4xl">🎵</div>
            <audio src={assetUrl(path)} controls className="w-full max-w-md accent-zinc-500" />
            <a
              href={assetUrl(path)}
              download
              className="text-[10px] tracking-widest uppercase text-zinc-500 hover:text-zinc-200 transition-colors border border-zinc-800 px-3 py-1.5 hover:bg-zinc-900"
            >
              Download Audio
            </a>
          </div>
        )}

        {status === 'ready' && isVideo && (
          <div className="h-full flex flex-col items-center justify-center gap-6">
            <div className="text-4xl">🎬</div>
            <video src={assetUrl(path)} controls className="w-full max-w-3xl border border-zinc-800" />
          </div>
        )}

        {status === 'ready' && isPdf && (
          <div className="h-full flex flex-col items-center justify-center gap-6">
            <div className="text-4xl">📄</div>
            <a
              href={assetUrl(path)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-zinc-700 text-zinc-300 hover:border-zinc-100 hover:text-white transition-all text-[10px] tracking-widest uppercase"
            >
              Open PDF &rarr;
            </a>
          </div>
        )}

        {status === 'ready' && !isImage && !isAudio && !isVideo && !isPdf && (
          <pre className="text-xs md:text-sm font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {content}
          </pre>
        )}
      </div>
    </div>
  );
};

export default FilePreview;

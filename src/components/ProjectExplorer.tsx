import React, { useState, useMemo } from 'react';
import { fileTree } from '../fileTree';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface ProjectExplorerProps {
  initialPath?: string;
  onOpenFile?: (path: string) => void;
  className?: string;
}

const ROOT_NAME = 'projects';

function resolveNode(pathParts: string[]): { node: FileNode; validPath: string[] } {
  let node: FileNode = fileTree as FileNode;
  const parts = pathParts[0] === ROOT_NAME ? pathParts.slice(1) : pathParts;
  const validPath: string[] = [ROOT_NAME];

  for (const part of parts) {
    if (!part) continue;
    const nextNode = node.children?.find(child => child.name === part);
    if (nextNode) {
      node = nextNode;
      validPath.push(part);
    } else {
      break;
    }
  }

  return { node, validPath };
}

const ProjectExplorer: React.FC<ProjectExplorerProps> = ({ initialPath = ROOT_NAME, onOpenFile, className = '' }) => {
  const [currentPath, setCurrentPath] = useState<string[]>(() => {
    const parts = initialPath.split('/').filter(Boolean);
    return parts.length > 0 ? parts : [ROOT_NAME];
  });

  const { node: currentNode, validPath } = useMemo(() => resolveNode(currentPath), [currentPath]);

  // If the resolved path is shorter than requested, snap the UI back to the valid path.
  const displayPath = validPath;
  const pathMismatch = displayPath.length !== currentPath.length;
  if (pathMismatch) {
    // Defer the state update to avoid setting state during render.
    queueMicrotask(() => setCurrentPath(displayPath));
  }

  const navigateTo = (path: string) => {
    const parts = path.split('/').filter(Boolean);
    setCurrentPath(parts.length > 0 ? parts : [ROOT_NAME]);
  };

  const navigateUp = () => {
    if (displayPath.length > 1) {
      setCurrentPath(displayPath.slice(0, -1));
    }
  };

  const handleOpen = (child: FileNode) => {
    if (child.type === 'directory') {
      navigateTo(child.path);
    } else if (onOpenFile) {
      onOpenFile(child.path);
    }
  };

  const renderBreadcrumbs = () => {
    return (
      <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 mb-4 overflow-x-auto whitespace-nowrap pb-2">
        {displayPath.map((part, i) => {
          const path = displayPath.slice(0, i + 1).join('/');
          const isLast = i === displayPath.length - 1;
          return (
            <React.Fragment key={path}>
              {i > 0 && <span>/</span>}
              <button
                onClick={() => navigateTo(path)}
                className={`hover:text-zinc-200 transition-colors ${isLast ? 'text-zinc-300' : ''}`}
              >
                {part}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const getIcon = (type: 'file' | 'directory', name: string) => {
    const lower = name.toLowerCase();
    if (type === 'directory') return '📁';
    if (/\.(mp3|wav|ogg|flac|aac|m4a)$/i.test(lower)) return '🎵';
    if (/\.(html?)$/i.test(lower)) return '🌐';
    if (/\.(py|ts|js|tsx|jsx|rs|c|cpp|h|hpp|go|rb|sh|ps1)$/i.test(lower)) return '📜';
    if (/\.(md|markdown)$/i.test(lower)) return '📖';
    if (/\.(ipynb)$/i.test(lower)) return '📓';
    if (/\.(json|toml|yaml|yml)$/i.test(lower)) return '⚙';
    if (/\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(lower)) return '🖼';
    if (/\.(pdf)$/i.test(lower)) return '📄';
    if (/\.(txt|log)$/i.test(lower)) return '📝';
    return '📄';
  };

  const children = currentNode.children ?? [];

  return (
    <div className={`flex flex-col h-full bg-black/40 border border-zinc-800 rounded-sm font-mono ${className}`}>
      <div className="bg-zinc-900/80 px-4 py-2 border-b border-zinc-800 flex justify-between items-center">
        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">File Explorer</span>
        <span className="text-[10px] text-zinc-600">v1.1.0-stable</span>
      </div>

      <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
        {renderBreadcrumbs()}

        <div className="space-y-1">
          {displayPath.length > 1 && (
            <button
              onClick={navigateUp}
              className="flex items-center gap-3 w-full text-left px-2 py-1.5 text-sm text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all group"
            >
              <span className="opacity-60">⤴</span>
              <span>..</span>
            </button>
          )}

          {children.length === 0 ? (
            <div className="px-2 py-8 text-center text-zinc-600 text-xs">
              <span className="block text-2xl mb-2 opacity-40">∅</span>
              Directory is empty
            </div>
          ) : (
            children.map((child) => (
              <button
                key={child.path}
                onClick={() => handleOpen(child)}
                className={`flex items-center gap-3 w-full text-left px-2 py-1.5 text-sm transition-all group
                           ${child.type === 'directory' ? 'text-zinc-300 hover:text-white' : 'text-zinc-400 hover:text-zinc-200'}
                           hover:bg-zinc-800/50 rounded-sm`}
              >
                <span className="text-base group-hover:scale-110 transition-transform">
                  {getIcon(child.type, child.name)}
                </span>
                <span className="flex-1 truncate">{child.name}</span>
                {child.type === 'directory' && (
                  <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400">DIR</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="bg-zinc-900/30 px-4 py-1.5 border-t border-zinc-800/50 text-[10px] text-zinc-600 flex justify-between">
        <span>{children.length} item{children.length !== 1 ? 's' : ''}</span>
        <span className="truncate max-w-[200px]">PATH: /{displayPath.join('/')}</span>
      </div>
    </div>
  );
};

export default ProjectExplorer;

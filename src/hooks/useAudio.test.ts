import { renderHook, act } from '@testing-library/react';
import { useAudio } from './useAudio';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('useAudio hook', () => {
  beforeEach(() => {
    // Mock HTMLAudioElement
    const mockAudio = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      currentTime: 0,
      duration: 0,
      volume: 1,
      src: '',
    };

    // Mock the global Audio constructor instead of HTMLAudioElement
    vi.stubGlobal('Audio', class {
      play = mockAudio.play;
      pause = mockAudio.pause;
      addEventListener = mockAudio.addEventListener;
      removeEventListener = mockAudio.removeEventListener;
      currentTime = mockAudio.currentTime;
      duration = mockAudio.duration;
      volume = mockAudio.volume;
      src = mockAudio.src;
    });
  });

  it('initializes with default states', () => {
    const { result } = renderHook(() => useAudio());
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.volume).toBe(1);
    expect(result.current.currentTime).toBe(0);
    expect(result.current.duration).toBe(0);
  });

  it('updates volume correctly', () => {
    const { result } = renderHook(() => useAudio());

    act(() => {
      result.current.setVolume(0.5);
    });

    expect(result.current.volume).toBe(0.5);
  });

  it('toggles play/pause state correctly without track', () => {
    const { result } = renderHook(() => useAudio());

    // Nothing playing, should do nothing but we test the initial toggle with track
    act(() => {
      result.current.togglePlay({ file: 'test.mp3', title: 'Test Track', projectTitle: 'Test' });
    });

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.currentTrack?.file).toBe('test.mp3');

    act(() => {
      result.current.togglePlay(); // Should pause
    });

    expect(result.current.isPlaying).toBe(false);
  });
});

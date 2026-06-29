import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GlobalPlayer } from './GlobalPlayer';
import { describe, it, expect, vi } from 'vitest';

describe('GlobalPlayer component', () => {
  const mockMusicState = {
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playlist: [],
    togglePlay: vi.fn(),
    seek: vi.fn(),
    setVolume: vi.fn(),
    nextTrack: vi.fn(),
    previousTrack: vi.fn(),
  };

  it('renders nothing when no track is current', () => {
    const { container } = render(<GlobalPlayer musicState={mockMusicState} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders correctly with a current track', () => {
    const state = {
      ...mockMusicState,
      currentTrack: { title: 'Test Track', file: 'test.mp3', projectTitle: 'Test Project' },
      currentTime: 65,
      duration: 125,
    };

    render(<GlobalPlayer musicState={state} />);

    expect(screen.getByText('Test Track')).toBeInTheDocument();
    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('1:05')).toBeInTheDocument(); // 65 seconds
    expect(screen.getByText('2:05')).toBeInTheDocument(); // 125 seconds
  });

  it('handles negative time in formatTime gracefully', () => {
    const state = {
      ...mockMusicState,
      currentTrack: { title: 'Test Track', file: 'test.mp3', projectTitle: 'Test Project' },
      currentTime: -10,
    };

    render(<GlobalPlayer musicState={state} />);

    // As per formatTime logic, if time < 0, it returns "0:00"
    expect(screen.getAllByText('0:00').length).toBeGreaterThan(0);
  });

  it('calls musicState controls on button click', () => {
    const state = {
      ...mockMusicState,
      currentTrack: { title: 'Test Track', file: 'test.mp3', projectTitle: 'Test Project' },
    };

    render(<GlobalPlayer musicState={state} />);

    const prevButton = screen.getByTitle('Previous Track');
    const nextButton = screen.getByTitle('Next Track');
    // Play button does not have title, so finding it via svg inside a button
    // It is the 2nd button in the flex items-center gap-4 group, but let's query all buttons
    const buttons = screen.getAllByRole('button');
    const toggleButton = buttons[1];

    fireEvent.click(prevButton);
    expect(state.previousTrack).toHaveBeenCalled();

    fireEvent.click(nextButton);
    expect(state.nextTrack).toHaveBeenCalled();

    fireEvent.click(toggleButton);
    expect(state.togglePlay).toHaveBeenCalled();
  });
});

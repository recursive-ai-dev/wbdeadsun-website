import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import FilePreview from './FilePreview';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('FilePreview component', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('renders image files correctly', () => {
    render(<FilePreview path="test.png" onClose={() => {}} />);
    expect(screen.getByAltText('test.png')).toBeInTheDocument();
  });

  it('renders audio files correctly', () => {
    render(<FilePreview path="test.mp3" onClose={() => {}} />);
    expect(screen.getByText('Download Audio')).toBeInTheDocument();
  });

  it('renders video files correctly', () => {
    const { container } = render(<FilePreview path="test.mp4" onClose={() => {}} />);
    expect(container.querySelector('video')).toBeInTheDocument();
  });

  it('renders pdf files correctly', () => {
    render(<FilePreview path="test.pdf" onClose={() => {}} />);
    expect(screen.getByText('Open PDF →')).toBeInTheDocument();
  });

  it('fetches and renders text files correctly', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: () => Promise.resolve('Hello world'),
    });

    render(<FilePreview path="test.txt" onClose={() => {}} />);

    expect(screen.getByText('ACCESSING ARCHIVE DATA...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });
  });

  it('handles fetch errors correctly', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    render(<FilePreview path="missing.txt" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('ARCHIVE ACCESS FAILED')).toBeInTheDocument();
      expect(screen.getByText('HTTP 404: Not Found')).toBeInTheDocument();
    });
  });
});

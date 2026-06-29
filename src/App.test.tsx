import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock scrollIntoView, IntersectionObserver, and window.scrollTo
beforeEach(() => {
  window.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();

  const mockIntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.IntersectionObserver = mockIntersectionObserver as any;

  // Mock global audio to prevent errors from useAudio hook
  vi.stubGlobal('Audio', class {
    play = vi.fn();
    pause = vi.fn();
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    currentTime = 0;
    duration = 0;
    volume = 1;
    src = '';
  });
});

describe('App component', () => {
  it('renders main sections correctly', () => {
    render(<App />);

    // Check Navigation elements
    expect(screen.getAllByText(/ABOUT/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ARCHIVES/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CONTACT/i).length).toBeGreaterThan(0);

    // Check Hero is rendered
    expect(screen.getByText('DAMIEN')).toBeInTheDocument();
  });

  it('updates activeSection state on navigation click', () => {
    render(<App />);

    // Click on About nav link
    const aboutNav = screen.getAllByText(/ABOUT/i)[0]; // Navigation link
    fireEvent.click(aboutNav);

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();

    // Click on Home nav link
    const homeNav = screen.getAllByText(/HOME/i)[0]; // Navigation link
    fireEvent.click(homeNav);

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});

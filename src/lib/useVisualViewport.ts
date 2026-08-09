import { useState, useEffect } from 'react';

export function useVisualViewport() {
  const [viewportHeight, setViewportHeight] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.visualViewport) {
      return window.visualViewport.height;
    }
    return typeof window !== 'undefined' ? window.innerHeight : 0;
  });

  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResizeOrScroll = () => {
      const vv = window.visualViewport;
      const currentHeight = vv ? vv.height : window.innerHeight;
      setViewportHeight(currentHeight);

      document.documentElement.style.setProperty('--vv-height', `${currentHeight}px`);

      const computedKeyboardHeight = vv
        ? Math.max(0, window.innerHeight - vv.height)
        : 0;
      setKeyboardHeight(computedKeyboardHeight);

      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResizeOrScroll);
      window.visualViewport.addEventListener('scroll', handleResizeOrScroll);
    }
    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll);

    handleResizeOrScroll();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResizeOrScroll);
        window.visualViewport.removeEventListener('scroll', handleResizeOrScroll);
      }
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll);
    };
  }, []);

  return { viewportHeight, keyboardHeight };
}


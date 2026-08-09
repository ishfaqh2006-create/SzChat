import { useState, useEffect } from 'react';

export function useVisualViewport() {
  const [viewportHeight, setViewportHeight] = useState<number>(() => {
    return window.visualViewport ? window.visualViewport.height : window.innerHeight;
  });

  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);

  useEffect(() => {
    if (!window.visualViewport) return;

    const handleResizeOrScroll = () => {
      const vv = window.visualViewport;
      if (!vv) return;

      const currentHeight = vv.height;
      setViewportHeight(currentHeight);

      const computedKeyboardHeight = Math.max(0, window.innerHeight - currentHeight);
      setKeyboardHeight(computedKeyboardHeight);

      // Lock window scroll position so body never scrolls up
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };

    window.visualViewport.addEventListener('resize', handleResizeOrScroll);
    window.visualViewport.addEventListener('scroll', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll);

    handleResizeOrScroll();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResizeOrScroll);
        window.visualViewport.removeEventListener('scroll', handleResizeOrScroll);
      }
      window.removeEventListener('scroll', handleResizeOrScroll);
    };
  }, []);

  return { viewportHeight, keyboardHeight };
}

import { useState, useEffect } from 'react';

export function useWindowActivity() {
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const handleFocus = () => setIsActive(true);
    const handleBlur = () => setIsActive(false);
    const handleVisibilityChange = () => {
      setIsActive(!document.hidden);
    };

    // Check initial state
    setIsActive(!document.hidden);

    // Add event listeners
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isActive;
}

export default useWindowActivity;

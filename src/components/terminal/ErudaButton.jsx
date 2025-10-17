// src/components/ErudaToggle.tsx
import { useState } from 'preact/hooks';

export function ErudaToggle() {
  const [visible, setVisible] = useState(false);

  const toggleEruda = () => {
    if (!visible) {
      initEruda();
    } else {
      const el = document.getElementById('eruda-container');
      if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }
    setVisible(!visible);
  };

  return (
    <button style={{ position: 'fixed', bottom: '10px', right: '10px', zIndex: 9999 }} onClick={toggleEruda}>
      {visible ? 'Hide Console' : 'Show Console'}
    </button>
  );
}

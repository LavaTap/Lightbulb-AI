import { useEffect } from 'react';
import { CharacterChatPage } from '@/pages/CharacterChatPage';
import { getTheme } from '@/services/storage';

export default function App() {
  useEffect(() => {
    const theme = getTheme();
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, []);

  return (
    <div className="min-h-screen">
      <CharacterChatPage />
    </div>
  );
}

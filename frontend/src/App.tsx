import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Layout } from '@/components/Layout';
import { InspirationPage } from '@/pages/InspirationPage';
import { CharacterGenPage } from '@/pages/CharacterGenPage';
import { ThreeViewPage } from '@/pages/ThreeViewPage';
import { PosterGenPage } from '@/pages/PosterGenPage';
import { CgGenPage } from '@/pages/CgGenPage';
import { useTheme } from '@/hooks/useTheme';
import type { FeatureType } from '@/types';

function App() {
  const [activeTab, setActiveTab] = useState<FeatureType>('inspiration');
  const { theme } = useTheme();

  const renderPage = () => {
    switch (activeTab) {
      case 'inspiration':
        return <InspirationPage />;
      case 'character':
        return <CharacterGenPage />;
      case 'threeview':
        return <ThreeViewPage />;
      case 'poster':
        return <PosterGenPage />;
      case 'cg':
        return <CgGenPage />;
      default:
        return <InspirationPage />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}

export default App;

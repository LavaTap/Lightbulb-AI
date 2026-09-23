import { motion } from 'framer-motion';
import { Construction } from 'lucide-react';

export function CgGenPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center space-y-6">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center"
        >
          <Construction className="w-12 h-12 text-white" />
        </motion.div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold gradient-text">CG 生成</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            功能开发中，敬请期待
          </p>
        </div>
        
        <div className="flex justify-center gap-2 text-gray-400">
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            .
          </motion.span>
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          >
            .
          </motion.span>
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
          >
            .
          </motion.span>
        </div>
      </div>
    </div>
  );
}

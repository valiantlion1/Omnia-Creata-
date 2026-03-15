import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useTranslation } from 'react-i18next';

// Modern icons as SVG components
const HomeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const GenerateIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const GalleryIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const PresetsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const StudioIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const iconMap = {
  txt2img: GenerateIcon,
  gallery: GalleryIcon,
  presets: PresetsIcon,
  promptStudio: StudioIcon,
};

const Sidebar: React.FC = () => {
  const { state, dispatch } = useStore();
  const { t } = useTranslation();
  
  const navItems = [
    { key: 'txt2img', label: t('navigation.txt2img'), icon: GenerateIcon },
    { key: 'gallery', label: t('navigation.gallery'), icon: GalleryIcon },
    { key: 'presets', label: t('navigation.presets'), icon: PresetsIcon },
    { key: 'promptStudio', label: t('navigation.promptStudio'), icon: StudioIcon },
  ];

  return (
    <motion.aside 
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="sidebar-modern w-72 h-full flex flex-col fixed left-0 top-0 z-40"
    >
      {/* Logo Section */}
      <div className="p-6 border-b border-white/10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">O</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Omnia Creata</h1>
            <p className="text-xs text-gray-400">Studio</p>
          </div>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-4 px-4">Navigation</p>
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = state.activeTab === item.key;
          
          return (
            <motion.button
              key={item.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.4 }}
              onClick={() => dispatch({ type: 'setActiveTab', tab: item.key })}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                ${isActive 
                  ? 'bg-gradient-primary text-white shadow-lg shadow-purple-500/25' 
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <Icon />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="ml-auto w-2 h-2 bg-white rounded-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-white/10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">U</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">User</p>
            <p className="text-xs text-gray-400">Free Plan</p>
          </div>
        </motion.div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
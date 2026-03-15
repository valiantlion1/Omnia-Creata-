import React from 'react';
import { motion } from 'framer-motion';
import Topbar from '@/components/Topbar';
import ControlsPanel from '@/components/ControlsPanel';
import PreviewPanel from '@/components/PreviewPanel';
import { useStore } from '@/lib/store';

const Dashboard: React.FC = () => {
  const { state } = useStore();

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="flex flex-col min-h-screen">
        <Topbar />

        <div className="flex-1 relative z-10">
          <div className="p-4 md:p-6">
            <main>
              {/* Production View */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-100px)]"
              >
                <section className="glass-card rounded-2xl p-5 flex flex-col overflow-hidden">
                  <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[rgb(var(--accent))] rounded-full"></div>
                    Prompt & Settings
                  </h2>
                  <div className="flex-1 overflow-y-auto">
                    <ControlsPanel />
                  </div>
                </section>

                <section className="glass-card rounded-2xl p-5 flex flex-col overflow-hidden">
                  <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[rgb(var(--accent))] rounded-full"></div>
                    Preview
                  </h2>
                  <div className="flex-1">
                    <PreviewPanel />
                  </div>
                </section>
              </motion.div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
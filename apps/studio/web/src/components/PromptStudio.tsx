import React from 'react';

const PromptStudio: React.FC = () => {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-title">Prompt Studio</h2>
        <span className="section-sub">Google AI Studio chat + varyasyon</span>
      </div>
      <div className="flex flex-col h-[500px]">
        <div className="flex-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 p-3 overflow-auto text-sm text-zinc-500">
          <p>Chat transcript will appear here...</p>
        </div>
        <div className="mt-3 flex gap-2">
          <input className="input" placeholder="Ask for a prompt..." />
          <button className="btn-primary">Send</button>
        </div>
      </div>
    </div>
  );
};

export default PromptStudio;
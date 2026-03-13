import React from 'react';
import { useTranslation } from 'react-i18next';

const QueuePanel: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-title">{t('queue.title')}</h2>
        <span className="section-sub">{t('queue.subtitle')}</span>
      </div>
      <ul className="space-y-2 text-sm">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <span>{t('queue.job')} #{i + 1}</span>
            <span className="badge">{t('queue.pending')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default QueuePanel;
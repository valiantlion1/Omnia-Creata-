import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar: string;
  membershipType: 'free' | 'pro' | 'studio';
  joinDate: string;
  totalGenerations: number;
  remainingCredits: number;
  maxCredits: number;
}

interface UserStats {
  totalImages: number;
  favoriteImages: number;
  sharedImages: number;
  downloadCount: number;
}

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'profile' | 'membership' | 'settings' | 'history' | 'engine'>('profile');
  const [isEditing, setIsEditing] = useState(false);

  // Engine Manager state
  const [engineStatus, setEngineStatus] = useState<{
    installed: boolean;
    running: boolean;
    install_path: string;
  }>({ installed: false, running: false, install_path: '' });
  const [engineLoading, setEngineLoading] = useState(false);

  const fetchEngineStatus = useCallback(async () => {
    try {
      const res = await fetch('/v1/engine/status');
      if (res.ok) {
        const data = await res.json();
        setEngineStatus(data);
      }
    } catch (e) {
      // Backend may not be running
    }
  }, []);

  useEffect(() => {
    fetchEngineStatus();
    const interval = setInterval(fetchEngineStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchEngineStatus]);

  const handleEngineToggle = async () => {
    setEngineLoading(true);
    try {
      const action = engineStatus.running ? 'stop' : 'start';
      const res = await fetch(`/v1/engine/${action}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setEngineStatus(data);
      }
    } catch (e) {
      console.error('Engine toggle failed', e);
    } finally {
      setEngineLoading(false);
    }
  };

  // Mock user data
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: '1',
    username: 'creative_user',
    email: 'user@example.com',
    displayName: t('profile.mockData.displayName'),
    avatar: '/api/placeholder/150/150',
    membershipType: 'pro',
    joinDate: '2024-01-15',
    totalGenerations: 1247,
    remainingCredits: 850,
    maxCredits: 1000
  });

  const [userStats, setUserStats] = useState<UserStats>({
    totalImages: 1247,
    favoriteImages: 89,
    sharedImages: 156,
    downloadCount: 2341
  });

  const membershipPlans = [
    {
      type: 'free',
      name: 'Eco',
      price: '₺0',
      period: '/ay',
      credits: 100,
      features: [t('profile.plans.features.basicModels'), t('profile.plans.features.standardQuality'), t('profile.plans.features.communitySupport')],
      color: 'from-gray-500 to-gray-600'
    },
    {
      type: 'pro',
      name: 'Pro',
      price: '₺49',
      period: '/ay',
      credits: 1000,
      features: [t('profile.plans.features.allModels'), t('profile.plans.features.highQuality'), t('profile.plans.features.prioritySupport'), t('profile.plans.features.advancedSettings')],
      color: 'from-accent to-goldB'
    },
    {
      type: 'studio',
      name: 'Studio',
      price: '₺99',
      period: '/ay',
      credits: 2500,
      features: [t('profile.plans.features.unlimitedModels'), t('profile.plans.features.ultraQuality'), t('profile.plans.features.support247'), t('profile.plans.features.apiAccess'), t('profile.plans.features.commercialUse')],
      color: 'from-purple-500 to-pink-500'
    }
  ];

  const getMembershipInfo = (type: string) => {
    return membershipPlans.find(plan => plan.type === type) || membershipPlans[0];
  };

  const currentPlan = getMembershipInfo(userProfile.membershipType);
  const creditPercentage = (userProfile.remainingCredits / userProfile.maxCredits) * 100;

  const tabs = [
    { id: 'profile', label: t('profile.tabs.profile'), icon: 'user' },
    { id: 'membership', label: t('profile.tabs.membership'), icon: 'crown' },
    { id: 'settings', label: t('profile.tabs.settings'), icon: 'settings' },
    { id: 'history', label: t('profile.tabs.history'), icon: 'history' },
    { id: 'engine', label: 'AI Engine', icon: 'engine' }
  ];

  const getTabIcon = (iconName: string) => {
    const iconClass = 'w-5 h-5';
    switch (iconName) {
      case 'user':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'crown':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5 3l4 6 3-6 3 6 4-6v18H5V3z" />
          </svg>
        );
      case 'settings':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'history':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'engine':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <img
              src={userProfile.avatar}
              alt="Avatar"
              className="w-24 h-24 rounded-full border-4 border-accent/30"
            />
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white hover:bg-accent/80 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-200">{userProfile.displayName}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${currentPlan.color} text-white`}>
                {currentPlan.name}
              </span>
            </div>
            <p className="text-gray-400 mb-1">@{userProfile.username}</p>
            <p className="text-gray-500 text-sm">{t('profile.memberSince')}: {new Date(userProfile.joinDate).toLocaleDateString('tr-TR')}</p>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 bg-accent/20 border border-accent/50 rounded-lg text-accent hover:bg-accent/30 transition-colors"
          >
            {isEditing ? t('profile.cancel') : t('profile.edit')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-accent mb-1">{userStats.totalImages}</div>
          <div className="text-sm text-gray-400">{t('profile.stats.totalImages')}</div>
        </div>
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-goldB mb-1">{userStats.favoriteImages}</div>
          <div className="text-sm text-gray-400">{t('profile.stats.favorites')}</div>
        </div>
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400 mb-1">{userStats.sharedImages}</div>
          <div className="text-sm text-gray-400">{t('profile.stats.shared')}</div>
        </div>
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400 mb-1">{userStats.downloadCount}</div>
          <div className="text-sm text-gray-400">{t('profile.stats.downloads')}</div>
        </div>
      </div>

      {/* Profile Form */}
      {isEditing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-gray-200 mb-4">{t('profile.editProfileInfo')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">{t('profile.displayName')}</label>
              <input
                type="text"
                value={userProfile.displayName}
                onChange={(e) => setUserProfile(prev => ({ ...prev, displayName: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-600/50 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">{t('profile.username')}</label>
              <input
                type="text"
                value={userProfile.username}
                onChange={(e) => setUserProfile(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-600/50 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">{t('profile.email')}</label>
              <input
                type="email"
                value={userProfile.email}
                onChange={(e) => setUserProfile(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-600/50 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button className="px-4 py-2 bg-accent rounded-lg text-white hover:bg-accent/80 transition-colors">
              {t('profile.save')}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-zinc-700 rounded-lg text-gray-300 hover:bg-zinc-600 transition-colors"
            >
              {t('profile.cancel')}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );

  const renderMembershipTab = () => (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">{t('profile.currentPlan')}</h3>
        <div className={`bg-gradient-to-r ${currentPlan.color} rounded-lg p-6 text-white`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-2xl font-bold">{currentPlan.name}</h4>
              <p className="text-white/80">{currentPlan.price}{currentPlan.period}</p>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-80">{t('profile.remainingCredits')}</div>
              <div className="text-2xl font-bold">{userProfile.remainingCredits}</div>
            </div>
          </div>

          {/* Credit Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span>{t('profile.creditUsage')}</span>
              <span>{userProfile.remainingCredits} / {userProfile.maxCredits}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-300"
                style={{ width: `${creditPercentage}%` }}
              />
            </div>
          </div>

          <ul className="space-y-1 text-sm">
            {currentPlan.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Available Plans */}
      <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">{t('profile.otherPlans')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {membershipPlans.filter(plan => plan.type !== userProfile.membershipType).map((plan) => (
            <div key={plan.type} className="bg-zinc-900/50 border border-zinc-600/50 rounded-lg p-4">
              <div className="text-center mb-4">
                <h4 className="text-xl font-bold text-gray-200">{plan.name}</h4>
                <div className="text-2xl font-bold text-accent mt-2">
                  {plan.price}<span className="text-sm text-gray-400">{plan.period}</span>
                </div>
                <div className="text-sm text-gray-400 mt-1">{plan.credits} {t('profile.creditsPerMonth')}</div>
              </div>

              <ul className="space-y-2 mb-4">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-gray-300">
                    <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button className="w-full py-2 bg-accent/20 border border-accent/50 rounded-lg text-accent hover:bg-accent/30 transition-colors">
                {t('profile.upgrade')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">{t('profile.accountSettings')}</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-zinc-700/50">
            <div>
              <div className="text-gray-200">{t('profile.emailNotifications')}</div>
              <div className="text-sm text-gray-400">{t('profile.emailNotificationsDesc')}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-zinc-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-zinc-700/50">
            <div>
              <div className="text-gray-200">{t('profile.autoSave')}</div>
              <div className="text-sm text-gray-400">{t('profile.autoSaveDesc')}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-zinc-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-gray-200">{t('profile.privacyMode')}</div>
              <div className="text-sm text-gray-400">{t('profile.privacyModeDesc')}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-zinc-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">{t('profile.security')}</h3>
        <div className="space-y-3">
          <button className="w-full text-left px-4 py-3 bg-zinc-900/50 border border-zinc-600/50 rounded-lg hover:border-accent/50 transition-colors">
            <div className="text-gray-200">{t('profile.changePassword')}</div>
            <div className="text-sm text-gray-400">{t('profile.changePasswordDesc')}</div>
          </button>

          <button className="w-full text-left px-4 py-3 bg-zinc-900/50 border border-zinc-600/50 rounded-lg hover:border-accent/50 transition-colors">
            <div className="text-gray-200">{t('profile.twoFactorAuth')}</div>
            <div className="text-sm text-gray-400">{t('profile.twoFactorAuthDesc')}</div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-6">
      <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">{t('profile.recentActivities')}</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="flex items-center gap-4 p-3 bg-zinc-900/50 rounded-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-goldB/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-gray-200">{t('profile.imageCreated')}</div>
                <div className="text-sm text-gray-400">"Beautiful landscape with mountains" - {t('profile.hoursAgo', { count: 2 })}</div>
              </div>
              <div className="text-xs text-gray-500">-5 {t('profile.credits')}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderEngineTab = () => (
    <div className="space-y-6">
      {/* Engine Status Card */}
      <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-200">Local AI Engine</h3>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${engineStatus.running
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
            <span className={`w-2 h-2 rounded-full ${engineStatus.running ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              }`} />
            {engineStatus.running ? 'Online' : 'Offline'}
          </div>
        </div>

        {/* Status Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Kurulum Durumu</div>
            <div className={`text-lg font-semibold ${engineStatus.installed ? 'text-green-400' : 'text-yellow-400'}`}>
              {engineStatus.installed ? '✅ Kurulu' : '⚠️ Kurulu Değil'}
            </div>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Motor Yolu</div>
            <div className="text-sm text-gray-300 font-mono truncate" title={engineStatus.install_path}>
              {engineStatus.install_path || '—'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {engineStatus.installed ? (
          <button
            onClick={handleEngineToggle}
            disabled={engineLoading}
            className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-3 ${engineStatus.running
              ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-lg shadow-red-500/20'
              : 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 shadow-lg shadow-green-500/20'
              } ${engineLoading ? 'opacity-70 cursor-wait' : ''}`}
          >
            {engineLoading ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={engineStatus.running ? 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z' : 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z'} />
              </svg>
            )}
            {engineLoading
              ? (engineStatus.running ? 'Durduruluyor...' : 'Başlatılıyor...')
              : (engineStatus.running ? 'Motoru Durdur' : 'Motoru Başlat')
            }
          </button>
        ) : (
          <div className="bg-zinc-900/60 rounded-xl p-6 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            <h4 className="text-lg font-semibold text-gray-300 mb-2">Motor Henüz Kurulmamış</h4>
            <p className="text-sm text-gray-500 mb-4">
              ComfyUI Windows Portable motorunu indirip kurmak gerekiyor. Bu işlem ~1.5 GB veri indirecektir.
            </p>
            <button disabled className="px-6 py-3 bg-accent/30 text-accent/60 rounded-xl font-semibold cursor-not-allowed">
              Yakında: Otomatik Kurulum
            </button>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-3">Nasıl Çalışır?</h3>
        <div className="space-y-3 text-sm text-gray-400">
          <div className="flex gap-3">
            <span className="text-accent font-bold">1.</span>
            <span>ComfyUI motoru <code className="text-gray-300">C:\AI\ComfyUI_windows_portable</code> klasörüne kurulur.</span>
          </div>
          <div className="flex gap-3">
            <span className="text-accent font-bold">2.</span>
            <span>"Motoru Başlat" butonuna bastığınızda, motor arka planda sessizce açılır.</span>
          </div>
          <div className="flex gap-3">
            <span className="text-accent font-bold">3.</span>
            <span><code className="text-gray-300">C:\AI\models</code> içindeki modeller otomatik olarak kullanılır.</span>
          </div>
          <div className="flex gap-3">
            <span className="text-accent font-bold">4.</span>
            <span>Studio sayfasından "Generate" tuşuna basınca motor devreye girer.</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'membership':
        return renderMembershipTab();
      case 'settings':
        return renderSettingsTab();
      case 'history':
        return renderHistoryTab();
      case 'engine':
        return renderEngineTab();
      default:
        return renderProfileTab();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-accent to-goldB bg-clip-text text-transparent mb-2">
            {t('profile.title')}
          </h1>
          <p className="text-gray-400">{t('profile.subtitle')}</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${activeTab === tab.id
                ? 'bg-accent/20 border border-accent/50 text-accent'
                : 'bg-zinc-800/50 border border-zinc-700/50 text-gray-400 hover:text-gray-200 hover:border-accent/30'
                }`}
            >
              {getTabIcon(tab.icon)}
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {renderTabContent()}
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
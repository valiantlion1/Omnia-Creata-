import React from 'react';
import { useTranslation } from 'react-i18next';

type Props = { onEnter: () => void };

const Landing: React.FC<Props> = ({ onEnter }) => {
  const { t } = useTranslation();
  return (
    <div className="relative min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      {/* Subtle CSS glow instead of heavy canvas FX */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[rgba(var(--accent),0.08)] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[rgba(var(--goldB),0.06)] rounded-full blur-[120px]" />
      </div>
      <div className="relative z-10">
        <header className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/omnia-crest.png" alt="Omnia Creata" className="h-9 w-9 object-contain" />
            <div className="flex flex-col">
              <span className="text-xl font-semibold signature-gold">Omnia Creata</span>
              <span className="text-[11px] text-zinc-400">AI Creative Studio</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-outline" onClick={onEnter}>{t('landing.header.enterStudio')}</button>
          </div>
        </header>

        <main className="container mx-auto px-4 pt-16 pb-20">
          <section className="text-center max-w-4xl mx-auto">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-purple-600/20 blur-3xl -z-10"></div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent leading-tight">
                {t('landing.hero.title')}
                <br />
                <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">{t('landing.hero.titleHighlight')}</span>
              </h1>
            </div>
            <p className="mt-6 text-zinc-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              {t('landing.hero.description')}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                onClick={onEnter}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {t('landing.hero.enterStudio')}
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
              </button>
              <a
                className="px-8 py-4 border border-white/20 hover:border-white/40 text-white/80 hover:text-white font-medium rounded-xl transition-all duration-300 hover:bg-white/5"
                href="#features"
              >
                {t('landing.hero.exploreFeatures')}
              </a>
            </div>
          </section>

          {/* Showcase Gallery Section */}
          <section className="mt-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4">
                {t('landing.showcase.title')}
              </h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                {t('landing.showcase.description')}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { img: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=400&h=400&fit=crop', title: t('landing.showcase.images.cyberpunkWarrior'), user: '@alexart', likes: 234 },
                { img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop', title: t('landing.showcase.images.mysticalForest'), user: '@dreamscape', likes: 189 },
                { img: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=400&fit=crop', title: t('landing.showcase.images.neonDreams'), user: '@modernist', likes: 156 },
                { img: 'https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=400&h=400&fit=crop', title: t('landing.showcase.images.ancientTemple'), user: '@otakuart', likes: 298 }
              ].map((item, i) => (
                <div key={i} className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105">
                  <div className="aspect-square overflow-hidden">
                    <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <h4 className="font-semibold text-sm">{item.title}</h4>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-300">{item.user}</span>
                      <span className="text-xs flex items-center gap-1">
                        <svg className="w-3 h-3 fill-red-500" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        {item.likes}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center">
              <button className="px-6 py-3 border border-white/20 hover:border-white/40 text-white/80 hover:text-white font-medium rounded-xl transition-all duration-300 hover:bg-white/5">
                {t('landing.showcase.viewAll')}
              </button>
            </div>
          </section>

          {/* Templates Section */}
          <section className="mt-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4">
                {t('landing.templates.title')}
              </h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                {t('landing.templates.description')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: t('landing.templates.items.animePortrait.name'), desc: t('landing.templates.items.animePortrait.desc'), category: t('landing.templates.categories.character'), color: 'from-pink-500/20 to-purple-500/20' },
                { name: t('landing.templates.items.cyberpunkCity.name'), desc: t('landing.templates.items.cyberpunkCity.desc'), category: t('landing.templates.categories.landscape'), color: 'from-cyan-500/20 to-blue-500/20' },
                { name: t('landing.templates.items.fantasyArt.name'), desc: t('landing.templates.items.fantasyArt.desc'), category: t('landing.templates.categories.fantasy'), color: 'from-green-500/20 to-emerald-500/20' },
                { name: t('landing.templates.items.realisticPhoto.name'), desc: t('landing.templates.items.realisticPhoto.desc'), category: t('landing.templates.categories.photo'), color: 'from-orange-500/20 to-red-500/20' },
                { name: t('landing.templates.items.abstractDesign.name'), desc: t('landing.templates.items.abstractDesign.desc'), category: t('landing.templates.categories.art'), color: 'from-violet-500/20 to-purple-500/20' },
                { name: t('landing.templates.items.logoBrand.name'), desc: t('landing.templates.items.logoBrand.desc'), category: t('landing.templates.categories.design'), color: 'from-yellow-500/20 to-orange-500/20' }
              ].map((template, i) => (
                <div key={i} className="group relative bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300 hover:scale-105">
                  <div className={`absolute inset-0 bg-gradient-to-br ${template.color} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs px-2 py-1 bg-white/10 rounded-full text-white/70">{template.category}</span>
                      <svg className="w-5 h-5 text-white/40 group-hover:text-white/70 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-white">{template.name}</h3>
                    <p className="text-zinc-300 text-sm leading-relaxed">{template.desc}</p>
                    <button className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors">
                      {t('landing.templates.useTemplate')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Features Section */}
          <section className="mt-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4">
                {t('landing.features.title')}
              </h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                {t('landing.features.description')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[{
                title: t('landing.features.items.compactControls.title'),
                desc: t('landing.features.items.compactControls.desc'),
                icon: '⚡',
                gradient: 'from-yellow-500/20 to-orange-500/20'
              }, {
                title: t('landing.features.items.instantPreview.title'),
                desc: t('landing.features.items.instantPreview.desc'),
                icon: '👁️',
                gradient: 'from-blue-500/20 to-purple-500/20'
              }, {
                title: t('landing.features.items.modernInterface.title'),
                desc: t('landing.features.items.modernInterface.desc'),
                icon: '✨',
                gradient: 'from-purple-500/20 to-pink-500/20'
              }].map((f, i) => (
                <div key={i} className="group relative bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all duration-300 hover:scale-105">
                  <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  <div className="relative z-10">
                    <div className="text-4xl mb-4">{f.icon}</div>
                    <h3 className="text-xl font-bold mb-3 text-white">{f.title}</h3>
                    <p className="text-zinc-300 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Community Reviews */}
          <section className="mt-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4">
                {t('landing.reviews.title')}
              </h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                {t('landing.reviews.description')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: t('landing.reviews.items.user1.name'), role: t('landing.reviews.items.user1.role'), comment: t('landing.reviews.items.user1.comment'), rating: 5, avatar: '👨‍🎨' },
                { name: t('landing.reviews.items.user2.name'), role: t('landing.reviews.items.user2.role'), comment: t('landing.reviews.items.user2.comment'), rating: 5, avatar: '👩‍💼' },
                { name: t('landing.reviews.items.user3.name'), role: t('landing.reviews.items.user3.role'), comment: t('landing.reviews.items.user3.comment'), rating: 5, avatar: '👨‍💻' }
              ].map((review, i) => (
                <div key={i} className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-2xl">{review.avatar}</div>
                    <div>
                      <h4 className="font-semibold text-white">{review.name}</h4>
                      <p className="text-xs text-zinc-400">{review.role}</p>
                    </div>
                  </div>
                  <div className="flex mb-3">
                    {[...Array(review.rating)].map((_, j) => (
                      <svg key={j} className="w-4 h-4 fill-yellow-400" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-zinc-300 text-sm leading-relaxed">"{review.comment}"</p>
                </div>
              ))}
            </div>
          </section>

          <section id="paketler" className="mt-14">
            <h2 className="section-title mb-4">{t('landing.pricing.title')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { name: t('landing.pricing.plans.eco.name'), price: t('landing.pricing.plans.eco.price'), points: [t('landing.pricing.plans.eco.features.0'), t('landing.pricing.plans.eco.features.1'), t('landing.pricing.plans.eco.features.2')] },
                { name: t('landing.pricing.plans.pro.name'), price: t('landing.pricing.plans.pro.price'), points: [t('landing.pricing.plans.pro.features.0'), t('landing.pricing.plans.pro.features.1'), t('landing.pricing.plans.pro.features.2')] },
                { name: t('landing.pricing.plans.studio.name'), price: t('landing.pricing.plans.studio.price'), points: [t('landing.pricing.plans.studio.features.0'), t('landing.pricing.plans.studio.features.1'), t('landing.pricing.plans.studio.features.2')] },
              ].map((p, idx) => (
                <div key={idx} className="card card-pad">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    <span className="pill">{p.price}</span>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-zinc-300">
                    {p.points.map((pt, i) => <li key={i}>• {pt}</li>)}
                  </ul>
                  <div className="mt-4 flex justify-end">
                    <button className="btn" onClick={onEnter}>{t('landing.pricing.selectPlan')}</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>

        <footer className="container mx-auto px-4 py-8 text-center text-xs text-zinc-500">
          © {new Date().getFullYear()} Omnia Creata — {t('landing.footer.tagline')}
        </footer>
      </div>
    </div>
  );
};

export default Landing;
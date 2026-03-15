import React from 'react';
import { useStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';

const Gallery: React.FC = () => {
  const { state } = useStore();
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<'all' | 'recent' | 'favorites'>('all');

  // Mock gallery data - in real app this would come from backend
  const galleryImages = React.useMemo(() => {
    const images = [];
    if (state.generatedImage?.url) {
      images.push({
        id: 'current',
        url: state.generatedImage.url,
        prompt: state.prompt || 'Generated image',
        createdAt: state.generatedImage.createdAt || Date.now(),
        isFavorite: false
      });
    }
    return images;
  }, [state.generatedImage, state.prompt]);

  const filteredImages = galleryImages.filter(img => {
    const matchesSearch = img.prompt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || 
      (filterType === 'favorites' && img.isFavorite) ||
      (filterType === 'recent' && Date.now() - img.createdAt < 24 * 60 * 60 * 1000);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-card backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Galeri</h2>
            <p className="text-white/60">Oluşturduğunuz görselleri keşfedin ve yönetin</p>
          </div>
          
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Görsellerde ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 bg-black/20 border border-white/20 rounded-lg px-4 py-2 pl-10 text-white placeholder-white/50 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
              />
              <svg className="absolute left-3 top-2.5 h-4 w-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="bg-black/20 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
            >
              <option value="all" className="bg-gray-800">Tümü</option>
              <option value="recent" className="bg-gray-800">Son 24 Saat</option>
              <option value="favorites" className="bg-gray-800">Favoriler</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="flex-1 overflow-auto">
        {filteredImages.length === 0 ? (
          <div className="bg-gradient-card backdrop-blur-sm rounded-xl p-12 border border-white/10 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Henüz görsel yok</h3>
            <p className="text-white/60 mb-4">İlk görselinizi oluşturmak için Generate sekmesine gidin</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filteredImages.map((image) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="bg-gradient-card backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden group cursor-pointer hover:border-purple-400/50 transition-all duration-200"
                  onClick={() => setSelectedImage(image.url)}
                >
                  <div className="aspect-square relative overflow-hidden">
                    <img
                      src={image.url}
                      alt={image.prompt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    
                    {/* Action buttons */}
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button className="p-2 bg-black/50 backdrop-blur-sm rounded-lg text-white hover:bg-black/70 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                      <button className="p-2 bg-black/50 backdrop-blur-sm rounded-lg text-white hover:bg-black/70 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <p className="text-white/80 text-sm line-clamp-2 mb-2">{image.prompt}</p>
                    <div className="flex items-center justify-between text-xs text-white/50">
                      <span>{new Date(image.createdAt).toLocaleDateString('tr-TR')}</span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {new Date(image.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-4xl max-h-full bg-gradient-card backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <img
                  src={selectedImage}
                  alt="Selected image"
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-sm rounded-lg text-white hover:bg-black/70 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Gallery;
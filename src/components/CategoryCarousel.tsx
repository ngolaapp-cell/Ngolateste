import React, { useState, useEffect, useRef } from 'react';
import { Category, Screen } from '../types';

interface CategoryCarouselProps {
  categories: Category[];
  isActivated?: boolean;
  onNavigate: (screen: Screen) => void;
  onSelectCategory?: (category: Category) => void;
  onStartExam: (categoryId?: string) => void;
}

export const CategoryCarousel: React.FC<CategoryCarouselProps> = ({
  categories,
  isActivated,
  onNavigate,
  onSelectCategory,
  onStartExam,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const total = categories.length;

  // Auto-play timer
  useEffect(() => {
    if (total <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, 5000);

    return () => clearInterval(interval);
  }, [total, isPaused]);

  if (!categories || categories.length === 0) {
    return null;
  }

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  const goToSlide = (idx: number) => {
    setCurrentIndex(idx);
  };

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      // Swipe left -> Next
      nextSlide();
    } else if (distance < -minSwipeDistance) {
      // Swipe right -> Prev
      prevSlide();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const currentCategory = categories[currentIndex];

  const handleCategoryClick = (cat: Category) => {
    if (onSelectCategory) {
      onSelectCategory(cat);
    } else {
      onNavigate('categories');
    }
  };

  const isCategoryFree = (cat: Category) => {
    const tag = (cat.statusTag || '').toUpperCase().trim();
    return tag === 'GRÁTIS' || tag === 'GRATIS' || tag === 'FREE';
  };

  const handleStartSimuladoFromSlide = (e: React.MouseEvent, cat: Category) => {
    e.stopPropagation();
    if (!isActivated && !isCategoryFree(cat)) {
      onNavigate('activation');
      return;
    }
    onStartExam(cat.id);
  };

  return (
    <div
      className="relative w-full mb-10 select-none group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main Carousel Banner Frame */}
      <div className="relative h-72 sm:h-80 md:h-96 w-full rounded-3xl overflow-hidden shadow-xl bg-slate-900 border border-slate-800">
        {categories.map((cat, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={cat.id || index}
              onClick={() => handleCategoryClick(cat)}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out cursor-pointer ${
                isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {/* Background Image with zoom animation */}
              <img
                src={cat.image}
                alt={cat.name}
                className={`w-full h-full object-cover transition-transform duration-1000 ${
                  isActive ? 'scale-105' : 'scale-100'
                }`}
              />

              {/* Gradient Overlays for High Contrast Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-slate-900/20" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/60 to-transparent" />

              {/* Content Overlay */}
              <div className="absolute inset-0 p-6 sm:p-8 md:p-10 flex flex-col justify-between text-white z-20">
                {/* Top Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-blue-600/90 backdrop-blur-md text-white text-[11px] font-extrabold uppercase px-3 py-1 rounded-full tracking-wider border border-blue-400/40 shadow-sm flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs">auto_awesome</span>
                    <span>Destaque / Nova Categoria</span>
                  </span>

                  {cat.statusTag && (
                    <span
                      className={`${
                        (cat.statusTag || '').toUpperCase() === 'GRÁTIS' || (cat.statusTag || '').toUpperCase() === 'GRATIS'
                          ? 'bg-emerald-600/95 border-emerald-300 text-white shadow-md'
                          : cat.statusTag === 'LIBERADO'
                          ? 'bg-emerald-500/90 border-emerald-400/50 text-white'
                          : 'bg-amber-500/90 border-amber-400/50 text-white'
                      } backdrop-blur-md text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border shadow-xs flex items-center gap-1`}
                    >
                      {((cat.statusTag || '').toUpperCase() === 'GRÁTIS' || (cat.statusTag || '').toUpperCase() === 'GRATIS') && (
                        <span className="material-symbols-outlined text-xs">savings</span>
                      )}
                      <span>{cat.statusTag}</span>
                    </span>
                  )}
                </div>

                {/* Bottom Main Content */}
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest mb-1.5">
                    <span className="material-symbols-outlined text-base">{cat.icon || 'school'}</span>
                    <span>Concurso Público</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-md mb-2">
                    {cat.name}
                  </h2>

                  <p className="text-slate-200 text-xs sm:text-sm md:text-base leading-relaxed line-clamp-2 sm:line-clamp-3 mb-5 max-w-xl text-shadow">
                    {cat.description}
                  </p>

                  {/* Call to Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => handleStartSimuladoFromSlide(e, cat)}
                      className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
                    >
                      <span>Iniciar Simulado</span>
                      <span className="material-symbols-outlined text-base">play_circle</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCategoryClick(cat);
                      }}
                      className="bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md text-white border border-white/40 font-bold px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>Ver Especializações</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Carousel Arrow Controls */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer"
              title="Anterior"
            >
              <span className="material-symbols-outlined text-xl">chevron_left</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer"
              title="Próximo"
            >
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>
          </>
        )}

        {/* Bottom Slide Indicators / Dots */}
        {total > 1 && (
          <div className="absolute bottom-4 right-6 z-30 flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            {categories.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(idx);
                }}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  idx === currentIndex
                    ? 'w-6 h-2 bg-blue-500'
                    : 'w-2 h-2 bg-white/50 hover:bg-white'
                }`}
                title={`Ir para categoria ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mini Thumbnails Strip below on larger screens for quick tab switching */}
      {total > 1 && (
        <div className="hidden sm:flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat, idx) => {
            const isSelected = idx === currentIndex;
            return (
              <button
                key={cat.id || idx}
                type="button"
                onClick={() => goToSlide(idx)}
                className={`flex-1 min-w-[120px] py-2 px-3 rounded-2xl flex items-center gap-2 transition-all cursor-pointer border text-left ${
                  isSelected
                    ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <span className="material-symbols-outlined text-sm text-blue-600 shrink-0">
                  {cat.icon || 'folder'}
                </span>
                <span className="text-xs font-bold truncate">{cat.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

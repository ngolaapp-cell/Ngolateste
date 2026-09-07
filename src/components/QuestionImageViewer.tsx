import React, { useState } from 'react';

interface QuestionImageViewerProps {
  imageUrl: string;
  altText?: string;
  className?: string;
}

export const QuestionImageViewer: React.FC<QuestionImageViewerProps> = ({
  imageUrl,
  altText = 'Imagem de apoio da questão',
  className = '',
}) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (!imageUrl) return null;

  return (
    <>
      <div className={`relative my-4 group ${className}`}>
        {/* Container with soft border and background */}
        <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-slate-200/80 bg-slate-50/70 p-2 md:p-3 shadow-xs hover:border-blue-300 transition-all">
          {/* Badge */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full border border-slate-200/70 shadow-xs text-[11px] font-bold text-slate-700">
            <span className="material-symbols-outlined text-sm text-blue-600">image</span>
            <span>Imagem de Análise</span>
          </div>

          {/* Quick Zoom Button in corner */}
          <button
            type="button"
            onClick={() => setIsZoomed(true)}
            className="absolute top-4 right-4 z-10 p-2 bg-white/95 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-full border border-slate-200/80 shadow-sm cursor-pointer transition-all active:scale-95 flex items-center gap-1 text-xs font-bold"
            title="Ampliar Imagem"
            aria-label="Ampliar Imagem"
          >
            <span className="material-symbols-outlined text-base">zoom_in</span>
            <span className="hidden sm:inline pr-1">Ampliar</span>
          </button>

          {/* Loading Skeleton */}
          {isLoading && !hasError && (
            <div className="w-full h-48 sm:h-64 md:h-72 bg-slate-100 rounded-xl md:rounded-2xl animate-pulse flex flex-col items-center justify-center text-slate-400 gap-2">
              <span className="material-symbols-outlined text-3xl animate-spin">refresh</span>
              <span className="text-xs font-semibold">Carregando imagem do Supabase...</span>
            </div>
          )}

          {/* Error Fallback */}
          {hasError ? (
            <div className="w-full py-8 px-4 rounded-xl bg-amber-50 border border-amber-200 text-center text-amber-900 space-y-2">
              <span className="material-symbols-outlined text-3xl text-amber-600">broken_image</span>
              <p className="text-xs font-bold">Não foi possível carregar a imagem diretamente.</p>
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline font-bold"
              >
                <span>Visualizar link da imagem no Supabase</span>
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </a>
            </div>
          ) : (
            <div
              className="cursor-zoom-in relative rounded-xl md:rounded-2xl overflow-hidden flex items-center justify-center bg-white"
              onClick={() => setIsZoomed(true)}
            >
              <img
                src={imageUrl}
                alt={altText}
                loading="eager"
                referrerPolicy="no-referrer"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
                className={`max-h-72 sm:max-h-96 md:max-h-[420px] w-auto max-w-full object-contain rounded-xl transition-all duration-300 group-hover:scale-[1.01] ${
                  isLoading ? 'hidden' : 'block'
                }`}
              />
            </div>
          )}

          {/* Bottom helper text */}
          {!hasError && !isLoading && (
            <div className="pt-2 px-2 flex justify-between items-center text-[11px] text-slate-500 font-medium">
              <span>Toque na imagem para ampliar em tela cheia</span>
              <span className="hidden sm:inline">Alta Resolução</span>
            </div>
          )}
        </div>
      </div>

      {/* FULLSCREEN ZOOM MODAL */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn"
          onClick={() => setIsZoomed(false)}
        >
          <div
            className="relative max-w-5xl max-h-[95vh] w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 bg-slate-800/90 border-b border-slate-700 text-white">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">image</span>
                <span className="text-sm font-bold truncate max-w-xs sm:max-w-md">{altText}</span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl transition-colors text-xs flex items-center gap-1 font-semibold"
                  title="Abrir imagem em nova aba"
                >
                  <span className="material-symbols-outlined text-base">open_in_new</span>
                  <span className="hidden sm:inline">Nova Aba</span>
                </a>

                <button
                  type="button"
                  onClick={() => setIsZoomed(false)}
                  className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                  title="Fechar"
                  aria-label="Fechar"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>

            {/* Modal Image Body */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-slate-950/80">
              <img
                src={imageUrl}
                alt={altText}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-lg cursor-zoom-out"
                onClick={() => setIsZoomed(false)}
              />
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-800/90 border-t border-slate-700 text-center text-xs text-slate-400 font-medium">
              Toque fora da imagem ou clique no botão fechar para voltar ao teste.
            </div>
          </div>
        </div>
      )}
    </>
  );
};

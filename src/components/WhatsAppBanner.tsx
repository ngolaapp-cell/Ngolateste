import React from 'react';

interface WhatsAppBannerProps {
  price?: string;
  phone?: string;
}

export const WhatsAppBanner: React.FC<WhatsAppBannerProps> = ({
  price = '500kz',
  phone = '244923361877',
}) => {
  const whatsappUrl = `https://wa.me/${phone}?text=Ol%C3%A1!%20Gostaria%20de%20obter%20o%20material%20de%20estudo%20dos%20concursos%20por%20${price}`;

  return (
    <section className="mt-8 mb-6 p-6 bg-blue-50/80 rounded-2xl border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="bg-blue-100 p-3 rounded-full text-blue-600 shrink-0">
          <span className="material-symbols-outlined">library_books</span>
        </div>
        <p className="font-bold text-slate-900 leading-tight">
          Obter Tópicos ou material de estudo dos concursos por{' '}
          <span className="text-blue-600 font-extrabold">{price}</span>
        </p>
      </div>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white px-6 py-3 rounded-xl font-bold transition-transform active:scale-95 shrink-0 shadow-md cursor-pointer"
      >
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.631 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <span>WhatsApp</span>
      </a>
    </section>
  );
};

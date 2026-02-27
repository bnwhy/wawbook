import React, { useState, useEffect } from 'react';
import { Star, Wand2, BookOpen, Cloud, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocation } from 'wouter';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import BookCover3D from '../components/BookCover3D';
import { useBooks } from '../context/BooksContext';
import { formatPrice } from '../utils/formatPrice';


interface ProductPageProps {
  bookTitle: string;
}

const ProductPage: React.FC<ProductPageProps> = ({ bookTitle }) => {
  const [, setLocation] = useLocation();
  const { books } = useBooks();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const decodedTitle = decodeURIComponent(bookTitle);
  const book = books.find(b => b.name === decodedTitle);

  // Construire la liste d'images — galleryImages est prioritaire (coverImage est dépréciée)
  const images: { url: string; use3DEffect: boolean }[] = book
    ? book.galleryImages && book.galleryImages.length > 0
      ? book.galleryImages.filter(img => img.url)
      : book.coverImage
        ? [{ url: book.coverImage, use3DEffect: true }]
        : []
    : [];

  // Rediriger seulement si les livres sont chargés et le livre introuvable depuis un moment
  useEffect(() => {
    if (books.length === 0 || book) return;
    const timer = setTimeout(() => {
      if (books.length > 0 && !book) setLocation('/');
    }, 1500);
    return () => clearTimeout(timer);
  }, [books, book, setLocation]);

  // Initialiser la langue par défaut dès que le livre est chargé
  useEffect(() => {
    if (book?.features?.languages?.length && !selectedLanguage) {
      const first = book.features.languages[0];
      setSelectedLanguage(typeof first === 'string' ? first : first.code);
    }
  }, [book]); // Dépend uniquement de book, pas de selectedLanguage



  const handleCreate = () => {
    const p = new URLSearchParams();
    p.set('bookTitle', encodeURIComponent(decodedTitle));
    if (selectedLanguage) p.set('language', encodeURIComponent(selectedLanguage));
    setLocation(`/create?${p.toString()}`);
  };

  if (!book) {
    return (
      <div className="min-h-screen flex flex-col font-sans">
        <Navigation onStart={() => setLocation('/')} onLogoClick={() => setLocation('/')} />
        <div className="flex-1 flex items-center justify-center text-cloud-dark/50">Chargement...</div>
        <Footer />
      </div>
    );
  }

  const featureSections = book.productPage?.featureSections ?? [];
  const reviews = book.productPage?.reviews ?? [];
  const faqItems = [...(book.productPage?.faqItems ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen flex flex-col font-sans relative" style={{ backgroundColor: '#E0F2FE', backgroundImage: 'linear-gradient(180deg, #E0F2FE 0%, #F0F9FF 100%)' }}>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float 6s ease-in-out 3s infinite; }
        .book-main { overflow: visible; }
        .book-main::before {
          content: '';
          position: absolute;
          top: 10px; bottom: 10px;
          left: -8px; right: -8px;
          background: white;
          border-radius: 24px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06);
          z-index: -1;
        }
      `}</style>

      <Navigation onStart={() => setLocation('/')} onLogoClick={() => setLocation('/')} />

      {/* Watercolor texture overlay */}
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='watercolor'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.02' numOctaves='5' seed='2'/%3E%3CfeColorMatrix type='hueRotate' values='200'/%3E%3CfeColorMatrix type='saturate' values='0.3'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23watercolor)' opacity='0.5'/%3E%3C/svg%3E")`,
        backgroundSize: '400px 400px',
        mixBlendMode: 'overlay'
      }} />

      {/* Soft watercolor blobs */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-blue-200 rounded-full opacity-20 blur-3xl animate-float pointer-events-none" />
      <div className="absolute top-40 right-20 w-80 h-80 bg-sky-200 rounded-full opacity-15 blur-3xl animate-float-delayed pointer-events-none" />
      <div className="absolute bottom-32 left-1/4 w-72 h-72 bg-cyan-200 rounded-full opacity-20 blur-3xl animate-float pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-56 h-56 bg-blue-100 rounded-full opacity-25 blur-3xl animate-float-delayed pointer-events-none" />

      {/* Floating Clouds */}
      <div className="absolute top-32 left-10 text-white opacity-30 blur-sm animate-float pointer-events-none">
        <Cloud size={100} fill="currentColor" />
      </div>
      <div className="absolute top-52 right-20 text-white opacity-20 blur-sm animate-float-delayed pointer-events-none">
        <Cloud size={80} fill="currentColor" />
      </div>
      <div className="absolute bottom-20 left-1/4 text-white opacity-25 blur-sm animate-float pointer-events-none">
        <Cloud size={120} fill="currentColor" />
      </div>

      <main className="book-main relative z-10 flex-1 max-w-6xl mx-auto w-full px-4 md:px-8 pt-12 pb-16 bg-white rounded-3xl mt-24 mb-16 shadow-md border-t-8 border-t-sky-100">

        {/* ── PRODUCT HERO ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-20">

          {/* LEFT — Images */}
          <div className="flex gap-3 bg-gray-50 rounded-xl p-3">
            {/* Thumbnails verticales à gauche */}
            {images.length > 1 && (
              <div className="flex flex-col gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-[92px] h-[92px] rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 bg-white ${
                      i === selectedImage ? 'border-cloud-blue shadow-md' : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <img src={img.url} alt={`${book.name} ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Main image + arrows */}
            <div className="flex-1 flex flex-col">
              <div className="aspect-square flex items-center justify-center p-6">
                {images[selectedImage] ? (
                  images[selectedImage].use3DEffect ? (
                    <div className="w-[80%] h-[80%]">
                      <BookCover3D imageUrl={images[selectedImage].url} alt={book.name} />
                    </div>
                  ) : (
                    <img
                      src={images[selectedImage].url}
                      alt={book.name}
                      className="w-[80%] h-[80%] object-cover rounded-xl shadow-lg"
                    />
                  )
                ) : (
                  <BookOpen size={64} className="text-gray-300" />
                )}
              </div>
              {/* Navigation arrows en dessous */}
              {images.length > 1 && (
                <div className="flex items-center justify-center gap-3 pb-3">
                  <button
                    onClick={() => setSelectedImage((selectedImage - 1 + images.length) % images.length)}
                    className="w-8 h-8 rounded-full bg-white shadow border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <ChevronLeft size={16} className="text-gray-600" />
                  </button>
                  <div className="flex gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(i)}
                        className={`w-2 h-2 rounded-full transition-all ${i === selectedImage ? 'bg-cloud-blue' : 'bg-gray-300'}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setSelectedImage((selectedImage + 1) % images.length)}
                    className="w-8 h-8 rounded-full bg-white shadow border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <ChevronRight size={16} className="text-gray-600" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Info */}
          <div className="flex flex-col gap-5">
            {/* Badge */}
            {book.badgeText && (
              <span className="inline-flex items-center gap-1.5 self-start bg-accent-sun/10 text-accent-sun text-xs font-bold px-3 py-1 rounded-full">
                <Star size={12} className="fill-accent-sun" />
                {book.badgeText}
              </span>
            )}

            <h1 className="text-4xl font-display font-black text-cloud-dark leading-tight">{book.name}</h1>

            {/* Stars */}
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(i => <Star key={i} size={18} className="fill-yellow-400 text-yellow-400" />)}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              {book.oldPrice && (
                <span className="text-xl text-gray-400 line-through">{formatPrice(book.oldPrice)}</span>
              )}
              <span className="text-4xl font-black text-accent-melon">{formatPrice(book.price)}</span>
            </div>

            <p className="text-gray-600 leading-relaxed">{book.description}</p>

            {/* Language selector */}
            {book.features?.languages && book.features.languages.length > 0 && (
              <div>
                <label className="text-sm font-bold text-cloud-dark/70 mb-2 block">Langue du livre</label>
                <div className="relative">
                  <select
                    value={selectedLanguage || (book.features.languages[0] ? (typeof book.features.languages[0] === 'string' ? book.features.languages[0] : book.features.languages[0].code) : '')}
                    onChange={e => setSelectedLanguage(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-sm text-cloud-dark font-medium focus:outline-none focus:border-cloud-blue appearance-none cursor-pointer"
                  >
                    {book.features.languages.map((l: any) => {
                      const code = typeof l === 'string' ? l : l.code;
                      const label = typeof l === 'string' ? l : l.label;
                      return <option key={code} value={code}>{label}</option>;
                    })}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Other features */}
            {book.features && (book.features.customization?.length || book.features.pages || book.features.formats?.length) && (
              <div className="bg-white/60 rounded-2xl p-4 space-y-2 text-sm text-cloud-dark/80">
                {book.features.customization && book.features.customization.length > 0 && (
                  <div className="flex gap-2">
                    <span className="font-bold text-cloud-dark/60 w-36 shrink-0">Personnalisation :</span>
                    <span>{book.features.customization.join(', ')}</span>
                  </div>
                )}
                {book.features.pages && (
                  <div className="flex gap-2">
                    <span className="font-bold text-cloud-dark/60 w-36 shrink-0">Pages :</span>
                    <span>{book.features.pages}</span>
                  </div>
                )}
                {book.features.formats && book.features.formats.length > 0 && (
                  <div className="flex gap-2">
                    <span className="font-bold text-cloud-dark/60 w-36 shrink-0">Format :</span>
                    <span>{book.features.formats.join(', ')}</span>
                  </div>
                )}
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleCreate}
              className="mt-2 bg-[#0c4a6e] text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-cloud-blue transition-all shadow-lg flex items-center justify-center gap-3"
            >
              <Wand2 size={22} />
              Personnaliser ce livre
            </button>

          </div>
        </div>

        {/* ── FAQ ── */}
        {faqItems.length > 0 && (
          <section className="mb-16">
            <div className="max-w-2xl mx-auto space-y-3">
              {faqItems.map((item, i) => (
                <div key={i}>
                  {item.sectionTitle?.trim() && (
                    <h3 className="text-xs font-bold uppercase tracking-widest text-cloud-blue/70 mb-2 mt-4 px-1">{item.sectionTitle}</h3>
                  )}
                  <div className="bg-white/80 rounded-2xl border border-gray-100 overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between px-6 py-4 text-left font-semibold text-cloud-dark hover:bg-sky-50/50 transition-colors"
                    >
                      <span>{item.question}</span>
                      <svg
                        className={`w-5 h-5 text-gray-400 flex-shrink-0 ml-4 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {openFaq === i && (
                      <div className="px-6 pb-5 border-t border-gray-100 pt-4">
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{item.answer}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── FEATURE SECTIONS ── */}
        {featureSections.length > 0 && (
          <section className="mb-16 space-y-16">
            {featureSections.map((s, i) => (
              <div key={i} className={`flex flex-col ${s.reverse ? 'md:flex-row-reverse' : 'md:flex-row'} gap-10 items-center`}>
                <div className="w-full md:w-1/2">
                  <img
                    src={s.imageUrl}
                    alt={s.title}
                    className="w-full rounded-lg object-cover aspect-video shadow-md"
                  />
                </div>
                <div className="md:w-1/2 space-y-4">
                  <h3 className="font-display font-black text-2xl text-cloud-dark">{s.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{s.text}</p>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ── REVIEWS ── */}
        {reviews.length > 0 && (
          <section>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.map((r, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: r.rating ?? 5 }).map((_, j) => <Star key={j} size={16} className="fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="text-sm text-gray-600 mb-4 italic leading-relaxed">"{r.comment}"</p>
                  <p className="text-sm font-bold text-cloud-dark">{r.name}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ProductPage;

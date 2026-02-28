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
          <div className="flex gap-3">
            {/* Thumbnails verticales à gauche */}
            {images.length > 1 && (
              <div className="hidden md:flex flex-col gap-2 justify-center">
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
                    <div className="w-[92%] h-[92%]">
                      <BookCover3D imageUrl={images[selectedImage].url} alt={book.name} />
                    </div>
                  ) : (
                    <img
                      src={images[selectedImage].url}
                      alt={book.name}
                      className="w-[92%] h-[92%] object-cover rounded-xl shadow-lg"
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
          <div className="flex flex-col gap-3">
            {/* Badge */}
            {book.badgeText && (
              <span className="inline-flex items-center gap-1.5 self-start bg-accent-sun/10 text-accent-sun text-xs font-bold px-3 py-1 rounded-full">
                <Star size={12} className="fill-accent-sun" />
                {book.badgeText}
              </span>
            )}

            <h1 className="text-3xl md:text-4xl font-display font-black text-cloud-dark leading-tight">{book.name}</h1>

            {/* Stars */}
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(i => <Star key={i} size={18} className="fill-yellow-400 text-yellow-400" />)}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              {book.oldPrice && (
                <span className="text-base text-gray-400 line-through">{formatPrice(book.oldPrice)}</span>
              )}
              {book.features?.coverTypes && book.features.coverTypes.length > 0 ? (
                <span className="text-2xl font-black text-accent-melon">
                  {book.features.coverTypes.length > 1 ? 'À partir de ' : ''}
                  {formatPrice(Math.min(...book.features.coverTypes.map(c => c.price)))}
                </span>
              ) : (
                <span className="text-2xl font-black text-accent-melon">{formatPrice(book.price)}</span>
              )}
            </div>

            <p className="text-sm text-gray-600 leading-relaxed pb-3 border-b border-dashed border-gray-200">{book.description}</p>

            {/* Other features */}
            {book.features && (book.features.customization?.length || book.features.pages || book.features.coverTypes?.length || book.features.languages?.length) && (
              <div className="space-y-4 text-sm text-cloud-dark/80">
                {book.features.customization && book.features.customization.length > 0 && (
                  <div className="flex gap-2">
                    <span className="font-bold text-cloud-dark/80 w-36 shrink-0">Personnalisation :</span>
                    <span>{book.features.customization.join(', ')}</span>
                  </div>
                )}
                {book.features.pages && (
                  <div className="flex gap-2">
                    <span className="font-bold text-cloud-dark/80 w-36 shrink-0">Nombre de pages :</span>
                    <span>{book.features.pages}</span>
                  </div>
                )}
                {book.features.coverTypes && book.features.coverTypes.length > 0 && (
                  <div className="flex gap-2">
                    <span className="font-bold text-cloud-dark/80 w-36 shrink-0">Format :</span>
                    <span>{book.features.coverTypes.map(ct => ct.label).join(', ')}</span>
                  </div>
                )}
                {book.features.languages && book.features.languages.length > 0 && (
                  <div className="flex gap-2 items-center">
                    <span className="font-bold text-cloud-dark/80 w-40 shrink-0">Langue du livre :</span>
                    <div className="relative">
                      <select
                        value={selectedLanguage || (book.features.languages[0] ? (typeof book.features.languages[0] === 'string' ? book.features.languages[0] : book.features.languages[0].code) : '')}
                        onChange={e => setSelectedLanguage(e.target.value)}
                        className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 pr-8 text-sm text-cloud-dark font-medium focus:outline-none focus:border-cloud-blue appearance-none cursor-pointer"
                      >
                        {book.features.languages.map((l: any) => {
                          const code = typeof l === 'string' ? l : l.code;
                          const label = typeof l === 'string' ? l : l.label;
                          return <option key={code} value={code}>{label}</option>;
                        })}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleCreate}
              className="mt-3 bg-[#0c4a6e] text-white px-14 py-3.5 rounded-2xl font-bold text-base hover:bg-cloud-blue transition-all shadow-lg inline-flex items-center gap-3 self-center"
            >
              <Wand2 size={22} />
              Personnaliser ce livre
            </button>

            {/* ── FAQ inline (sous le CTA) ── */}
            {faqItems.length > 0 && (
              <div className="mt-8">
                {book.productPage?.faqTitle?.trim() && (
                  <h2 className="text-base font-bold text-cloud-dark mb-4">{book.productPage.faqTitle}</h2>
                )}
                <div className="divide-y divide-gray-300 border-b border-gray-300">
                  {faqItems.map((item, i) => (
                    <div key={i}>
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between py-4 text-left"
                      >
                        <span className="font-semibold text-slate-800 text-sm">{item.question}</span>
                        <svg
                          className={`w-4 h-4 flex-shrink-0 ml-4 transition-transform duration-200 text-teal-700 ${openFaq === i ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openFaq === i && (
                        <div className="pb-4">
                          <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">{item.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ── BADGES DE CONFIANCE ── */}
        <section className="mb-16">
          <div className="flex flex-col sm:flex-row gap-8 justify-center">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-cloud-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">Paiement sécurisé</p>
                <p className="text-xs text-gray-500 mt-0.5">Transactions protégées SSL</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-cloud-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">Livraison soignée</p>
                <p className="text-xs text-gray-500 mt-0.5">Emballage protecteur garanti</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-cloud-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">Satisfait ou remboursé</p>
                <p className="text-xs text-gray-500 mt-0.5">14 jours pour changer d'avis</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── AVIS MIS EN AVANT ── */}
        {book.productPage?.featuredReview?.text && (
          <section className="mb-16">
            <div className="bg-sky-50 rounded-[3rem] p-10 md:p-14 relative overflow-hidden">
              {/* Déco */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-cloud-blue/10 rounded-full -mr-20 -mt-20 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-accent-melon/10 rounded-full -ml-10 -mb-10 pointer-events-none" />

              <div className="relative z-10 flex justify-center">
                <div className="bg-white rounded-[2rem] p-8 shadow-cloud border-4 border-cloud-lightest max-w-lg w-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-accent-melon rounded-full flex-shrink-0" />
                    <div>
                      <div className="font-bold text-cloud-dark">{book.productPage.featuredReview.author}</div>
                      <div className="flex text-accent-sun">
                        {[1,2,3,4,5].map(i => <Star key={i} size={16} fill="currentColor" />)}
                      </div>
                    </div>
                  </div>
                  <p className="text-lg text-cloud-dark/70 italic font-medium">"{book.productPage.featuredReview.text}"</p>
                </div>
              </div>
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
                  <h3 className="font-display font-black text-xl text-cloud-dark">{s.title}</h3>
                  <div className="text-gray-600 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: s.text }} />
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ── REVIEWS ── */}
        {reviews.length > 0 && (
          <section>
            <h2 className="text-xl font-display font-black text-cloud-dark text-center mb-6">Recommandé par nos clients</h2>
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

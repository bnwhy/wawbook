import React from 'react';
import { BookOpen, Star } from 'lucide-react';
import { BookProduct } from '../types/admin';
import { formatPrice, getMinCoverPrice } from '../utils/formatPrice';
import BookCover3D from './BookCover3D';

interface BookCardProps {
  book: BookProduct;
  onClick: () => void;
}

const BookCard: React.FC<BookCardProps> = ({ book, onClick }) => {
  return (
    <div 
      className="group flex flex-col bg-white rounded-3xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 h-full cursor-pointer hover:-translate-y-1"
      onClick={onClick}
    >
      <div className="aspect-square relative overflow-visible flex items-center justify-center p-2" style={{ background: book.thumbnailBackground || 'linear-gradient(135deg, #fef1f7 0%, #faf5ff 100%)' }}>
        {book.coverImage ? (
          <div className="w-[90%] h-[90%]">
            <BookCover3D 
              imageUrl={book.coverImage} 
              alt={book.name}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
            <BookOpen size={48} className="text-gray-300" />
          </div>
        )}
        
        {book.badgeText && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-cloud-dark shadow-sm flex items-center gap-1 z-10">
            <Star size={12} className="text-accent-sun fill-current" />
            {book.badgeText}
          </div>
        )}
      </div>
      
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-2xl font-display font-black text-cloud-dark leading-tight mb-3">
          {book.name}
        </h3>
        <p className="text-cloud-dark/80 text-sm font-medium mb-4 leading-relaxed line-clamp-2 flex-1">
          {book.description}
        </p>
        
        <div className="mt-auto pt-4 border-t border-gray-50 w-full">
          <button className="w-full bg-cloud-deep text-white px-4 py-3 rounded-xl font-bold hover:bg-cloud-blue transition-all shadow-lg group-hover:shadow-cloud-hover flex flex-col items-center justify-center gap-0.5">
            <span className="text-base">Personnaliser</span>
            <span className="text-sm font-medium text-white whitespace-nowrap">
              {(() => { const { price, hasMultiple } = getMinCoverPrice(book); return (hasMultiple ? 'Dès ' : '') + formatPrice(price); })()}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookCard;

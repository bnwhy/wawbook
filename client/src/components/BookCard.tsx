import React from 'react';
import { BookOpen, Star } from 'lucide-react';
import { BookProduct } from '../types/admin';
import { formatPrice } from '../utils/formatPrice';

interface BookCardProps {
  book: BookProduct;
  onClick: () => void;
}

const BookCard: React.FC<BookCardProps> = ({ book, onClick }) => {
  return (
    <div 
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group cursor-pointer hover:-translate-y-1 border border-gray-100 flex flex-col h-full"
      onClick={onClick}
    >
      <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
        {book.coverImage ? (
          <img 
            src={book.coverImage} 
            alt={book.name} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 flex items-center justify-center text-slate-300">
              <BookOpen size={48} className="opacity-50" />
            </div>
          </>
        )}
        
        {book.badgeText && (
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-2 py-1 rounded-full text-xs font-bold text-brand-coral shadow-sm flex items-center gap-1">
            <Star size={10} fill="currentColor" />
            {book.badgeText}
          </div>
        )}
      </div>
      
      <div className="p-6 flex flex-col flex-1">
        <h3 className="font-display font-black text-xl text-slate-800 mb-2 group-hover:text-brand-coral transition-colors">
          {book.name}
        </h3>
        <p className="text-slate-500 text-sm mb-4 line-clamp-2 flex-1">
          {book.description}
        </p>
        
        <div className="mt-4 pt-4 border-t border-gray-100">
          <span className="font-black text-accent-melon text-xl">{formatPrice(book.price)}</span>
        </div>
      </div>
    </div>
  );
};

export default BookCard;

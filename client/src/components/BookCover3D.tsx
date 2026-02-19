import React from 'react';

interface BookCover3DProps {
  imageUrl: string;
  alt: string;
  className?: string;
}

/**
 * BookCover3D - Composant qui ajoute un effet 3D aux miniatures de livres
 * 
 * Utilise les classes CSS book-cover-* définies dans index.css
 */
const BookCover3D: React.FC<BookCover3DProps> = ({ imageUrl, alt, className = '' }) => {
  return (
    <div className={`book-cover-container ${className}`}>
      <div className="book-cover-wrapper">
        <img 
          src={imageUrl} 
          alt={alt}
          className="book-cover-image"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export default BookCover3D;

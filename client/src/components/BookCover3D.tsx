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
  // #region agent log
  React.useEffect(() => {
    fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BookCover3D.tsx:13',message:'BookCover3D rendered',data:{imageUrl,alt,className},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
  }, [imageUrl, alt, className]);
  // #endregion
  
  return (
    <div className={`book-cover-container ${className}`}>
      <div className="book-cover-wrapper">
        <img 
          src={imageUrl} 
          alt={alt}
          className="book-cover-image"
          loading="lazy"
          // #region agent log
          onLoad={() => {
            fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BookCover3D.tsx:27',message:'Image loaded',data:{imageUrl,alt},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
          }}
          // #endregion
        />
      </div>
    </div>
  );
};

export default BookCover3D;

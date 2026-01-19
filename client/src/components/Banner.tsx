import React from 'react';

const Banner: React.FC = () => {
  return (
    <div className="w-full pt-[72px]">
      <div className="w-full bg-white">
        <img 
          src="/banner-kids.png" 
          alt="Livres personnalisés pour enfants" 
          className="w-full h-auto object-contain"
        />
      </div>
    </div>
  );
};

export default Banner;

import React from 'react';

const Banner: React.FC = () => {
  return (
    <div className="w-full pt-[72px]">
      <div className="w-full bg-white overflow-hidden">
        <img 
          src="/banner-kids.png" 
          alt="Livres personnalisés pour enfants" 
          className="w-full h-auto max-h-[300px] object-cover"
        />
      </div>
    </div>
  );
};

export default Banner;

import React from 'react';
import { useHomepage } from '../context/HomepageContext';

const AnnouncementBanner: React.FC = () => {
  const { homepageConfig } = useHomepage();
  const isHome = typeof window !== 'undefined' && window.location.pathname === '/';

  const banner = homepageConfig?.banner;

  if (!banner?.isVisible || !banner?.text || !isHome) return null;

  return (
    <>
      <div
        className="fixed top-0 left-0 right-0 z-40 w-full"
        style={{ backgroundColor: banner.backgroundColor, color: banner.textColor }}
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center text-base font-medium">
          <span className="text-center">{banner.text}</span>
        </div>
      </div>
      {/* Spacer pour compenser la bannière fixed */}
      <div className="h-[40px] w-full" />
    </>
  );
};

export default AnnouncementBanner;

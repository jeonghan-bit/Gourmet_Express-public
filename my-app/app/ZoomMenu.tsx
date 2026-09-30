'use client';

import React, { useState } from 'react';
import Image, { StaticImageData } from 'next/image';

interface ZoomedImageProps {
  src: string | StaticImageData;
  alt: string;
  onClose: () => void;
}

const ZoomedImage: React.FC<ZoomedImageProps> = ({ src, alt, onClose }) => (
  <div 
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    onClick={onClose}
  >
    <div className="max-w-4xl max-h-full p-4">
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={800}
        className="max-w-full max-h-full object-contain"
      />
    </div>
  </div>
);

interface ZoomMenuProps {
  menu1: string | StaticImageData;
  menu2: string | StaticImageData;
}

const ZoomMenu: React.FC<ZoomMenuProps> = ({ menu1, menu2 }) => {
  const [zoomedImage, setZoomedImage] = useState<string | StaticImageData | null>(null);

  const handleImageClick = (imageSrc: string | StaticImageData) => {
    setZoomedImage(imageSrc);
  };

  const handleCloseZoom = () => {
    setZoomedImage(null);
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div 
          className="rounded-lg overflow-hidden shadow-sm cursor-pointer"
          onClick={() => handleImageClick(menu1)}
        >
          <Image
            src={menu1}
            alt="Menu Page 1"
            width={300}
            height={200}
            className="w-full h-40 object-cover"
          />
        </div>
        <div 
          className="rounded-lg overflow-hidden shadow-sm cursor-pointer"
          onClick={() => handleImageClick(menu2)}
        >
          <Image
            src={menu2}
            alt="Menu Page 2"
            width={300}
            height={200}
            className="w-full h-40 object-cover"
          />
        </div>
      </div>
      {zoomedImage && (
        <ZoomedImage
          src={zoomedImage}
          alt="Zoomed Menu"
          onClose={handleCloseZoom}
        />
      )}
    </>
  );
};

export default ZoomMenu;
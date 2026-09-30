import React from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface LoadingAnimationProps {
  className?: string;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ className }) => {
  return (
    <div className={`flex items-center justify-center ${className || ""}`}>
      <DotLottieReact
        src="https://lottie.host/1855a346-c0fd-4f69-b644-a5a04ce09335/1CjpIaM4xE.lottie"
        loop
        autoplay
        className="w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 xl:w-48 xl:h-48"
      />
    </div>
  );
};

export default LoadingAnimation;

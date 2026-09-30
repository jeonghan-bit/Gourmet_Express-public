"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="flex flex-col md:flex-row items-center gap-12 w-full max-w-5xl">
        {/* SVG Illustration */}
        <div className="flex-1 flex justify-center">
          <svg
            width="350"
            height="350"
            viewBox="0 0 350 350"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="max-w-xs md:max-w-md"
          >
            {/* Yeti body */}
            <ellipse cx="175" cy="300" rx="120" ry="30" fill="#E6ECF7" />
            <path
              d="M80 270 Q60 180 120 120 Q140 80 175 100 Q210 80 230 120 Q290 180 270 270 Z"
              fill="#BFD7ED"
            />
            {/* Head */}
            <ellipse cx="175" cy="110" rx="60" ry="60" fill="#BFD7ED" />
            {/* Face */}
            <ellipse cx="175" cy="120" rx="40" ry="35" fill="#E6ECF7" />
            {/* Horns */}
            <path
              d="M120 60 Q100 30 130 40 Q120 30 140 20 Q130 40 150 50"
              stroke="#BFD7ED"
              strokeWidth="6"
              fill="none"
            />
            <path
              d="M230 60 Q250 30 220 40 Q230 30 210 20 Q220 40 200 50"
              stroke="#BFD7ED"
              strokeWidth="6"
              fill="none"
            />
            {/* Eyes (sad) */}
            <ellipse cx="160" cy="120" rx="6" ry="8" fill="#6B7280" />
            <ellipse cx="190" cy="120" rx="6" ry="8" fill="#6B7280" />
            {/* Sad mouth */}
            <path
              d="M165 145 Q175 135 185 145"
              stroke="#6B7280"
              strokeWidth="3"
              fill="none"
            />
            {/* Phone (dropped) */}
            <rect
              x="155"
              y="170"
              width="40"
              height="60"
              rx="8"
              fill="#22223B"
              transform="rotate(10 175 200)"
            />
            <rect x="170" y="220" width="10" height="5" rx="2" fill="#fff" />
            {/* Error bubble */}
            <rect
              x="120"
              y="60"
              width="110"
              height="36"
              rx="18"
              fill="#FDE68A"
            />
            <text
              x="175"
              y="85"
              textAnchor="middle"
              fontSize="20"
              fill="#B45309"
              fontWeight="bold"
            >
              ERROR
            </text>
          </svg>
        </div>
        {/* Text and Button */}
        <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
          <h1 className="text-5xl font-extrabold text-yellow-700 mb-2 tracking-tight">
            Something went wrong!
          </h1>
          <p className="text-xl text-yellow-600 mb-6">
            {error.message || "An unexpected error has occurred."}
          </p>
          <button
            onClick={() => reset()}
            className="bg-yellow-600 hover:bg-yellow-700 text-white text-lg font-semibold px-8 py-3 rounded-full transition"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import type React from "react";

import { useState, useRef } from "react";
import { Check } from "lucide-react";

interface SwipeToConfirmProps {
  onConfirm: () => void;
  disabled?: boolean;
}

export function SwipeToConfirm({
  onConfirm,
  disabled = false,
}: SwipeToConfirmProps) {
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleStart = (clientX: number) => {
    if (disabled) return;
    setIsDragging(true);
    setStartX(clientX);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || disabled) return;

    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    const sliderWidth = 60; // Width of the slider button
    const maxDistance = containerWidth - sliderWidth;

    const diff = clientX - startX;
    const progress = Math.min(Math.max(diff / maxDistance, 0), 1);
    setSwipeProgress(progress);
  };

  const handleEnd = () => {
    if (!isDragging || disabled) return;

    setIsDragging(false);
    if (swipeProgress > 0.8) {
      setSwipeProgress(1);
      setTimeout(() => {
        onConfirm();
      }, 200);
    } else {
      setSwipeProgress(0);
    }
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Mouse events for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  const sliderPosition =
    swipeProgress * (containerRef.current?.offsetWidth || 0 - 60 || 0);

  return (
    <div
      ref={containerRef}
      className={`relative h-16 bg-gray-100 rounded-lg overflow-hidden select-none ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
      onMouseMove={isDragging ? handleMouseMove : undefined}
      onMouseUp={isDragging ? handleMouseUp : undefined}
      onMouseLeave={isDragging ? handleMouseUp : undefined}
    >
      {/* Background text */}
      <div
        className="absolute inset-0 flex items-center justify-center text-gray-500 font-medium transition-opacity duration-200"
        style={{ opacity: Math.max(0.3, 1 - swipeProgress * 2) }}
      >
        {swipeProgress > 0.8
          ? "Release to confirm"
          : "Swipe right to confirm order"}
      </div>

      {/* Progress background */}
      <div
        className="absolute inset-0 bg-green-500 transition-all duration-200"
        style={{
          width: `${swipeProgress * 100}%`,
          opacity: 0.2,
        }}
      />

      {/* Slider button */}
      <div
        ref={sliderRef}
        className={`absolute top-2 left-2 w-12 h-12 bg-white rounded-lg shadow-lg flex items-center justify-center transition-all duration-200 ${
          swipeProgress > 0.8 ? "bg-green-500" : "bg-white"
        } ${disabled ? "" : "cursor-grab active:cursor-grabbing"}`}
        style={{
          transform: `translateX(${sliderPosition}px)`,
          transition: isDragging
            ? "none"
            : "transform 0.3s ease-out, background-color 0.2s",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <Check
          className={`w-6 h-6 transition-colors duration-200 ${
            swipeProgress > 0.8 ? "text-white" : "text-gray-400"
          }`}
        />
      </div>

      {/* Invisible overlay for better touch handling */}
      <div
        className="absolute inset-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}

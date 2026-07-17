"use client";

import { useEffect, useRef } from "react";

export default function BackgroundVideo({
  src,
}: {
  src: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.defaultMuted = true;
    video.muted = true;

    const playVideo = async () => {
      try {
        await video.play();
        console.log("✅ Video started");
      } catch (err) {
        console.error("❌ Autoplay failed", err);
      }
    };

    playVideo();
  }, []);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={src} type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/30" />
    </>
  );
}
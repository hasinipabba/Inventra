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
      } catch {
        // Autoplay can be blocked by the browser; the video simply stays paused.
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
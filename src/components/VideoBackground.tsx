// Fixed, full-page cloud video background. Sits behind all page content via -z-10.
// Used across the main app pages (Home, My Events, Search, Community, Profile) for a
// consistent look. To swap the video or poster later, only this file needs to change.
import { useEffect, useRef, useState } from "react";

const VideoBackground = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Stays false until the video has actually started rendering frames. While
  // false, the poster <img> below sits visually on top of the <video> and
  // masks it completely — including iOS's native "tap to play" overlay,
  // which renders on top of the video itself whenever autoplay hasn't
  // kicked in yet (slow network, cold app launch, etc). That overlay was
  // showing through before because nothing was actually covering the video
  // element during that loading window.
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        src="/CloudBackground.mp4"
        poster="/CloudBackgroundPoster.jpg"
        preload="auto"
        autoPlay
        loop
        muted
        playsInline
        onPlaying={() => setIsPlaying(true)}
      />
      <img
        src="/CloudBackgroundPoster.jpg"
        alt=""
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
          isPlaying ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      />
    </div>
  );
};

export default VideoBackground;

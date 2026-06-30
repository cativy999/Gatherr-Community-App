// Fixed, full-page cloud video background. Sits behind all page content via -z-10.
// Used across the main app pages (Home, My Events, Search, Community, Profile) for a
// consistent look. To swap the video or poster later, only this file needs to change.
import { useEffect, useRef } from "react";

const VideoBackground = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // React doesn't always reflect the `muted` JSX attribute onto the actual
  // DOM property in time for autoplay to kick in on first paint — when that
  // happens, mobile WebKit briefly shows its native "tap to play" overlay
  // (the gray circle + play triangle) before falling back to the poster.
  // Setting `muted` and calling `.play()` explicitly here closes that gap.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
  }, []);

  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: "url('/CloudBackgroundPoster.jpg')" }}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        src="/CloudBackground.mp4"
        poster="/CloudBackgroundPoster.jpg"
        autoPlay
        loop
        muted
        playsInline
      />
    </div>
  );
};

export default VideoBackground;

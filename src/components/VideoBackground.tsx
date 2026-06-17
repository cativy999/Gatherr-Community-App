// Fixed, full-page cloud video background. Sits behind all page content via -z-10.
// Used across the main app pages (Home, My Events, Search, Community, Profile) for a
// consistent look. To swap the video or poster later, only this file needs to change.
const VideoBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden bg-black">
    <video
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

export default VideoBackground;

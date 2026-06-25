import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, ImagePlus } from "lucide-react";
import { toast } from "sonner";

const OOTDHome = () => {
  const navigate = useNavigate();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // TODO: hand off to the photo-review step once it's built.
    toast.success("Photo selected! Next step coming soon ✨");
    e.target.value = "";
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="w-full max-w-[480px] mx-auto px-5 pt-6">
        <button
          onClick={() => navigate("/wards")}
          className="inline-flex items-center justify-center -ml-1 p-1"
          aria-label="Back"
        >
          <ArrowLeft size={22} color="#000" />
        </button>
      </div>

      {/* Carousel collage — opposite-direction marquees, full photos (no cropped heads) */}
      <style>{`
        @keyframes ootdMarqueeLeft {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes ootdMarqueeRight {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
      `}</style>
      <div className="w-full max-w-[480px] mx-auto mt-2 select-none pointer-events-none">
        <div className="overflow-hidden h-[120px] sm:h-36 md:h-40">
          <div
            className="flex items-center h-full"
            style={{ width: "max-content", animation: "ootdMarqueeLeft 24s linear infinite" }}
          >
            <img src="/OOTD/Girls Carosal.png" alt="" draggable={false} className="h-full w-auto object-contain flex-shrink-0" />
            <img src="/OOTD/Girls Carosal.png" alt="" draggable={false} className="h-full w-auto object-contain flex-shrink-0" aria-hidden="true" />
          </div>
        </div>
        <div className="overflow-hidden h-[120px] sm:h-36 md:h-40 mt-[18px]">
          <div
            className="flex items-center h-full"
            style={{ width: "max-content", animation: "ootdMarqueeRight 24s linear infinite" }}
          >
            <img src="/OOTD/Guys Carosal.png.png" alt="" draggable={false} className="h-full w-auto object-contain flex-shrink-0" />
            <img src="/OOTD/Guys Carosal.png.png" alt="" draggable={false} className="h-full w-auto object-contain flex-shrink-0" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Message + actions */}
      <div className="w-full max-w-[480px] mx-auto px-8 mt-8 flex flex-col items-center text-center">
        <p
          className="text-sm leading-6 text-black max-w-[280px]"
          style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
        >
          Share your{" "}
          <span className="font-semibold" style={{ color: "#4f85ad" }}>
            Sunday best
          </span>
          —your church outfit, favorite accessories, and where each piece is from.
        </p>

        <div className="relative mt-8 flex flex-col items-center gap-[11px] w-48">
          {/* Decorative arrow scribble pointing at the buttons */}
          <img
            src="/OOTD/Arrow.png"
            alt=""
            draggable={false}
            className="absolute -left-14 sm:-left-16 top-0 w-16 sm:w-20 opacity-90 pointer-events-none select-none"
          />
          {/* Decorative star */}
          <img
            src="/OOTD/Starbutton.png"
            alt=""
            draggable={false}
            className="absolute -right-12 -top-5 w-14 h-14 sm:w-16 sm:h-16 rotate-[13deg] pointer-events-none select-none"
          />

          <button
            onClick={() => cameraInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white"
            style={{ background: "#0F172A", fontFamily: "'Hanken Grotesk', sans-serif" }}
          >
            <Camera size={16} />
            Take A OOTD
          </button>

          <span className="text-sm text-black" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            or
          </span>

          <button
            onClick={() => libraryInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"
            style={{ background: "#fff", borderColor: "#E2E8F0", color: "#0F172A", fontFamily: "'Hanken Grotesk', sans-serif" }}
          >
            <ImagePlus size={16} />
            Upload from Library
          </button>
        </div>
      </div>

      {/* Bottom corner flourishes, pinned to the bottom of the screen */}
      <div className="mt-auto w-full max-w-[480px] mx-auto px-5 pb-6 flex items-end justify-between select-none pointer-events-none">
        <img src="/OOTD/Today's Outfit.png" alt="" draggable={false} className="w-28 sm:w-32" />
        <img src="/OOTD/Shopping basket.png" alt="" draggable={false} className="w-20 sm:w-24 -mb-1 rotate-[15deg]" />
      </div>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
};

export default OOTDHome;

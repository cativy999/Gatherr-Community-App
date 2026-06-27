import { useNavigate } from "react-router-dom";

interface OOTDCardProps {
  /** Use the taller-card artwork — pass true when this card sits next to the
   * Step Challenge card in its "joined" (taller) state. */
  tall?: boolean;
}

const OOTDCard = ({ tall = false }: OOTDCardProps = {}) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate("/ootd")}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/ootd"); }}
      className="relative w-full h-full min-h-[124px] overflow-hidden rounded-[13px] border-2 border-black bg-white cursor-pointer select-none"
    >
      {tall ? (
        <>
          {/* Mobile: taller-card artwork made for the narrow stacked layout */}
          <img
            src="/OOTD/OOTD component 2.png"
            alt="Outfit of the Day"
            className="absolute inset-0 h-full w-full object-contain object-bottom md:hidden"
            draggable={false}
          />
          {/* Desktop: grid layout already gives this enough room, keep the original artwork */}
          <img
            src="/OOTD/Frame 1597880833.png"
            alt="Outfit of the Day"
            className="absolute inset-0 hidden h-full w-full object-contain object-bottom md:block"
            style={{ transform: "scale(1.35)", transformOrigin: "center bottom" }}
            draggable={false}
          />
        </>
      ) : (
        <img
          src="/OOTD/Frame 1597880833.png"
          alt="Outfit of the Day"
          className="absolute inset-0 h-full w-full object-contain object-bottom"
          style={{ transform: "scale(1.35)", transformOrigin: "center bottom" }}
          draggable={false}
        />
      )}
      <div className="absolute inset-x-0 top-0 flex flex-col items-center pt-2 pointer-events-none">
        <p
          className="text-[12px] sm:text-sm font-medium text-black leading-tight"
          style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
        >
          Outfit of the Day
        </p>
        <p
          className="text-base sm:text-xl font-semibold text-black leading-tight tracking-tight"
          style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
        >
          OOTD
        </p>
      </div>
    </div>
  );
};

export default OOTDCard;

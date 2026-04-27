import { useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MessageCircle, X } from "lucide-react";

const PEI_PHOTO = "https://media.licdn.com/dms/image/v2/C4E03AQEwqRTuVXJRIg/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1596752192050?e=1778716800&v=beta&t=opE_oXyc1rpZgXGhlTKJlKQe9Jn9yTyWIox7Ev8t3zo";

const getPageName = (pathname: string): string => {
  if (pathname === "/wards") return "Ward Page";
  if (pathname.startsWith("/event/")) return "Event Detail";
  if (pathname.startsWith("/create-event")) return "Create Event";
  if (pathname === "/post") return "My Posts";
  if (pathname === "/profile") return "Profile";
  if (pathname === "/events") return "Events Page";
  if (pathname.startsWith("/ward/")) return "Ward Profile";
  if (pathname === "/search") return "Search";
  if (pathname === "/my-published-events") return "Published Events";
  if (pathname === "/community") return "Community";
  if (pathname.startsWith("/group/")) return "Group Profile";
  return "App";
};

const FeedbackButton = () => {
  const { pathname } = useLocation();
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const hidePaths = ["/", "/onboarding/name", "/onboarding/age", "/onboarding/ward"];
  if (hidePaths.includes(pathname)) return null;

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    await supabase.from("feedback").insert({
      message: message.trim(),
      page_name: getPageName(pathname),
      page_url: pathname,
      user_id: session?.user?.id ?? null,
      created_at: new Date().toISOString(),
    });
    setSubmitting(false);
    setSubmitted(true);
    setMessage("");
    setTimeout(() => {
      setSubmitted(false);
      setOpen(false);
    }, 2000);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-full shadow-md hover:shadow-lg transition-all text-sm font-medium text-gray-700"
      >
        <MessageCircle className="h-4 w-4 text-gray-500" />
        Feedback
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors">
              <X className="h-4 w-4 text-gray-500" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-3">
              <img
                src={PEI_PHOTO}
                alt="Pei"
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                referrerPolicy="no-referrer"
              />
              <div>
                <p className="text-sm font-bold text-gray-900">Hey, I'm Pei 👋</p>
                <p className="text-xs text-gray-500 mt-0.5">App Developer</p>
              </div>
            </div>

            <p className="text-sm text-gray-700 leading-relaxed">
              Thank you so much for spending your time on the app! Your insights and feedback are truly valuable to me. I'd love to hear what you think — anything at all.
            </p>

            {submitted ? (
              <div className="text-center py-3">
                <p className="text-sm font-semibold text-green-600">🙏 Thank you so much!</p>
              </div>
            ) : (
              <>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share your thoughts..."
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none outline-none focus:border-gray-400 transition-colors"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || submitting}
                  className="w-full py-3 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40"
                >
                  {submitting ? "Submitting..." : "Submit Feedback"}
                </button>
                <p className="text-[11px] text-center text-gray-400">
                  From: <span className="font-medium">{getPageName(pathname)}</span>
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackButton;

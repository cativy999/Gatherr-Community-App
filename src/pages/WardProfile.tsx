import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

// Map slug → search keyword used to find the community by name
const SLUG_TO_KEYWORD: Record<string, string> = {
  "santa-monica": "Santa Monica",
  "south-bay": "South Bay",
  "glendale": "Glendale",
};

const WardProfile = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!slug) return;

    const keyword = SLUG_TO_KEYWORD[slug] ?? slug;

    const findAndRedirect = async () => {
      const { data } = await supabase
        .from("communities")
        .select("id")
        .ilike("name", `%${keyword}%`)
        .limit(1)
        .single();

      if (data?.id) {
        navigate(`/group/${data.id}`, { replace: true });
      } else {
        // Community not found — go back
        navigate(-1);
      }
    };

    findAndRedirect();
  }, [slug, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
};

export default WardProfile;

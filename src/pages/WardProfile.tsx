import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";

const SLUG_TO_GROUP_ID: Record<string, string> = {
  "santa-monica": "6ce56e22-5eea-4c53-ade0-069c5cf67f67",
  "south-bay":    "9f294607-b74a-4ca2-8935-895cf23c6d37",
  "glendale":     "9c0a1145-e9a2-48d4-b31b-4ac6df608f15",
};

const WardProfile = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const groupId = SLUG_TO_GROUP_ID[slug ?? ""];
    if (groupId) {
      navigate(`/group/${groupId}`, { replace: true });
    } else {
      navigate(-1);
    }
  }, [slug, navigate]);

  return null;
};

export default WardProfile;

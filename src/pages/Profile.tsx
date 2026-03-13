import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, MapPin, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

const Profile = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [profileLocation, setProfileLocation] = useState("");

  const user = session?.user;
  const name = user?.user_metadata?.full_name || user?.email || "User";
  const avatar = user?.user_metadata?.avatar_url;
  const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("location")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.location) setProfileLocation(data.location);
      });
  }, [user]);

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">Profile</h1>
          <button className="p-2 hover:bg-accent rounded-full transition-colors">
            <Settings className="h-6 w-6" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex flex-col items-center space-y-4 text-center">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatar} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{name}</h2>
              {profileLocation && (
                <p className="text-muted-foreground flex items-center justify-center gap-2 mt-1">
                  <MapPin className="h-4 w-4" />
                  {profileLocation}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold">Recently Viewed</h3>
            <div className="space-y-3">
              {[
                { name: "Spring Festival", time: "2 days ago" },
                { name: "Yoga in the Park", time: "2 days ago" },
                { name: "Cooking Workshop", time: "2 days ago" },
              ].map((item) => (
                <div key={item.name} className="bg-card rounded-xl p-4 border border-border">
                  <p className="text-sm">
                    <span className="font-semibold">{item.name}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{item.time}</p>
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            size="lg"
            className="w-full h-12 text-destructive hover:text-destructive"
            onClick={handleLogOut}
          >
            <LogOut className="mr-2 h-5 w-5" />
            Log Out
          </Button>
        </div>
      </main>

      <BottomNav currentPage="profile" />
    </div>
  );
};

export default Profile;
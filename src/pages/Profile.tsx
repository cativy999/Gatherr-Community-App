import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, Calendar, MapPin, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const stats = [
  { label: "Events Joined", value: "12" },
  { label: "Events Created", value: "3" },
  { label: "Connections", value: "48" },
];

const Profile = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">Profile</h1>
          <button className="p-2 hover:bg-accent rounded-full transition-colors">
            <Settings className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Profile Info */}
          <div className="flex flex-col items-center space-y-4 text-center">
            <Avatar className="h-24 w-24">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=User" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">John Doe</h2>
              <p className="text-muted-foreground flex items-center justify-center gap-2 mt-1">
                <MapPin className="h-4 w-4" />
                San Francisco, CA
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-card rounded-2xl p-4 text-center border border-border"
              >
                <div className="text-2xl font-bold text-primary">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button variant="outline" size="lg" className="w-full h-12" onClick={() => navigate("/my-events")}>
              <Calendar className="mr-2 h-5 w-5" />
              My Events
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full h-12 text-destructive hover:text-destructive"
              onClick={() => navigate("/")}
            >
              <LogOut className="mr-2 h-5 w-5" />
              Log Out
            </Button>
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Recent Activity</h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-xl p-4 border border-border">
                  <p className="text-sm">
                    Joined <span className="font-semibold">Community Picnic</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">2 days ago</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <BottomNav currentPage="profile" />
    </div>
  );
};

export default Profile;

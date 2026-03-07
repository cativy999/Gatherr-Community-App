import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Calendar, Heart, MapPin, Edit2, LogOut } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

const stats = [
  { label: "Events Joined", value: "12" },
  { label: "Events Created", value: "3" },
  { label: "Connections", value: "48" },
];

const ageRanges = ["18-29", "27-37", "30-40", "37-47", "45-55", "48-58"];

const wardOptions = [
  "Downtown Ward", "North Ward", "South Ward", "East Ward", "West Ward",
  "Central Ward", "Riverside Ward", "Hillside Ward",
];

const Profile = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingWard, setIsEditingWard] = useState(false);
  const [isEditingAge, setIsEditingAge] = useState(false);
  const [birthday, setBirthday] = useState("1990-01-15");
  const [ward, setWard] = useState("Downtown Ward");
  const [activityAge, setActivityAge] = useState("27-37");

  const handleSave = () => {
    setIsEditing(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold">Profile</h1>
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
            <p className="text-sm text-muted-foreground max-w-md">
              Love exploring new activities and meeting people in my community!
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-card rounded-2xl p-4 text-center border border-border"
              >
                <div className="text-2xl font-bold text-primary">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Edit Profile Section */}
          {isEditing ? (
            <div className="space-y-6 bg-card rounded-2xl p-6 border border-border">
              <h3 className="text-xl font-bold">Edit Profile</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="birthday">Birthday</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ward">Ward</Label>
                  <Input
                    id="ward"
                    type="text"
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Activity Age Range</Label>
                  <div className="space-y-2">
                    {ageRanges.map((range) => (
                      <button
                        key={range}
                        onClick={() => setActivityAge(range)}
                        className={`w-full rounded-xl px-4 py-3 text-base font-medium transition-all ${
                          activityAge === range
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground hover:bg-accent"
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 h-12"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="lg"
                  className="flex-1 h-12"
                  onClick={handleSave}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Profile Info Display */}
              <div className="space-y-4 bg-card rounded-2xl p-6 border border-border">
                <h3 className="text-xl font-bold">Profile Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Birthday</p>
                    <p className="text-base font-medium">{birthday}</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Ward</p>
                      <button
                        onClick={() => setIsEditingWard(!isEditingWard)}
                        className="text-primary text-sm font-medium hover:underline"
                      >
                        {isEditingWard ? "Done" : "Edit"}
                      </button>
                    </div>
                    {isEditingWard ? (
                      <Select value={ward} onValueChange={(val) => { setWard(val); setIsEditingWard(false); }}>
                        <SelectTrigger className="h-10 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {wardOptions.map((w) => (
                            <SelectItem key={w} value={w}>{w}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-base font-medium">{ward}</p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Activity Age Range</p>
                      <button
                        onClick={() => setIsEditingAge(!isEditingAge)}
                        className="text-primary text-sm font-medium hover:underline"
                      >
                        {isEditingAge ? "Done" : "Edit"}
                      </button>
                    </div>
                    {isEditingAge ? (
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        {ageRanges.map((range) => (
                          <button
                            key={range}
                            onClick={() => { setActivityAge(range); setIsEditingAge(false); }}
                            className={`rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                              activityAge === range
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-foreground hover:bg-accent"
                            }`}
                          >
                            {range}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-base font-medium">{activityAge}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button 
                  variant="default" 
                  size="lg" 
                  className="w-full h-12"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="mr-2 h-5 w-5" />
                  Edit Profile
                </Button>
                <Button variant="outline" size="lg" className="w-full h-12">
                  <Calendar className="mr-2 h-5 w-5" />
                  My Events
                </Button>
                <Button variant="outline" size="lg" className="w-full h-12">
                  <Heart className="mr-2 h-5 w-5" />
                  Saved Events
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
            </>
          )}

          {/* Recent Activity */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Recent Activity</h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-card rounded-xl p-4 border border-border"
                >
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

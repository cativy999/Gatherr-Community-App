import { ArrowLeft, Calendar, MapPin, Heart, Share2, Copy, Link, Loader2, CheckCircle2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type Person = { name: string; avatar: string };

const mockPeople: Record<string, Person[]> = {
  going: [
    { name: "Sarah Johnson", avatar: "SJ" },
    { name: "Mike Chen", avatar: "MC" },
    { name: "Emily Rodriguez", avatar: "ER" },
    { name: "Jake Park", avatar: "JP" },
    { name: "Lisa Torres", avatar: "LT" },
  ],
  maybe: [
    { name: "Carlos Martinez", avatar: "CM" },
    { name: "Anna Kim", avatar: "AK" },
    { name: "David Lee", avatar: "DL" },
  ],
  notGoing: [
    { name: "Rachel Green", avatar: "RG" },
    { name: "Tom Wilson", avatar: "TW" },
  ],
};

// Mock data
const eventData: Record<string, any> = {
  "1": {
    id: 1, category: "COMMUNITY EVENT", title: "Community Picnic",
    description: "Join your neighbors for a fun afternoon picnic with games, food, and great company in the park.",
    image: "https://images.unsplash.com/photo-1506368083636-6defb67639a7?w=800&h=600&fit=crop",
    date: "Today, 2:00 PM", location: "Balboa Park", likes: 45,
    host: "Parks & Recreation Department",
    going: 28, maybe: 12, notGoing: 5,
    comments: [
      { id: 1, author: "Sarah Johnson", time: "2 hours ago", text: "Can't wait! This is going to be amazing!" },
      { id: 2, author: "Mike Chen", time: "4 hours ago", text: "Will there be food vendors?" },
    ],
  },
  "2": {
    id: 2, category: "SOCIAL GATHERING", title: "Book Club Meeting",
    description: "Discuss the latest bestseller in a cozy cafe. All book lovers welcome!",
    image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&h=600&fit=crop",
    date: "Tomorrow, 6:00 PM", location: "Downtown Library", likes: 22,
    host: "Sarah's Book Club",
    going: 15, maybe: 4, notGoing: 2,
    comments: [],
  },
  "3": {
    id: 3, category: "OUTDOOR ACTIVITY", title: "Yoga in the Park",
    description: "Start your weekend with a relaxing yoga session surrounded by nature. All levels welcome, mats provided.",
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop",
    date: "March 15, 8:00 AM", location: "Mission Bay Park", likes: 67,
    host: "Zen Wellness Studio",
    going: 42, maybe: 8, notGoing: 3,
    comments: [
      { id: 1, author: "Emily R.", time: "1 day ago", text: "Love these outdoor sessions!" },
    ],
  },
  "4": {
    id: 4, category: "COMMUNITY EVENT", title: "Neighborhood Cleanup",
    description: "Help keep our neighborhood beautiful! Gloves and bags provided. Great way to meet your neighbors.",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=600&fit=crop",
    date: "Today, 10:00 AM", location: "North Park", likes: 30,
    host: "Neighborhood Association",
    going: 35, maybe: 6, notGoing: 4,
    comments: [],
  },
  "5": {
    id: 5, category: "WORKSHOP", title: "Cooking Workshop",
    description: "Learn to cook authentic Italian pasta from scratch with a professional chef. Ingredients included.",
    image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&h=600&fit=crop",
    date: "March 15, 3:00 PM", location: "Community Kitchen", likes: 55,
    host: "Chef Antonio's Kitchen",
    going: 20, maybe: 7, notGoing: 2,
    comments: [
      { id: 1, author: "Carlos M.", time: "3 hours ago", text: "Is this beginner friendly?" },
      { id: 2, author: "Chef Anna", time: "2 hours ago", text: "Absolutely! All skill levels welcome." },
    ],
  },
  "6": {
    id: 6, category: "FESTIVAL", title: "Spring Festival",
    description: "Celebrate the arrival of spring with live music, food trucks, art booths, and activities for all ages.",
    image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop",
    date: "March 20, 12:00 PM", location: "Civic Center Plaza", likes: 89,
    host: "City Cultural Events",
    going: 120, maybe: 34, notGoing: 11,
    comments: [
      { id: 1, author: "Lisa T.", time: "5 hours ago", text: "Will there be live bands?" },
      { id: 2, author: "Event Team", time: "3 hours ago", text: "Yes! 4 bands performing throughout the day." },
    ],
  },
  "7": {
    id: 7, category: "OUTDOOR ACTIVITY", title: "Photography Walk",
    description: "Explore scenic spots in the city with fellow photography enthusiasts. Bring your camera or phone!",
    image: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&h=600&fit=crop",
    date: "Tomorrow, 9:00 AM", location: "Gaslamp Quarter", likes: 33,
    host: "Photography Collective",
    going: 18, maybe: 5, notGoing: 1,
    comments: [],
  },
  "8": {
    id: 8, category: "SOCIAL GATHERING", title: "Board Game Night",
    description: "Bring your favorite board games or try new ones! Snacks and drinks available. Fun for everyone.",
    image: "https://images.unsplash.com/photo-1611371805429-8b5c1b2c34ba?w=800&h=600&fit=crop",
    date: "Today, 7:00 PM", location: "The Game Lounge", likes: 41,
    host: "Game Lounge Team",
    going: 24, maybe: 9, notGoing: 3,
    comments: [
      { id: 1, author: "Jake P.", time: "1 hour ago", text: "I'm bringing Catan!" },
    ],
  },
  "101": {
    id: 101, category: "WARD ACTIVITY", title: "Sunday Potluck Dinner",
    description: "Bring your favorite dish and enjoy a wonderful evening of food and fellowship with ward members.",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop",
    date: "Today, 5:00 PM", location: "Arcadia Ward Building", likes: 18,
    host: "Arcadia Ward",
    going: 22, maybe: 8, notGoing: 2,
    comments: [{ id: 1, author: "Bishop Taylor", time: "3 hours ago", text: "Looking forward to seeing everyone!" }],
  },
  "102": {
    id: 102, category: "WARD ACTIVITY", title: "Youth Service Project",
    description: "Join the youth for a morning of community service. We'll be cleaning up the local park and planting trees.",
    image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=600&fit=crop",
    date: "Sunday, 9:00 AM", location: "Arcadia Ward Building", likes: 12,
    host: "Arcadia Ward Youth",
    going: 15, maybe: 5, notGoing: 1,
    comments: [],
  },
  "103": {
    id: 103, category: "WARD ACTIVITY", title: "Family Movie Night",
    description: "Bring blankets and snacks for a family-friendly movie night in the cultural hall. Popcorn provided!",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=600&fit=crop",
    date: "Today, 7:00 PM", location: "Pasadena 1st Ward Building", likes: 25,
    host: "Pasadena 1st Ward",
    going: 30, maybe: 10, notGoing: 3,
    comments: [{ id: 1, author: "Sister Adams", time: "1 hour ago", text: "What movie are we watching?" }],
  },
  "104": {
    id: 104, category: "WARD ACTIVITY", title: "Choir Practice",
    description: "Weekly choir rehearsal. All voices welcome, no experience needed. Come make joyful music together!",
    image: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800&h=600&fit=crop",
    date: "Sunday, 4:00 PM", location: "Monrovia Ward Building", likes: 9,
    host: "Monrovia Ward Music",
    going: 12, maybe: 3, notGoing: 1,
    comments: [],
  },
  "105": {
    id: 105, category: "WARD ACTIVITY", title: "Pancake Breakfast",
    description: "Start your morning with delicious pancakes, eggs, and fresh fruit. A ward tradition everyone loves!",
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop",
    date: "Today, 8:00 AM", location: "Arcadia Ward Building", likes: 20,
    host: "Arcadia Ward Kitchen",
    going: 28, maybe: 6, notGoing: 2,
    comments: [{ id: 1, author: "Brother James", time: "5 hours ago", text: "I'll bring the maple syrup!" }],
  },
  "106": {
    id: 106, category: "WARD ACTIVITY", title: "Volleyball Tournament",
    description: "Inter-ward volleyball tournament! Form your teams and come ready to play. Refreshments provided.",
    image: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&h=600&fit=crop",
    date: "Sunday, 2:00 PM", location: "Duarte Ward Gym", likes: 35,
    host: "Duarte Ward Sports",
    going: 40, maybe: 12, notGoing: 4,
    comments: [],
  },
  "107": {
    id: 107, category: "WARD ACTIVITY", title: "Book of Mormon Study",
    description: "Join us for an uplifting group scripture study. This week we're covering 1 Nephi chapters 1-5.",
    image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&h=600&fit=crop",
    date: "Today, 10:00 AM", location: "Pasadena 2nd Ward Building", likes: 14,
    host: "Pasadena 2nd Ward",
    going: 10, maybe: 4, notGoing: 1,
    comments: [],
  },
  "108": {
    id: 108, category: "WARD ACTIVITY", title: "Temple Trip",
    description: "Ward temple trip to the Los Angeles Temple. Carpool available from the ward building.",
    image: "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&h=600&fit=crop",
    date: "Sunday, 6:00 AM", location: "Los Angeles Temple", likes: 28,
    host: "Arcadia Ward Leadership",
    going: 18, maybe: 7, notGoing: 2,
    comments: [{ id: 1, author: "Sister Kim", time: "2 hours ago", text: "I can drive 4 people!" }],
  },
};

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const event = eventData[id || "1"];
  const [comment, setComment] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(event?.likes || 0);
  const [comments, setComments] = useState(event?.comments || []);
  const [rsvpStatus, setRsvpStatus] = useState<"going" | "maybe" | "not-going" | null>(null);
  const [activeList, setActiveList] = useState<"going" | "maybe" | "notGoing" | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);

  const rsvpLabels: Record<string, string> = {
    going: "You're going!",
    maybe: "You're maybe going",
    "not-going": "You're not going",
  };

  const handleRsvp = (status: "going" | "maybe" | "not-going") => {
    if (rsvpStatus === status) return;
    setRsvpLoading(status);
    setTimeout(() => {
      setRsvpStatus(status);
      setRsvpLoading(null);
    }, 800);
  };

  const shareOptions = [
    { icon: Copy, label: "Copy Link", action: () => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); setShareOpen(false); } },
  ];

  if (!event) {
    return <div>Event not found</div>;
  }

  const handleSubmitComment = () => {
    if (comment.trim()) {
      const newComment = {
        id: comments.length + 1,
        author: "You",
        time: "Just now",
        text: comment,
      };
      setComments([newComment, ...comments]);
      setComment("");
    }
  };

  const listLabels = { going: "Going", maybe: "Maybe", notGoing: "Not Going" };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-accent rounded-full transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <Button
            variant="ghost"
            size="icon"
            className={`${isSaved ? 'text-red-500' : ''}`}
            onClick={() => {
              setIsSaved(!isSaved);
              setLikeCount((prev: number) => isSaved ? prev - 1 : prev + 1);
            }}
          >
            <Heart className={`h-6 w-6 ${isSaved ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* RSVP Status Banner */}
          {rsvpStatus && (
            <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-3 rounded-2xl">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-semibold">{rsvpLabels[rsvpStatus]}</span>
            </div>
          )}

          {/* Event Image */}
          <div className="relative">
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-44 object-cover rounded-3xl"
            />
            <button
              onClick={() => setShareOpen(true)}
              className="absolute bottom-3 right-3 p-2 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors shadow-md"
            >
              <Share2 className="h-5 w-5 text-foreground" />
            </button>
          </div>

          {/* Share Popup */}
          <Dialog open={shareOpen} onOpenChange={setShareOpen}>
            <DialogContent className="w-[calc(100%-40px)] max-w-[360px] rounded-2xl p-0 overflow-hidden">
              <DialogHeader className="p-5 pb-3">
                <DialogTitle className="text-lg font-bold">Share Event</DialogTitle>
              </DialogHeader>
              <div className="px-5 pb-5 space-y-1">
                {shareOptions.map(({ icon: Icon, label, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="w-full flex items-center gap-3 py-3 hover:bg-accent/30 -mx-2 px-2 rounded-lg transition-colors group"
                  >
                    <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center">
                      <Icon className="h-4 w-4 text-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{label}</span>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* Event Info */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">
              {event.category}
            </p>
            <h1 className="text-4xl font-bold">{event.title}</h1>
            
            <div className="flex flex-col gap-3 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>{event.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <span>{event.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                <span>{likeCount} likes</span>
              </div>
              <div className="text-sm font-medium text-foreground">
                Hosted by <span className="font-semibold text-primary">{event.host}</span>
              </div>
            </div>

            {/* RSVP Counts */}
            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setActiveList("going")}
                className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                <span className="text-lg font-bold">{event.going}</span> Going
              </button>
              <button
                onClick={() => setActiveList("maybe")}
                className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                <span className="text-lg font-bold">{event.maybe}</span> Maybe
              </button>
              <button
                onClick={() => setActiveList("notGoing")}
                className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                <span className="text-lg font-bold">{event.notGoing}</span> Not Going
              </button>
            </div>

            {/* People List Popup */}
            <Dialog open={!!activeList} onOpenChange={(open) => !open && setActiveList(null)}>
              <DialogContent className="w-[calc(100%-40px)] max-w-[360px] rounded-2xl p-0 overflow-hidden">
                <DialogHeader className="p-5 pb-3">
                  <DialogTitle className="text-lg font-bold">{activeList ? listLabels[activeList] : ""}</DialogTitle>
                </DialogHeader>
                <div className="px-5 pb-5 space-y-1 max-h-64 overflow-y-auto">
                  {activeList && mockPeople[activeList].map((person, i) => (
                    <div key={i} className="flex items-center gap-3 py-3 -mx-2 px-2 rounded-lg hover:bg-accent/30 transition-colors">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {person.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground">{person.name}</span>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            <p className="text-lg leading-relaxed pt-4">{event.description}</p>
          </div>

          {/* Comments Section */}
          <div className="space-y-6 pt-4">
            <h2 className="text-2xl font-bold">Comments</h2>

            {/* Write Comment */}
            <div className="space-y-3">
              <Textarea
                placeholder="Write a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="resize-none rounded-2xl"
                rows={3}
              />
              <Button onClick={handleSubmitComment} className="rounded-full">
                Post Comment
              </Button>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="bg-card rounded-2xl p-4 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold">{c.author}</p>
                      <p className="text-sm text-muted-foreground">{c.time}</p>
                    </div>
                    <p className="text-muted-foreground">{c.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky RSVP Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-6 py-4 z-10">
        <div className="grid grid-cols-3 gap-3 max-w-4xl mx-auto">
          <Button
            variant={rsvpStatus === "going" ? "default" : "outline"}
            size="lg"
            className="rounded-full"
            disabled={!!rsvpLoading}
            onClick={() => handleRsvp("going")}
          >
            {rsvpLoading === "going" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Going"}
          </Button>
          <Button
            variant={rsvpStatus === "maybe" ? "default" : "outline"}
            size="lg"
            className="rounded-full"
            disabled={!!rsvpLoading}
            onClick={() => handleRsvp("maybe")}
          >
            {rsvpLoading === "maybe" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Maybe"}
          </Button>
          <Button
            variant={rsvpStatus === "not-going" ? "default" : "outline"}
            size="lg"
            className="rounded-full"
            disabled={!!rsvpLoading}
            onClick={() => handleRsvp("not-going")}
          >
            {rsvpLoading === "not-going" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Not Going"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;

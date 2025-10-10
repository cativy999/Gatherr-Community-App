import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, MapPin, Users, Image as ImageIcon } from "lucide-react";

const Post = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold">Create Event</h1>
          <Button variant="ghost" size="sm">
            Cancel
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Image Upload */}
          <div className="flex items-center justify-center w-full h-48 bg-secondary rounded-2xl border-2 border-dashed border-border hover:bg-accent transition-colors cursor-pointer">
            <div className="text-center space-y-2">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to upload event image
              </p>
            </div>
          </div>

          {/* Event Details Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Event Title</label>
              <Input
                placeholder="e.g., Community Picnic"
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Tell people about your event..."
                className="min-h-32 text-base"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Input
                placeholder="e.g., Community Event, Outdoor Activity"
                className="h-12 text-base"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date
                </label>
                <Input type="date" className="h-12 text-base" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Max Attendees
                </label>
                <Input type="number" placeholder="50" className="h-12 text-base" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </label>
              <Input
                placeholder="e.g., Central Park"
                className="h-12 text-base"
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button size="lg" className="w-full h-14 text-base font-semibold">
            Create Event
          </Button>
        </div>
      </main>

      <BottomNav currentPage="post" />
    </div>
  );
};

export default Post;

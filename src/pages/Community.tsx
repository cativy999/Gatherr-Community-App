import BottomNav from "@/components/BottomNav";
import { Users } from "lucide-react";

const Community = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm   px-5 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            My Groups
          </h1>
        </div>
      </header>

      <main className="flex-1 px-5 py-8">
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-4 text-center pt-16">
          <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="font-semibold text-lg">No groups yet</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Create a group to build a community around shared interests.
          </p>
        </div>
      </main>

      <BottomNav currentPage="community" />
    </div>
  );
};

export default Community;

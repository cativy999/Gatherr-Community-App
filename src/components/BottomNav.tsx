import { Home, Search, PlusCircle, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BottomNavProps {
  currentPage: "home" | "wards" | "post" | "profile";
}

const BottomNav = ({ currentPage }: BottomNavProps) => {
  const navigate = useNavigate();

  const navItems = [
    { id: "home", label: "Home", icon: Home, path: "/home" },
    { id: "browse", label: "Browse", icon: Search, path: "/browse" },
    { id: "post", label: "Post", icon: PlusCircle, path: "/post" },
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <div className="flex items-center justify-around max-w-4xl mx-auto px-4 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1 min-w-[4rem] transition-colors"
            >
              <Icon
                className={`h-6 w-6 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-xs font-medium ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;

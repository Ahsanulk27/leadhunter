import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Search, 
  Table, 
  History, 
  BarChart, 
  Settings, 
  Database 
} from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();

  // Navigation items
  const navItems = [
    {
      title: "Lead Finder",
      href: "/",
      icon: <Search className="w-6 h-6" />,
    },
    {
      title: "My Leads",
      href: "/my-leads",
      icon: <Table className="w-6 h-6" />,
    },
    {
      title: "Search History",
      href: "/search-history",
      icon: <History className="w-6 h-6" />,
    },
    {
      title: "Analytics",
      href: "/analytics",
      icon: <BarChart className="w-6 h-6" />,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: <Settings className="w-6 h-6" />,
    }
  ];

  return (
    <aside className="bg-white border-r border-gray-200 w-full md:w-64 flex-shrink-0">
      <div className="h-full px-3 py-4 overflow-y-auto">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href || 
              (item.href === "/" && location === "");
            
            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <div
                    className={cn(
                      "flex items-center p-2 text-base font-medium rounded-lg",
                      isActive
                        ? "text-primary bg-blue-50"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <span className={cn(
                      "w-6 h-6",
                      isActive ? "text-primary" : "text-gray-500"
                    )}>
                      {item.icon}
                    </span>
                    <span className="ml-3">{item.title}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

      </div>
    </aside>
  );
}

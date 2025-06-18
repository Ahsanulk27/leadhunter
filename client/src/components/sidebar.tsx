import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  Search,
  Table,
  History,
  BarChart,
  Settings,
  Globe,
  Users,
  UserRound,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Check if mobile view on mount and resize
  useEffect(() => {
    const checkIfMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsOpen(false);
      }
    };
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // Navigation items
  const navItems = [
    { title: "Home", href: "/", icon: <Search className="w-5 h-5" /> },
    {
      title: "Lead Finder",
      href: "/lead-finder",
      icon: <Search className="w-5 h-5" />,
    },
    {
      title: "Bulk Leads",
      href: "/bulk-leads",
      icon: <Globe className="w-5 h-5" />,
    },
    {
      title: "B2C Leads",
      href: "/b2c-leads",
      icon: <Users className="w-5 h-5" />,
    },
    {
      title: "Consumer Leads",
      href: "/consumer-leads",
      icon: <UserRound className="w-5 h-5" />,
    },
    {
      title: "My Leads",
      href: "/my-leads",
      icon: <Table className="w-5 h-5" />,
    },
    {
      title: "History",
      href: "/search-history",
      icon: <History className="w-5 h-5" />,
    },
    {
      title: "Analytics",
      href: "/analytics",
      icon: <BarChart className="w-5 h-5" />,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  // Toggle sidebar collapse
  const toggleSidebar = () => {
    if (isMobile) {
      setIsOpen(!isOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-10 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "bg-white border-r border-gray-200 flex-shrink-0 fixed md:relative h-full z-20 transition-all duration-300",
          isCollapsed ? "w-16" : "w-64",
          isMobile
            ? isOpen
              ? "translate-x-0"
              : "-translate-x-full"
            : "translate-x-0"
        )}
      >
        {/* Collapse/Expand Button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-5 z-10 rounded-full border bg-white p-1 shadow-sm hover:bg-gray-100 hidden md:block"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        <div className="h-full flex flex-col">
          {/* Logo/Brand - Collapsed shows icon only */}
          <div
            className={cn(
              "flex items-center p-4 border-b",
              isCollapsed ? "justify-center" : "justify-between"
            )}
          >
            {!isCollapsed && (
              <h1 className="font-bold text-lg text-primary">LeadHunter</h1>
            )}
            <div className="w-6 h-6 text-primary">
              <Search className="w-full h-full" />
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-2 py-4 overflow-y-auto">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  location === item.href ||
                  (item.href === "/" && location === "/");

                return (
                  <li key={item.href}>
                    <Link href={item.href}>
                      <div
                        className={cn(
                          "flex items-center p-2 rounded-lg transition-colors group",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-gray-600 hover:bg-gray-100",
                          isCollapsed ? "justify-center" : ""
                        )}
                      >
                        <span
                          className={cn(
                            "flex-shrink-0",
                            isActive ? "text-primary" : "text-gray-500"
                          )}
                        >
                          {item.icon}
                        </span>
                        {!isCollapsed && (
                          <span className="ml-3 whitespace-nowrap">
                            {item.title}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Mobile menu button (only shows on mobile) */}
          <div className="p-4 border-t md:hidden">
            <button
              onClick={toggleSidebar}
              className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-gray-100"
            >
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
              {!isCollapsed && <span className="ml-2">Collapse</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Sidebar from "./sidebar";
import { useToast } from "@/hooks/use-toast";
import { BadgeDollarSign, Cog, UserCircle, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { motion, AnimatePresence } from "framer-motion";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    const checkIfMobile = () => setIsMobile(window.innerWidth < 768);

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", checkIfMobile);
    checkIfMobile();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", checkIfMobile);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setLocation("/");
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <motion.header
        className={cn(
          "sticky top-0 z-40 bg-white/80 backdrop-blur-md transition-all duration-300 border-b",
          isScrolled ? "shadow-sm" : "shadow-none"
        )}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {user && isMobile && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 mr-2 rounded-lg hover:bg-gray-100"
                  onClick={() => {
                    const sidebar = document.querySelector("aside");
                    if (sidebar) {
                      sidebar.classList.toggle("-translate-x-full");
                    }
                  }}
                >
                  <Menu className="h-5 w-5 text-gray-600" />
                </motion.button>
              )}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-blue-600 p-2 rounded-lg shadow-md"
              >
                <BadgeDollarSign className="h-6 w-6 text-white" />
              </motion.div>
              <h1 className="ml-3 text-xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                LeadHunter
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              {user ? (
                <>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="hidden sm:flex items-center px-3 py-1 rounded-full bg-blue-50"
                  >
                    <span className="text-sm font-medium text-blue-700">
                      Welcome, {user.username}
                    </span>
                  </motion.div>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 rounded-full hover:bg-gray-100"
                    onClick={() => {
                      toast({
                        title: "Settings",
                        description: "Settings functionality is coming soon!",
                      });
                    }}
                  >
                    <Cog className="h-5 w-5 text-gray-600" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 rounded-full hover:bg-gray-100"
                    onClick={() => {
                      toast({
                        title: "Profile",
                        description: "Profile page is coming soon!",
                      });
                    }}
                  >
                    <UserCircle className="h-5 w-5 text-gray-600" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 rounded-full hover:bg-gray-100"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5 text-gray-600" />
                  </motion.button>
                </>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
                  onClick={() => setLocation("/login")}
                >
                  Sign In
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content Area */}
      <div className="flex flex-col md:flex-row relative max-w-8xl mx-auto">
        {/* Sidebar - Only show when user is authenticated */}
        <AnimatePresence>
          {user && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="md:sticky md:top-16 md:h-[calc(100vh-4rem)]"
            >
              <Sidebar />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="min-h-[calc(100vh-12rem)]"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white/80 backdrop-blur-md border-t border-gray-200 py-6"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <p className="text-sm text-gray-600">
                <span className="font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                  LeadHunter
                </span>{" "}
                &copy; {new Date().getFullYear()} — All rights reserved.
              </p>
            </div>
            <div className="flex items-center space-x-6">
              {["Terms", "Privacy", "Help", "Contact"].map((item) => (
                <motion.a
                  key={item}
                  whileHover={{ scale: 1.05 }}
                  href="#"
                  className="text-sm font-medium text-gray-600 hover:text-blue-600"
                >
                  {item}
                </motion.a>
              ))}
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}

// Helper function for class concatenation
function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

import React, { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Lock, Mail, User, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password, email);
      }
      setLocation("/");
    } catch (error) {
      // Error is handled by the auth context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Floating background elements */}
      <motion.div 
        className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-blue-200 opacity-20 blur-xl"
        animate={{
          y: [0, 20, 0],
          x: [0, 15, 0]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div 
        className="absolute bottom-1/3 right-1/4 w-40 h-40 rounded-full bg-blue-300 opacity-15 blur-xl"
        animate={{
          y: [0, -30, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Back to home button */}
      <motion.div 
        className="absolute top-6 left-6"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Button
          variant="outline"
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 shadow-sm border-blue-200 hover:border-blue-300"
        >
          <Home className="h-4 w-4" />
          Back to Home
        </Button>
      </motion.div>

      {/* Main card - Now wider and more spacious */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl" // Increased max width
      >
        <Card className="w-full shadow-xl border-blue-100/50 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-400 to-blue-600" />
          
          <CardHeader className="pb-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <CardTitle className="text-3xl font-bold text-center text-blue-800">
                {isLogin ? "Welcome Back" : "Join Our Community"}
              </CardTitle>
              <CardDescription className="text-center text-blue-600/80 text-lg mt-2">
                {isLogin
                  ? "Sign in to access your dashboard and tools"
                  : "Create your account to get started today"}
              </CardDescription>
            </motion.div>
          </CardHeader>

          <CardContent className="px-8 py-6"> {/* Increased padding */}
            <Tabs
              value={isLogin ? "login" : "register"}
              onValueChange={(value) => setIsLogin(value === "login")}
              className="w-full"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mb-6"
              >
                <TabsList className="grid w-full grid-cols-2 bg-blue-50/50 h-12">
                  <TabsTrigger 
                    value="login" 
                    className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-base transition-all"
                  >
                    Login
                  </TabsTrigger>
                  <TabsTrigger 
                    value="register"
                    className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-base transition-all"
                  >
                    Register
                  </TabsTrigger>
                </TabsList>
              </motion.div>

              <TabsContent value="login">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <form onSubmit={handleSubmit} className="space-y-5"> {/* Increased spacing */}
                    <div className="space-y-3">
                      <Label htmlFor="username" className="text-blue-800/90 text-base">Username</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-500" />
                        <Input
                          id="username"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                          className="pl-11 bg-white/90 h-12 text-base" // Taller input
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="password" className="text-blue-800/90 text-base">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-500" />
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="pl-11 bg-white/90 h-12 text-base" // Taller input
                        />
                      </div>
                    </div>
                    <motion.div 
                      whileHover={{ scale: 1.01 }} 
                      whileTap={{ scale: 0.98 }}
                      className="pt-2"
                    >
                      <Button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg group"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Signing in...
                          </span>
                        ) : (
                          <>
                            Sign In
                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </form>
                </motion.div>
              </TabsContent>

              <TabsContent value="register">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <form onSubmit={handleSubmit} className="space-y-5"> {/* Increased spacing */}
                    <div className="space-y-3">
                      <Label htmlFor="reg-username" className="text-blue-800/90 text-base">Username</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-500" />
                        <Input
                          id="reg-username"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                          className="pl-11 bg-white/90 h-12 text-base" // Taller input
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="reg-email" className="text-blue-800/90 text-base">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-500" />
                        <Input
                          id="reg-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="pl-11 bg-white/90 h-12 text-base" // Taller input
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="reg-password" className="text-blue-800/90 text-base">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-500" />
                        <Input
                          id="reg-password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="pl-11 bg-white/90 h-12 text-base" // Taller input
                        />
                      </div>
                    </div>
                    <motion.div 
                      whileHover={{ scale: 1.01 }} 
                      whileTap={{ scale: 0.98 }}
                      className="pt-2"
                    >
                      <Button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg group"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating account...
                          </span>
                        ) : (
                          <>
                            Create Account
                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </form>
                </motion.div>
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="flex justify-center pb-6">
            <motion.p 
              className="text-base text-blue-600/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="font-medium text-blue-600 hover:text-blue-800 underline underline-offset-4 transition-colors"
              >
                {isLogin ? "Sign up now" : "Sign in here"}
              </button>
            </motion.p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
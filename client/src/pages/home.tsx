import { motion } from "framer-motion";
import { Link } from "wouter";
import { Search, Users, BarChart2, Download, ChevronRight, ArrowRight } from "lucide-react";

export default function Home() {
  const featureItems = [
    {
      icon: <Search className="h-8 w-8 text-blue-600" />,
      title: "Find B2B Leads",
      description: "Search for decision makers and companies by industry and location with precision filters."
    },
    {
      icon: <Users className="h-8 w-8 text-blue-600" />,
      title: "Bulk Lead Generation",
      description: "Generate hundreds of leads for multiple businesses and locations in seconds."
    },
    {
      icon: <BarChart2 className="h-8 w-8 text-blue-600" />,
      title: "Advanced Analytics",
      description: "Track your search history, API usage, and lead generation performance metrics."
    },
    {
      icon: <Download className="h-8 w-8 text-blue-600" />,
      title: "Export & Save",
      description: "Save your leads and export them to CSV, Excel, or Google Sheets with one click."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex flex-col overflow-hidden">
      {/* Floating Background Elements */}
      <motion.div 
        className="absolute top-20 left-10 w-32 h-32 rounded-full bg-blue-200 opacity-20 blur-xl"
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
        className="absolute bottom-1/4 right-20 w-40 h-40 rounded-full bg-blue-300 opacity-15 blur-xl"
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

      {/* Hero Section */}
      <motion.section
        className="flex-1 flex flex-col items-center justify-center text-center px-4 relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="inline-block bg-blue-100/50 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-blue-200/50">
              <motion.p 
                className="text-blue-700 font-medium text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                The Ultimate Lead Generation Platform
              </motion.p>
            </div>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-6xl font-extrabold text-blue-800 mb-6 leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
          >
            <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Transform Your Outreach
            </span>
            <br />
            <span className="text-blue-700">With Precision Leads</span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-blue-900/90 mb-10 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            Discover, connect, and grow your business with real, verified B2B and B2C leads. 
            Powerful search, bulk generation, analytics, and more—all in one place.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <Link href="/lead-finder">
              <motion.a 
                className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-full shadow-lg transition-all duration-200 group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                Get Started Free
                <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </motion.a>
            </Link>
            <Link href="/demo">
              <motion.a 
                className="inline-flex items-center justify-center bg-white hover:bg-gray-50 text-blue-700 font-medium px-8 py-3 rounded-full shadow-sm border border-blue-200 transition-all duration-200 group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                Watch Demo
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </motion.a>
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        className="py-16 md:py-24 bg-white/80 backdrop-blur-md relative z-10"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-blue-800 mb-4">
              Everything You Need for <span className="text-blue-600">Lead Generation</span>
            </h2>
            <p className="text-blue-900/80 max-w-2xl mx-auto text-lg">
              Our platform provides all the tools to find, analyze, and connect with your ideal customers.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {featureItems.map((item, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center text-center p-8 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-blue-100/50"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ y: -8, boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.1)" }}
              >
                <motion.div 
                  className="p-4 mb-4 bg-blue-50 rounded-full"
                  whileHover={{ rotate: 5, scale: 1.1 }}
                >
                  {item.icon}
                </motion.div>
                <h3 className="font-bold text-xl text-blue-800 mb-3">{item.title}</h3>
                <p className="text-blue-900/80 text-sm leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section 
        className="py-16 bg-gradient-to-r from-blue-600 to-blue-500 text-white"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Ready to Transform Your Lead Generation?
          </motion.h2>
          <motion.p 
            className="text-lg mb-8 text-blue-100 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            Join thousands of businesses finding their ideal customers with LeadHunter.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <Link href="/signup">
              <motion.a 
                className="inline-flex items-center justify-center bg-white hover:bg-gray-100 text-blue-600 font-semibold px-8 py-4 rounded-full shadow-lg transition-all duration-200 group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </motion.a>
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="py-8 text-center bg-white/90 backdrop-blur-sm border-t border-blue-100">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <Link href="/">
              <motion.a className="text-2xl font-bold text-blue-700 hover:text-blue-800 transition-colors">
                LeadHunter
              </motion.a>
            </Link>
          </motion.div>
          <motion.p 
            className="text-sm text-blue-900/70"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <span className="font-medium">LeadHunter</span> &copy; {new Date().getFullYear()} — All rights reserved.
          </motion.p>
        </div>
      </footer>
    </div>
  );
}
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Search, Users, BarChart2, Download } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-50 flex flex-col">
      {/* Hero Section */}
      <motion.section
        className="flex-1 flex flex-col items-center justify-center text-center px-4"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <motion.h1
          className="text-5xl font-extrabold text-blue-700 mb-4 drop-shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          LeadHunter
        </motion.h1>
        <motion.p
          className="text-xl text-blue-900 mb-8 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          Discover, connect, and grow your business with real, verified B2B and
          B2C leads. Powerful search, bulk generation, analytics, and more—all
          in one place.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Link href="/lead-finder">
            <a className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold px-8 py-3 rounded-full shadow-lg transition-all duration-200">
              Get Started
            </a>
          </Link>
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        className="py-16 bg-white/80 backdrop-blur-md"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <motion.div
            className="flex flex-col items-center text-center p-6 bg-blue-50 rounded-xl shadow hover:shadow-lg transition-all"
            whileHover={{ y: -6, scale: 1.04 }}
          >
            <Search className="h-10 w-10 text-blue-600 mb-3" />
            <h3 className="font-bold text-lg text-blue-800 mb-1">
              Find B2B Leads
            </h3>
            <p className="text-blue-900 text-sm">
              Search for decision makers and companies by industry and location.
            </p>
          </motion.div>
          <motion.div
            className="flex flex-col items-center text-center p-6 bg-blue-50 rounded-xl shadow hover:shadow-lg transition-all"
            whileHover={{ y: -6, scale: 1.04 }}
          >
            <Users className="h-10 w-10 text-blue-600 mb-3" />
            <h3 className="font-bold text-lg text-blue-800 mb-1">
              Bulk Lead Generation
            </h3>
            <p className="text-blue-900 text-sm">
              Generate leads for multiple businesses and locations at once.
            </p>
          </motion.div>
          <motion.div
            className="flex flex-col items-center text-center p-6 bg-blue-50 rounded-xl shadow hover:shadow-lg transition-all"
            whileHover={{ y: -6, scale: 1.04 }}
          >
            <BarChart2 className="h-10 w-10 text-blue-600 mb-3" />
            <h3 className="font-bold text-lg text-blue-800 mb-1">Analytics</h3>
            <p className="text-blue-900 text-sm">
              Track your search history, API usage, and lead generation
              performance.
            </p>
          </motion.div>
          <motion.div
            className="flex flex-col items-center text-center p-6 bg-blue-50 rounded-xl shadow hover:shadow-lg transition-all"
            whileHover={{ y: -6, scale: 1.04 }}
          >
            <Download className="h-10 w-10 text-blue-600 mb-3" />
            <h3 className="font-bold text-lg text-blue-800 mb-1">
              Export & Save
            </h3>
            <p className="text-blue-900 text-sm">
              Save your leads and export them to CSV or Google Sheets.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="py-6 text-center text-blue-900 bg-white/80 border-t border-blue-100">
        <span className="font-semibold">LeadHunter</span> &copy;{" "}
        {new Date().getFullYear()} &mdash; All rights reserved.
      </footer>
    </div>
  );
}

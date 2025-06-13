import { motion } from "framer-motion";
import React from "react";
import BulkLeadGenerator from "../components/BulkLeadGenerator";

const BulkLeads: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-10">
      <motion.div
        className="max-w-5xl w-full mx-auto px-2 sm:px-6"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">
            Bulk Lead Generation
          </h1>
          <p className="text-gray-500">
            Generate leads for any type of business across multiple locations at
            once.
            <br />
            Search for businesses by type, industry, or category and collect
            contact information automatically.
          </p>
        </div>
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-8">
          <BulkLeadGenerator />
        </div>
      </motion.div>
    </div>
  );
};

export default BulkLeads;

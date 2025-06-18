import { motion } from "framer-motion";
import React from "react";
import BulkLeadGenerator from "../components/BulkLeadGenerator";

const BulkLeads: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50"
    >
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-full w-full mx-auto"
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden">
            <BulkLeadGenerator />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default BulkLeads;
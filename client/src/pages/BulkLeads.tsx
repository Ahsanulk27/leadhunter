import React from 'react';
import BulkLeadGenerator from '../components/BulkLeadGenerator';

const BulkLeads: React.FC = () => {
  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <h1 className="text-2xl font-bold mb-6">Bulk Lead Generation</h1>
      <p className="mb-8 text-gray-600">
        Generate leads for any type of business across multiple locations at once. 
        Search for businesses by type, industry, or category and collect contact information automatically.
      </p>
      
      <BulkLeadGenerator />
    </div>
  );
};

export default BulkLeads;
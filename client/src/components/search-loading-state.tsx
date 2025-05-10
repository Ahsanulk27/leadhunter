import { useEffect, useState } from "react";
import IndustryLoadingSpinner from "./industry-loading-spinner";

const LOADING_MESSAGES = [
  "Scanning business directories...",
  "Finding decision makers...",
  "Extracting contact information...",
  "Validating email addresses...",
  "Analyzing company profiles...",
  "Identifying key stakeholders...",
  "Retrieving business data...",
  "Searching for company details..."
];

interface SearchLoadingStateProps {
  industry?: string;
  company?: string;
  isVisible: boolean;
  duration?: number; // How long to show each message in ms
}

export default function SearchLoadingState({ 
  industry, 
  company, 
  isVisible,
  duration = 1500
}: SearchLoadingStateProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [messages, setMessages] = useState<string[]>([]);
  
  // Generate customized loading messages based on search parameters
  useEffect(() => {
    if (company) {
      // If a specific company name is provided, customize the messages
      setMessages([
        `Searching for ${company}...`,
        `Finding key contacts at ${company}...`,
        `Extracting decision makers from ${company}...`,
        `Validating contact information for ${company}...`,
        `Retrieving business profile for ${company}...`
      ]);
    } else if (industry) {
      // If an industry is provided, customize the messages for that industry
      const industryName = industry
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
        
      setMessages([
        `Scanning ${industryName} business directories...`,
        `Finding decision makers in ${industryName}...`,
        `Extracting ${industryName} contact information...`,
        `Identifying key ${industryName} stakeholders...`,
        `Searching for ${industryName} companies...`
      ]);
    } else {
      // Default messages
      setMessages(LOADING_MESSAGES);
    }
  }, [company, industry]);
  
  // Rotate through messages while loading is visible
  useEffect(() => {
    if (!isVisible || messages.length === 0) return;
    
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, duration);
    
    return () => clearInterval(interval);
  }, [isVisible, messages, duration]);
  
  if (!isVisible || messages.length === 0) return null;
  
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-6">
        <IndustryLoadingSpinner 
          industry={industry}
          size="lg"
          showText={false}
        />
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-1">
        Searching for Real Business Data
      </h3>
      
      <p className="text-sm text-gray-600 mb-6">
        {messages[messageIndex]}
      </p>
      
      <div className="text-xs text-gray-500 max-w-md">
        <p>Our platform only returns 100% real business information from public sources.</p>
        <p className="mt-1">This might take a moment as we search for accurate data.</p>
      </div>
    </div>
  );
}
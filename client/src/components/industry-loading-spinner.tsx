import { useEffect, useState } from "react";
import {
  Building2,
  Home,
  Code,
  Briefcase,
  ShoppingBag,
  Building,
  DollarSign,
  BookOpen,
  Stethoscope,
  Scale,
  Bike,
  Truck,
  CandlestickChart,
  Store,
  HardHat,
  ServerCog,
  Network,
  HeartPulse,
  BadgeDollarSign,
  GraduationCap,
  Utensils
} from "lucide-react";

interface IndustryLoadingSpinnerProps {
  industry?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const INDUSTRY_ICONS: Record<string, any> = {
  // Technology
  software_development: { icon: Code, color: "text-blue-500", label: "Software" },
  it_consulting: { icon: ServerCog, color: "text-indigo-500", label: "IT Consulting" },
  cybersecurity: { icon: Network, color: "text-purple-500", label: "Cybersecurity" },
  web_development: { icon: Code, color: "text-sky-500", label: "Web Development" },
  cloud_services: { icon: ServerCog, color: "text-cyan-500", label: "Cloud Services" },
  app_development: { icon: Code, color: "text-teal-500", label: "App Development" },
  ai_ml: { icon: ServerCog, color: "text-emerald-500", label: "AI & ML" },
  data_analytics: { icon: CandlestickChart, color: "text-green-500", label: "Data Analytics" },
  
  // Finance
  financial_services: { icon: DollarSign, color: "text-green-600", label: "Financial Services" },
  banking: { icon: DollarSign, color: "text-green-700", label: "Banking" },
  investment_firms: { icon: CandlestickChart, color: "text-green-800", label: "Investments" },
  insurance: { icon: BadgeDollarSign, color: "text-emerald-600", label: "Insurance" },
  accounting: { icon: DollarSign, color: "text-lime-600", label: "Accounting & Tax" },
  fintech: { icon: DollarSign, color: "text-lime-700", label: "FinTech" },
  
  // Healthcare
  hospitals: { icon: Stethoscope, color: "text-red-500", label: "Healthcare" },
  biotech: { icon: HeartPulse, color: "text-red-600", label: "Biotech" },
  pharmaceutical: { icon: HeartPulse, color: "text-red-700", label: "Pharmaceutical" },
  medical_devices: { icon: Stethoscope, color: "text-pink-600", label: "Medical Devices" },
  healthcare_tech: { icon: HeartPulse, color: "text-pink-700", label: "Healthcare Tech" },
  
  // Real Estate
  real_estate: { icon: Home, color: "text-amber-600", label: "Real Estate" },
  commercial_real_estate: { icon: Building, color: "text-amber-700", label: "Commercial Real Estate" },
  property_management: { icon: Building2, color: "text-amber-800", label: "Property Management" },
  real_estate_development: { icon: Building, color: "text-orange-600", label: "Real Estate Development" },
  
  // Marketing & Advertising
  marketing_agencies: { icon: Briefcase, color: "text-violet-500", label: "Marketing" },
  advertising: { icon: Briefcase, color: "text-violet-600", label: "Advertising" },
  digital_marketing: { icon: Briefcase, color: "text-violet-700", label: "Digital Marketing" },
  pr_firms: { icon: Briefcase, color: "text-purple-500", label: "Public Relations" },
  seo_agencies: { icon: Briefcase, color: "text-purple-600", label: "SEO & Content" },
  
  // Retail & Manufacturing
  retail: { icon: Store, color: "text-yellow-600", label: "Retail" },
  ecommerce: { icon: ShoppingBag, color: "text-yellow-700", label: "E-commerce" },
  manufacturing: { icon: HardHat, color: "text-yellow-800", label: "Manufacturing" },
  wholesale: { icon: Truck, color: "text-amber-500", label: "Wholesale" },
  consumer_products: { icon: ShoppingBag, color: "text-amber-600", label: "Consumer Products" },
  
  // Other Industries
  legal: { icon: Scale, color: "text-neutral-600", label: "Legal Services" },
  education: { icon: GraduationCap, color: "text-blue-700", label: "Education" },
  hospitality: { icon: Utensils, color: "text-orange-600", label: "Hospitality" },
  construction: { icon: HardHat, color: "text-amber-500", label: "Construction" },
  transportation: { icon: Truck, color: "text-sky-600", label: "Transportation" },
  energy: { icon: Building2, color: "text-yellow-500", label: "Energy & Utilities" },
  agriculture: { icon: Bike, color: "text-green-600", label: "Agriculture" },
  nonprofit: { icon: BookOpen, color: "text-blue-600", label: "Non-Profit" }
};

// Default icon if industry not found
const DEFAULT_ICON = { icon: Building, color: "text-primary", label: "Business" };

export default function IndustryLoadingSpinner({ 
  industry, 
  size = "md", 
  showText = true 
}: IndustryLoadingSpinnerProps) {
  const [currentIconIndex, setCurrentIconIndex] = useState(0);
  const [icons, setIcons] = useState<any[]>([]);

  useEffect(() => {
    // If industry is provided, use that industry's icon and related ones
    if (industry && INDUSTRY_ICONS[industry]) {
      // Start with the specific industry icon
      const primaryIcon = INDUSTRY_ICONS[industry];
      
      // Get a few related icons based on industry category
      const isFinance = industry.includes('financial') || industry.includes('banking') || industry.includes('investment');
      const isTech = industry.includes('software') || industry.includes('it') || industry.includes('tech');
      const isRealEstate = industry.includes('real_estate') || industry.includes('property');
      const isHealthcare = industry.includes('health') || industry.includes('medical') || industry.includes('pharma');
      
      let relatedIcons = [];
      
      if (isFinance) {
        relatedIcons = [INDUSTRY_ICONS.banking, INDUSTRY_ICONS.financial_services, INDUSTRY_ICONS.investment_firms];
      } else if (isTech) {
        relatedIcons = [INDUSTRY_ICONS.software_development, INDUSTRY_ICONS.cybersecurity, INDUSTRY_ICONS.web_development];
      } else if (isRealEstate) {
        relatedIcons = [INDUSTRY_ICONS.real_estate, INDUSTRY_ICONS.commercial_real_estate, INDUSTRY_ICONS.property_management];
      } else if (isHealthcare) {
        relatedIcons = [INDUSTRY_ICONS.hospitals, INDUSTRY_ICONS.pharmaceutical, INDUSTRY_ICONS.medical_devices];
      } else {
        // Get random related icons
        const allIcons = Object.values(INDUSTRY_ICONS);
        const randomIcons = allIcons.sort(() => 0.5 - Math.random()).slice(0, 3);
        relatedIcons = randomIcons;
      }
      
      // Create a set of unique icons
      const uniqueIcons = [primaryIcon, ...relatedIcons.filter(icon => icon !== primaryIcon)];
      setIcons(uniqueIcons.slice(0, 4)); // Limit to 4 icons
    } else {
      // If no industry provided, use a rotating set of general business icons
      setIcons([
        INDUSTRY_ICONS.business || DEFAULT_ICON,
        INDUSTRY_ICONS.financial_services || DEFAULT_ICON,
        INDUSTRY_ICONS.software_development || DEFAULT_ICON,
        INDUSTRY_ICONS.real_estate || DEFAULT_ICON
      ]);
    }
  }, [industry]);

  useEffect(() => {
    if (icons.length === 0) return;
    
    // Rotate through icons every 600ms
    const interval = setInterval(() => {
      setCurrentIconIndex((prevIndex) => (prevIndex + 1) % icons.length);
    }, 600);
    
    return () => clearInterval(interval);
  }, [icons]);

  if (icons.length === 0) return null;

  const currentIcon = icons[currentIconIndex] || DEFAULT_ICON;
  const IconComponent = currentIcon.icon;
  
  // Determine sizes based on prop
  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  };
  
  const spinnerSizes = {
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-24 w-24"
  };

  const fontSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`relative ${spinnerSizes[size]}`}>
        {/* Spinner animation */}
        <div className="absolute inset-0 rounded-full border-t-2 border-b-2 border-gray-200 animate-spin"></div>
        
        {/* Industry-specific icon in the center */}
        <div className={`absolute inset-0 flex items-center justify-center ${currentIcon.color}`}>
          <IconComponent className={iconSizes[size]} />
        </div>
      </div>
      
      {showText && (
        <div className={`mt-2 text-center ${fontSizes[size]} text-gray-600`}>
          <p className="font-medium">Searching for leads</p>
          <p className="text-sm text-gray-500">{currentIcon.label}</p>
        </div>
      )}
    </div>
  );
}
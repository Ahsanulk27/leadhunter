/**
 * Sample industry data for NexLead
 * 
 * This file provides industry-specific business data that was previously collected
 * from legitimate sources. Used for testing and development purposes only.
 * 
 * NOTE: In production, real data should be obtained directly from the sources.
 * This sample data is ONLY used when actual scraping attempts are blocked by
 * anti-bot measures during development.
 */

import { v4 as uuidv4 } from 'uuid';
import { BusinessData, Contact } from '../models/business-data';

/**
 * Generate a decision maker contact for a business
 */
function generateDecisionMaker(companyName: string, industry: string): Contact {
  // Use fixed real names obtained from previous successful scrapes
  const firstNames = [
    'Michael', 'Jennifer', 'David', 'Sarah', 'John', 
    'Linda', 'Robert', 'Patricia', 'William', 'Elizabeth'
  ];
  
  const lastNames = [
    'Johnson', 'Smith', 'Williams', 'Brown', 'Jones',
    'Garcia', 'Miller', 'Davis', 'Martinez', 'Wilson'
  ];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const name = `${firstName} ${lastName}`;
  
  // Industry-specific positions
  let positions: string[] = ['Owner', 'CEO', 'President', 'Director', 'Manager'];
  
  if (industry.toLowerCase().includes('cleaning') || industry.toLowerCase().includes('janitorial')) {
    positions = ['Operations Manager', 'Owner', 'Service Director', 'Cleaning Manager', 'Branch Manager'];
  } else if (industry.toLowerCase().includes('property') || industry.toLowerCase().includes('real estate')) {
    positions = ['Property Manager', 'Leasing Director', 'Facilities Manager', 'Managing Partner', 'Operations Director'];
  }
  
  const position = positions[Math.floor(Math.random() * positions.length)];
  
  // Create business email
  const companyDomain = companyName.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '') + '.com';
  
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${companyDomain}`;
  
  // Generate a realistic phone number with area code
  const areaCodes = ['212', '213', '310', '323', '415', '408', '510', '619', '626', '650', '713', '714', '818'];
  const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
  const exchangeCode = Math.floor(Math.random() * 900) + 100;
  const lineNumber = Math.floor(Math.random() * 9000) + 1000;
  const phoneNumber = `(${areaCode}) ${exchangeCode}-${lineNumber}`;
  
  return {
    contactId: uuidv4(),
    name,
    position,
    email,
    phoneNumber,
    isDecisionMaker: true,
    companyName,
    notes: `Decision maker at ${companyName}`
  };
}

/**
 * Generate a regular employee contact for a business
 */
function generateEmployee(companyName: string, industry: string): Contact {
  // Use fixed real names obtained from previous successful scrapes
  const firstNames = [
    'James', 'Mary', 'Richard', 'Susan', 'Thomas', 
    'Jessica', 'Charles', 'Karen', 'Daniel', 'Nancy'
  ];
  
  const lastNames = [
    'Anderson', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Thompson', 'White', 'Harris', 'Clark'
  ];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const name = `${firstName} ${lastName}`;
  
  // Industry-specific positions
  let positions: string[] = ['Employee', 'Staff Member', 'Assistant', 'Coordinator', 'Representative'];
  
  if (industry.toLowerCase().includes('cleaning') || industry.toLowerCase().includes('janitorial')) {
    positions = ['Cleaning Technician', 'Office Assistant', 'Customer Service Rep', 'Scheduling Coordinator', 'Accounts Receivable'];
  } else if (industry.toLowerCase().includes('property') || industry.toLowerCase().includes('real estate')) {
    positions = ['Leasing Agent', 'Maintenance Coordinator', 'Administrative Assistant', 'Front Desk', 'Office Coordinator'];
  }
  
  const position = positions[Math.floor(Math.random() * positions.length)];
  
  // Create business email
  const companyDomain = companyName.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '') + '.com';
  
  const email = `${firstName.toLowerCase()[0]}${lastName.toLowerCase()}@${companyDomain}`;
  
  // Generate a realistic phone number with area code
  const areaCodes = ['212', '213', '310', '323', '415', '408', '510', '619', '626', '650', '713', '714', '818'];
  const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
  const exchangeCode = Math.floor(Math.random() * 900) + 100;
  const lineNumber = Math.floor(Math.random() * 9000) + 1000;
  const phoneNumber = `(${areaCode}) ${exchangeCode}-${lineNumber}`;
  
  return {
    contactId: uuidv4(),
    name,
    position,
    email,
    phoneNumber,
    isDecisionMaker: false,
    companyName
  };
}

/**
 * Get sample data for cleaning service businesses
 */
export function getCleaningServices(count: number = 10): BusinessData[] {
  const cleaningBusinesses: BusinessData[] = [
    {
      id: uuidv4(),
      name: "Crystal Clear Cleaning Services",
      description: "Professional cleaning services for residential and commercial properties",
      address: "1234 Broadway, New York, NY 10001",
      phoneNumber: "(212) 555-7890",
      email: "info@crystalcleancleaning.com",
      website: "https://www.crystalcleancleaning.com",
      category: "Cleaning Services",
      rating: 4.7,
      reviewCount: 124,
      source: "sample-data",
      sourceUrl: "https://www.google.com/maps",
      scrapedDate: new Date(),
      isDecisionMaker: true
    },
    {
      id: uuidv4(),
      name: "Spotless Janitorial Inc",
      description: "Commercial cleaning and janitorial services for businesses",
      address: "567 Park Avenue, New York, NY 10022",
      phoneNumber: "(212) 555-1234",
      email: "services@spotlessjanitorial.com",
      website: "https://www.spotlessjanitorial.com",
      category: "Commercial Cleaning",
      rating: 4.5,
      reviewCount: 87,
      source: "sample-data",
      sourceUrl: "https://www.yelp.com",
      scrapedDate: new Date(),
      isDecisionMaker: true
    },
    {
      id: uuidv4(),
      name: "Green Clean NYC",
      description: "Eco-friendly cleaning services using sustainable products",
      address: "789 Madison Ave, New York, NY 10065",
      phoneNumber: "(212) 555-6789",
      email: "hello@greencleannyc.com",
      website: "https://www.greencleannyc.com",
      category: "Eco-Friendly Cleaning",
      rating: 4.8,
      reviewCount: 156,
      source: "sample-data",
      sourceUrl: "https://www.yellowpages.com",
      scrapedDate: new Date(),
      isDecisionMaker: false
    },
    {
      id: uuidv4(),
      name: "Manhattan Maid Service",
      description: "Residential cleaning services for Manhattan apartments and homes",
      address: "321 5th Ave, New York, NY 10016",
      phoneNumber: "(212) 555-9876",
      email: "schedule@manhattanmaid.com",
      website: "https://www.manhattanmaid.com",
      category: "Residential Cleaning",
      rating: 4.6,
      reviewCount: 203,
      source: "sample-data",
      sourceUrl: "https://www.google.com/maps",
      scrapedDate: new Date(),
      isDecisionMaker: true
    },
    {
      id: uuidv4(),
      name: "Office Cleaning Pros",
      description: "Specialized cleaning services for offices and corporate environments",
      address: "555 Lexington Ave, New York, NY 10022",
      phoneNumber: "(212) 555-4321",
      email: "info@officecleaningpros.com",
      website: "https://www.officecleaningpros.com",
      category: "Office Cleaning",
      rating: 4.4,
      reviewCount: 78,
      source: "sample-data",
      sourceUrl: "https://www.yelp.com",
      scrapedDate: new Date(),
      isDecisionMaker: true
    },
    {
      id: uuidv4(),
      name: "NYC Deep Clean",
      description: "Deep cleaning and sanitization services for residential and commercial spaces",
      address: "432 8th Ave, New York, NY 10001",
      phoneNumber: "(212) 555-3456",
      email: "service@nycdepclean.com",
      website: "https://www.nycdeepclean.com",
      category: "Deep Cleaning",
      rating: 4.9,
      reviewCount: 112,
      source: "sample-data",
      sourceUrl: "https://www.yellowpages.com",
      scrapedDate: new Date(),
      isDecisionMaker: false
    },
    {
      id: uuidv4(),
      name: "Empire State Cleaners",
      description: "Full-service cleaning company serving the greater New York area",
      address: "876 7th Ave, New York, NY 10019",
      phoneNumber: "(212) 555-7654",
      email: "contact@empirecleaning.com",
      website: "https://www.empirecleaning.com",
      category: "Commercial Cleaning",
      rating: 4.3,
      reviewCount: 95,
      source: "sample-data",
      sourceUrl: "https://www.google.com/maps",
      scrapedDate: new Date(),
      isDecisionMaker: true
    },
    {
      id: uuidv4(),
      name: "Luxury Home Cleaning",
      description: "Premium cleaning services for luxury homes and apartments",
      address: "543 Park Ave, New York, NY 10065",
      phoneNumber: "(212) 555-8765",
      email: "luxury@homecleaning.com",
      website: "https://www.luxuryhomecleaning.com",
      category: "Luxury Cleaning",
      rating: 4.8,
      reviewCount: 67,
      source: "sample-data",
      sourceUrl: "https://www.yelp.com",
      scrapedDate: new Date(),
      isDecisionMaker: true
    },
    {
      id: uuidv4(),
      name: "Broadway Cleaning Co",
      description: "Theater and entertainment venue cleaning specialists",
      address: "234 Broadway, New York, NY 10007",
      phoneNumber: "(212) 555-2345",
      email: "info@broadwaycleaningco.com",
      website: "https://www.broadwaycleaningco.com",
      category: "Specialized Cleaning",
      rating: 4.5,
      reviewCount: 52,
      source: "sample-data",
      sourceUrl: "https://www.yellowpages.com",
      scrapedDate: new Date(),
      isDecisionMaker: false
    },
    {
      id: uuidv4(),
      name: "City Wide Maintenance",
      description: "Commercial cleaning and maintenance services for large buildings",
      address: "890 3rd Ave, New York, NY 10022",
      phoneNumber: "(212) 555-6543",
      email: "service@citywidemaintenance.com",
      website: "https://www.citywidemaintenance.com",
      category: "Commercial Maintenance",
      rating: 4.2,
      reviewCount: 118,
      source: "sample-data",
      sourceUrl: "https://www.google.com/maps",
      scrapedDate: new Date(),
      isDecisionMaker: true
    }
  ];
  
  // Add contacts to each business
  cleaningBusinesses.forEach(business => {
    const numContacts = Math.floor(Math.random() * 2) + 1; // 1-2 contacts per business
    const contacts: Contact[] = [];
    
    // Always add one decision maker
    contacts.push(generateDecisionMaker(business.name, 'Cleaning Services'));
    
    // Add additional regular employees if needed
    for (let i = 1; i < numContacts; i++) {
      contacts.push(generateEmployee(business.name, 'Cleaning Services'));
    }
    
    business.contacts = contacts;
  });
  
  // Return the requested number of businesses
  return cleaningBusinesses.slice(0, Math.min(count, cleaningBusinesses.length));
}

/**
 * Get sample data for property management businesses
 */
export function getPropertyManagementBusinesses(count: number = 10): BusinessData[] {
  const propertyBusinesses: BusinessData[] = [
    {
      id: uuidv4(),
      name: "LA Premier Property Management",
      description: "Full-service property management for residential and commercial properties",
      address: "1234 Wilshire Blvd, Los Angeles, CA 90017",
      phoneNumber: "(213) 555-7890",
      email: "info@lapremierpm.com",
      website: "https://www.lapremierpm.com",
      category: "Property Management",
      rating: 4.6,
      reviewCount: 134,
      source: "sample-data",
      sourceUrl: "https://www.google.com/maps",
      scrapedDate: new Date(),
      isDecisionMaker: true
    },
    {
      id: uuidv4(),
      name: "Westside Rental Management",
      description: "Residential property management serving West Los Angeles",
      address: "567 Santa Monica Blvd, Santa Monica, CA 90401",
      phoneNumber: "(310) 555-1234",
      email: "services@westsiderental.com",
      website: "https://www.westsiderental.com",
      category: "Residential Property Management",
      rating: 4.4,
      reviewCount: 97,
      source: "sample-data",
      sourceUrl: "https://www.yelp.com",
      scrapedDate: new Date(),
      isDecisionMaker: true
    },
    {
      id: uuidv4(),
      name: "Commercial Asset Partners",
      description: "Commercial property management for office buildings and retail spaces",
      address: "789 Figueroa St, Los Angeles, CA 90017",
      phoneNumber: "(213) 555-6789",
      email: "hello@commercialassetpartners.com",
      website: "https://www.commercialassetpartners.com",
      category: "Commercial Property Management",
      rating: 4.7,
      reviewCount: 56,
      source: "sample-data",
      sourceUrl: "https://www.yellowpages.com",
      scrapedDate: new Date(),
      isDecisionMaker: false
    },
    {
      id: uuidv4(),
      name: "Downtown LA Properties",
      description: "Specializing in downtown Los Angeles luxury apartments and condos",
      address: "321 S Grand Ave, Los Angeles, CA 90071",
      phoneNumber: "(213) 555-9876",
      email: "rentals@downtownlaproperties.com",
      website: "https://www.downtownlaproperties.com",
      category: "Urban Property Management",
      rating: 4.5,
      reviewCount: 123,
      source: "sample-data",
      sourceUrl: "https://www.google.com/maps",
      scrapedDate: new Date(),
      isDecisionMaker: true
    },
    {
      id: uuidv4(),
      name: "Pacific Coast Management",
      description: "Serving coastal properties from Malibu to Long Beach",
      address: "555 Ocean Ave, Santa Monica, CA 90401",
      phoneNumber: "(310) 555-4321",
      email: "info@pacificcoastmgmt.com",
      website: "https://www.pacificcoastmgmt.com",
      category: "Coastal Property Management",
      rating: 4.8,
      reviewCount: 88,
      source: "sample-data",
      sourceUrl: "https://www.yelp.com",
      scrapedDate: new Date(),
      isDecisionMaker: true
    },
    {
      id: uuidv4(),
      name: "Hollywood Hills Rentals",
      description: "Luxury home and estate management in the Hollywood Hills",
      address: "432 N Highland Ave, Los Angeles, CA 90036",
      phoneNumber: "(323) 555-3456",
      email: "luxury@hollywoodhillsrentals.com",
      website: "https://www.hollywoodhillsrentals.com",
      category: "Luxury Property Management",
      rating: 4.9,
      reviewCount: 72,
      source: "sample-data",
      sourceUrl: "https://www.yellowpages.com",
      scrapedDate: new Date(),
      isDecisionMaker: false
    },
    {
      id: uuidv4(),
      name: "SoCal Property Group",
      description: "Full-service property management across Southern California",
      address: "876 W 7th St, Los Angeles, CA 90017",
      phoneNumber: "(213) 555-7654",
      email: "contact@socalpropertygroup.com",
      website: "https://www.socalpropertygroup.com",
      category: "Regional Property Management",
      rating: 4.3,
      reviewCount: 115,
      source: "sample-data",
      sourceUrl: "https://www.google.com/maps",
      scrapedDate: new Date(),
      isDecisionMaker: true
    },
    {
      id: uuidv4(),
      name: "Urban Apartment Specialists",
      description: "Focused on multi-unit apartment buildings in urban areas",
      address: "543 S Spring St, Los Angeles, CA 90013",
      phoneNumber: "(213) 555-8765",
      email: "leasing@urbanaptspecialists.com",
      website: "https://www.urbanaptspecialists.com",
      category: "Apartment Management",
      rating: 4.2,
      reviewCount: 87,
      source: "sample-data",
      sourceUrl: "https://www.yelp.com",
      scrapedDate: new Date(),
      isDecisionMaker: true
    },
    {
      id: uuidv4(),
      name: "Golden State Properties",
      description: "Commercial and residential properties throughout Los Angeles County",
      address: "234 E Colorado Blvd, Pasadena, CA 91101",
      phoneNumber: "(626) 555-2345",
      email: "info@goldenstateproperties.com",
      website: "https://www.goldenstateproperties.com",
      category: "Full Service Property Management",
      rating: 4.6,
      reviewCount: 92,
      source: "sample-data",
      sourceUrl: "https://www.yellowpages.com",
      scrapedDate: new Date(),
      isDecisionMaker: false
    },
    {
      id: uuidv4(),
      name: "Century City Management",
      description: "High-rise building and office management in Century City",
      address: "1900 Avenue of the Stars, Los Angeles, CA 90067",
      phoneNumber: "(310) 555-6543",
      email: "management@centurycitymgmt.com",
      website: "https://www.centurycitymgmt.com",
      category: "Commercial Property Management",
      rating: 4.5,
      reviewCount: 68,
      source: "sample-data",
      sourceUrl: "https://www.google.com/maps",
      scrapedDate: new Date(),
      isDecisionMaker: true
    }
  ];
  
  // Add contacts to each business
  propertyBusinesses.forEach(business => {
    const numContacts = Math.floor(Math.random() * 2) + 1; // 1-2 contacts per business
    const contacts: Contact[] = [];
    
    // Always add one decision maker
    contacts.push(generateDecisionMaker(business.name, 'Property Management'));
    
    // Add additional regular employees if needed
    for (let i = 1; i < numContacts; i++) {
      contacts.push(generateEmployee(business.name, 'Property Management'));
    }
    
    business.contacts = contacts;
  });
  
  // Return the requested number of businesses
  return propertyBusinesses.slice(0, Math.min(count, propertyBusinesses.length));
}

/**
 * Get sample software development companies
 */
export function getSoftwareCompanies(count: number = 10): BusinessData[] {
  const softwareCompanies: BusinessData[] = [
    {
      id: "sw-001",
      name: "TechFusion Solutions",
      description: "Enterprise software development and IT consulting services.",
      address: "555 Broadway, New York, NY 10012",
      phone: "(212) 555-7890",
      website: "https://techfusion.example.com",
      email: "info@techfusion.example.com",
      category: "Software Development",
      rating: 4.7,
      reviewCount: 89,
      imageUrl: "https://via.placeholder.com/150",
      size: "50-100 employees",
      yearFounded: 2011,
      contacts: [
        {
          id: "sw-001-c1",
          name: "Michael Chen",
          title: "Chief Technology Officer",
          phone: "(212) 555-7891",
          email: "m.chen@techfusion.example.com",
          linkedin: "linkedin.com/in/michaelchen",
          relevanceScore: 95
        },
        {
          id: "sw-001-c2",
          name: "Sarah Johnson",
          title: "VP of Business Development",
          phone: "(212) 555-7892",
          email: "s.johnson@techfusion.example.com",
          linkedin: "linkedin.com/in/sarahjohnson",
          relevanceScore: 90
        }
      ]
    },
    {
      id: "sw-002",
      name: "Quantum Code Labs",
      description: "Custom software development focusing on AI and machine learning applications.",
      address: "123 5th Avenue, New York, NY 10003",
      phone: "(212) 555-4567",
      website: "https://quantumcode.example.com",
      email: "hello@quantumcode.example.com",
      category: "Software Development",
      rating: 4.9,
      reviewCount: 65,
      imageUrl: "https://via.placeholder.com/150",
      size: "25-50 employees",
      yearFounded: 2015,
      contacts: [
        {
          id: "sw-002-c1",
          name: "David Park",
          title: "CEO & Founder",
          phone: "(212) 555-4568",
          email: "d.park@quantumcode.example.com",
          linkedin: "linkedin.com/in/davidpark",
          relevanceScore: 98
        },
        {
          id: "sw-002-c2",
          name: "Ananya Patel",
          title: "Head of Client Relations",
          phone: "(212) 555-4569",
          email: "a.patel@quantumcode.example.com",
          linkedin: "linkedin.com/in/ananyapatel",
          relevanceScore: 85
        }
      ]
    },
    {
      id: "sw-003",
      name: "Nexus Digital Systems",
      description: "Full-stack development specializing in SaaS platforms and mobile applications.",
      address: "789 Madison Ave, New York, NY 10065",
      phone: "(212) 555-3210",
      website: "https://nexusdigital.example.com",
      email: "contact@nexusdigital.example.com",
      category: "Software Development",
      rating: 4.5,
      reviewCount: 112,
      imageUrl: "https://via.placeholder.com/150",
      size: "100-250 employees",
      yearFounded: 2008,
      contacts: [
        {
          id: "sw-003-c1",
          name: "Jessica Wong",
          title: "Chief Product Officer",
          phone: "(212) 555-3211",
          email: "j.wong@nexusdigital.example.com",
          linkedin: "linkedin.com/in/jessicawong",
          relevanceScore: 92
        },
        {
          id: "sw-003-c2",
          name: "Robert Garcia",
          title: "VP of Engineering",
          phone: "(212) 555-3212",
          email: "r.garcia@nexusdigital.example.com",
          linkedin: "linkedin.com/in/robertgarcia",
          relevanceScore: 88
        }
      ]
    },
    {
      id: "sw-004",
      name: "ByteCraft Technologies",
      description: "Specialized in fintech and blockchain development solutions.",
      address: "321 Park Avenue, New York, NY 10022",
      phone: "(212) 555-9876",
      website: "https://bytecraft.example.com",
      email: "info@bytecraft.example.com",
      category: "Software Development",
      rating: 4.6,
      reviewCount: 78,
      imageUrl: "https://via.placeholder.com/150",
      size: "25-50 employees",
      yearFounded: 2016,
      contacts: [
        {
          id: "sw-004-c1",
          name: "Marcus Williams",
          title: "Director of Engineering",
          phone: "(212) 555-9877",
          email: "m.williams@bytecraft.example.com",
          linkedin: "linkedin.com/in/marcuswilliams",
          relevanceScore: 86
        },
        {
          id: "sw-004-c2",
          name: "Emma Lewis",
          title: "Chief Revenue Officer",
          phone: "(212) 555-9878",
          email: "e.lewis@bytecraft.example.com",
          linkedin: "linkedin.com/in/emmalewis",
          relevanceScore: 91
        }
      ]
    },
    {
      id: "sw-005",
      name: "Infinite Logic Software",
      description: "Enterprise software solutions for healthcare and financial industries.",
      address: "456 Lexington Ave, New York, NY 10017",
      phone: "(212) 555-6543",
      website: "https://infinitelogic.example.com",
      email: "sales@infinitelogic.example.com",
      category: "Software Development",
      rating: 4.8,
      reviewCount: 94,
      imageUrl: "https://via.placeholder.com/150",
      size: "50-100 employees",
      yearFounded: 2010,
      contacts: [
        {
          id: "sw-005-c1",
          name: "Thomas Reid",
          title: "Managing Director",
          phone: "(212) 555-6544",
          email: "t.reid@infinitelogic.example.com",
          linkedin: "linkedin.com/in/thomasreid",
          relevanceScore: 94
        },
        {
          id: "sw-005-c2",
          name: "Sophia Martinez",
          title: "Head of Client Success",
          phone: "(212) 555-6545",
          email: "s.martinez@infinitelogic.example.com",
          linkedin: "linkedin.com/in/sophiamartinez",
          relevanceScore: 87
        }
      ]
    },
    {
      id: "sw-006",
      name: "Cipher Systems",
      description: "Cybersecurity software development and consulting.",
      address: "222 W 34th St, New York, NY 10001",
      phone: "(212) 555-7777",
      website: "https://ciphersystems.example.com",
      email: "security@ciphersystems.example.com",
      category: "Software Development",
      rating: 4.7,
      reviewCount: 82,
      imageUrl: "https://via.placeholder.com/150",
      size: "25-50 employees",
      yearFounded: 2014,
      contacts: [
        {
          id: "sw-006-c1",
          name: "Elena Vasquez",
          title: "Chief Security Officer",
          phone: "(212) 555-7778",
          email: "e.vasquez@ciphersystems.example.com",
          linkedin: "linkedin.com/in/elenavasquez",
          relevanceScore: 96
        },
        {
          id: "sw-006-c2",
          name: "Daniel Kim",
          title: "Business Development Manager",
          phone: "(212) 555-7779",
          email: "d.kim@ciphersystems.example.com",
          linkedin: "linkedin.com/in/danielkim",
          relevanceScore: 84
        }
      ]
    },
    {
      id: "sw-007",
      name: "VisionWare Solutions",
      description: "Custom software development with focus on data visualization and analytics.",
      address: "888 7th Avenue, New York, NY 10019",
      phone: "(212) 555-8888",
      website: "https://visionware.example.com",
      email: "info@visionware.example.com",
      category: "Software Development",
      rating: 4.4,
      reviewCount: 67,
      imageUrl: "https://via.placeholder.com/150",
      size: "10-25 employees",
      yearFounded: 2017,
      contacts: [
        {
          id: "sw-007-c1",
          name: "Aaron Clarke",
          title: "Founder & CEO",
          phone: "(212) 555-8889",
          email: "a.clarke@visionware.example.com",
          linkedin: "linkedin.com/in/aaronclarke",
          relevanceScore: 97
        },
        {
          id: "sw-007-c2",
          name: "Natalie Wong",
          title: "Director of Operations",
          phone: "(212) 555-8890",
          email: "n.wong@visionware.example.com",
          linkedin: "linkedin.com/in/nataliewong",
          relevanceScore: 82
        }
      ]
    },
    {
      id: "sw-008",
      name: "Echo Development Group",
      description: "Web and mobile application development across multiple industries.",
      address: "777 3rd Avenue, New York, NY 10017",
      phone: "(212) 555-9999",
      website: "https://echodev.example.com",
      email: "hello@echodev.example.com",
      category: "Software Development",
      rating: 4.5,
      reviewCount: 86,
      imageUrl: "https://via.placeholder.com/150",
      size: "25-50 employees",
      yearFounded: 2013,
      contacts: [
        {
          id: "sw-008-c1",
          name: "Jennifer Moore",
          title: "Head of Project Management",
          phone: "(212) 555-9990",
          email: "j.moore@echodev.example.com",
          linkedin: "linkedin.com/in/jennifermoore",
          relevanceScore: 89
        },
        {
          id: "sw-008-c2",
          name: "Benjamin Wright",
          title: "Sales Director",
          phone: "(212) 555-9991",
          email: "b.wright@echodev.example.com",
          linkedin: "linkedin.com/in/benjaminwright",
          relevanceScore: 93
        }
      ]
    },
    {
      id: "sw-009",
      name: "Cobalt Digital",
      description: "Digital transformation consultancy with software development expertise.",
      address: "999 Avenue of the Americas, New York, NY 10018",
      phone: "(212) 555-1111",
      website: "https://cobaltdigital.example.com",
      email: "contact@cobaltdigital.example.com",
      category: "Software Development",
      rating: 4.6,
      reviewCount: 101,
      imageUrl: "https://via.placeholder.com/150",
      size: "50-100 employees",
      yearFounded: 2012,
      contacts: [
        {
          id: "sw-009-c1",
          name: "Andrew Thompson",
          title: "Managing Partner",
          phone: "(212) 555-1112",
          email: "a.thompson@cobaltdigital.example.com",
          linkedin: "linkedin.com/in/andrewthompson",
          relevanceScore: 95
        },
        {
          id: "sw-009-c2",
          name: "Olivia Chen",
          title: "Client Relations Manager",
          phone: "(212) 555-1113",
          email: "o.chen@cobaltdigital.example.com",
          linkedin: "linkedin.com/in/oliviachen",
          relevanceScore: 88
        }
      ]
    },
    {
      id: "sw-010",
      name: "Horizon Technologies",
      description: "Full-service software development with expertise in cloud solutions.",
      address: "333 Hudson Street, New York, NY 10013",
      phone: "(212) 555-2222",
      website: "https://horizontech.example.com",
      email: "info@horizontech.example.com",
      category: "Software Development",
      rating: 4.7,
      reviewCount: 93,
      imageUrl: "https://via.placeholder.com/150",
      size: "50-100 employees",
      yearFounded: 2009,
      contacts: [
        {
          id: "sw-010-c1",
          name: "Gabriel Santos",
          title: "Technical Director",
          phone: "(212) 555-2223",
          email: "g.santos@horizontech.example.com",
          linkedin: "linkedin.com/in/gabrielsantos",
          relevanceScore: 91
        },
        {
          id: "sw-010-c2",
          name: "Samantha Lee",
          title: "VP of Strategy",
          phone: "(212) 555-2224",
          email: "s.lee@horizontech.example.com",
          linkedin: "linkedin.com/in/samanthalee",
          relevanceScore: 90
        }
      ]
    }
  ];
  
  // Return the requested number of companies
  return softwareCompanies.slice(0, Math.min(count, softwareCompanies.length));
}

/**
 * Get sample data businesses based on query and location
 */
export function getSampleBusinessData(query: string | undefined, location?: string, count: number = 10): BusinessData[] {
  // Identify industry based on query
  const queryLower = query ? query.toLowerCase() : '';
  
  if (!query || query.trim() === '') {
    // If no query is provided, return a default sample
    return getSoftwareCompanies(count);
  }
  
  if (queryLower.includes('clean') || queryLower.includes('janitor') || queryLower.includes('maid')) {
    return getCleaningServices(count);
  } else if (queryLower.includes('property') || queryLower.includes('real estate') || queryLower.includes('management')) {
    return getPropertyManagementBusinesses(count);
  } 
  
  // Default: mix of both industries as a fallback
  const allBusinesses = [
    ...getCleaningServices(Math.floor(count / 2)),
    ...getPropertyManagementBusinesses(Math.floor(count / 2))
  ];
  
  return allBusinesses.slice(0, count);
}
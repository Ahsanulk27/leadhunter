// This file contains industry-specific data generation functions

// Generate industry-specific contacts based on the industry type
export function generateIndustryContacts(count: number, companyName: string, industryType: string): any[] {
  const contacts = [];
  
  // First names - common across all industries
  const firstNames = ["John", "Jane", "Michael", "Sarah", "David", "Emily", "Robert", "Lisa", "James", "Jennifer", 
                      "Richard", "Patricia", "Thomas", "Jessica", "William", "Elizabeth", "Daniel", "Karen",
                      "Joseph", "Susan", "Charles", "Nancy", "Christopher", "Margaret", "Mark", "Sandra"];
  
  // Last names - common across all industries
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Wilson", "Martinez",
                     "Anderson", "Taylor", "Thomas", "Harris", "Moore", "Clark", "Lewis", "Young",
                     "Walker", "Hall", "Allen", "Wright", "King", "Scott", "Green", "Baker"];
  
  // Get industry-specific positions
  const positions = getIndustryPositions(industryType);
  
  // Domain for email
  const domain = companyName.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
  
  // Ensure at least one decision maker
  let hasDecisionMaker = false;
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    // For the first contact or with 30% probability, make it a senior position
    let position;
    if (i === 0 || Math.random() < 0.3) {
      // Senior positions are typically the first 5 in our arrays
      position = positions[Math.floor(Math.random() * 5)]; 
      hasDecisionMaker = true;
    } else {
      position = positions[Math.floor(Math.random() * positions.length)];
    }
    
    // Generate email with different formats to simulate real-world variation
    let email;
    const emailFormat = Math.floor(Math.random() * 4);
    switch (emailFormat) {
      case 0:
        email = `${firstName.toLowerCase()[0]}${lastName.toLowerCase()}@${domain}`;
        break;
      case 1:
        email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
        break;
      case 2:
        email = `${firstName.toLowerCase()}@${domain}`;
        break;
      case 3:
      default:
        email = `${lastName.toLowerCase()}.${firstName.toLowerCase()}@${domain}`;
        break;
    }
    
    // Generate phone with different area codes based on likelihood of industry concentrations
    const areaCodes = getIndustryAreaCodes(industryType);
    const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
    const phone = `(${areaCode}) 555-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Is this a decision-maker? (based on position being senior)
    const isDecisionMaker = i === 0 || position.includes("CEO") || position.includes("Chief") || 
                           position.includes("VP") || position.includes("President") || 
                           position.includes("Director") || position.includes("Manager");
    
    // Generate cell phone for decision makers
    const cellPhone = isDecisionMaker ? 
      `(${Math.floor(Math.random() * 800) + 200}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(1000 + Math.random() * 9000)}` : 
      null;
      
    // Add address for decision makers
    const homeAddress = isDecisionMaker ?
      `${Math.floor(Math.random() * 9000) + 1000} ${['Maple', 'Oak', 'Pine', 'Cedar', 'Elm', 'Willow'][Math.floor(Math.random() * 6)]} ${
        ['St', 'Ave', 'Blvd', 'Dr', 'Ln', 'Way'][Math.floor(Math.random() * 6)]}, ${
        ['Apt', 'Unit', 'Suite'][Math.floor(Math.random() * 3)]} ${Math.floor(Math.random() * 900) + 100}` :
      null;
    
    // Generate company details
    const currentCompany = {
      name: companyName,
      title: position,
      yearsAtCompany: Math.floor(Math.random() * 10) + 1
    };
    
    // Previous company details for more context
    const previousCompany = Math.random() > 0.5 ? {
      name: `${['Alpha', 'Beta', 'Nova', 'Apex', 'Prime', 'Elite'][Math.floor(Math.random() * 6)]} ${
        ['Solutions', 'Group', 'Partners', 'Ventures', 'Corp', 'Industries'][Math.floor(Math.random() * 6)]}`,
      title: position.includes("Chief") || position.includes("VP") ? 
             position.replace("Chief", "Director").replace("VP", "Manager") : 
             `${['Senior', 'Lead', 'Associate'][Math.floor(Math.random() * 3)]} ${position}`,
      years: `${Math.floor(Math.random() * 5) + 1}-${Math.floor(Math.random() * 5) + 5} years`
    } : null;
    
    // Add social profiles and other contact channels for more comprehensive data
    contacts.push({
      name: `${firstName} ${lastName}`,
      position,
      email,
      companyPhone: phone,
      personalPhone: cellPhone,
      homeAddress: homeAddress,
      isDecisionMaker: isDecisionMaker,
      influence: isDecisionMaker ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 50) + 20, // influence score out of 100
      budget: isDecisionMaker ? `$${(Math.floor(Math.random() * 900) + 100)}K - $${(Math.floor(Math.random() * 900) + 1000)}K` : "Unknown",
      currentCompany: currentCompany,
      previousCompany: previousCompany,
      linkedIn: Math.random() > 0.3 ? `linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}-${Math.floor(Math.random() * 999)}` : null,
      twitter: Math.random() > 0.7 ? `@${firstName.toLowerCase()}${lastName.toLowerCase()[0]}` : null,
      meetings: isDecisionMaker ? Math.floor(Math.random() * 3) : 0,
      notes: isDecisionMaker ? `${firstName} is a key decision-maker for vendor selection and has procurement authority.` : ""
    });
  }
  
  // If no decision makers were created, ensure at least one
  if (!hasDecisionMaker && contacts.length > 0) {
    contacts[0].position = positions[Math.floor(Math.random() * 3)]; // One of the top 3 positions
  }
  
  return contacts;
}

// Returns positions specific to each industry
function getIndustryPositions(industryType: string): string[] {
  switch (industryType) {
    case 'technology':
      return [
        "CEO", "CTO", "Chief Product Officer", "VP of Engineering", "Chief Architect",
        "Engineering Manager", "Senior Developer", "Product Manager", "DevOps Engineer",
        "Software Engineer", "UX Designer", "Data Scientist", "QA Manager", 
        "IT Director", "Full Stack Developer", "Frontend Developer", "Backend Developer",
        "AI Engineer", "Cloud Architect", "Security Engineer", "System Administrator"
      ];
      
    case 'finance':
      return [
        "CEO", "CFO", "Chief Investment Officer", "Managing Director", "VP of Finance",
        "Financial Advisor", "Investment Banker", "Portfolio Manager", "Financial Analyst",
        "Wealth Manager", "Risk Manager", "Compliance Officer", "Controller",
        "Credit Analyst", "Actuary", "Tax Manager", "Treasurer",
        "Audit Manager", "Fund Manager", "Banking Officer", "Investment Analyst"
      ];
      
    case 'healthcare':
      return [
        "CEO", "Chief Medical Officer", "Medical Director", "Hospital Administrator", "Chief of Staff",
        "Department Head", "Clinical Director", "Practice Manager", "Physician",
        "Nurse Manager", "Director of Nursing", "Healthcare Administrator", "Quality Manager",
        "Research Director", "Pharmacy Director", "Laboratory Manager", "Radiology Manager",
        "Patient Care Coordinator", "Clinical Research Manager", "Healthcare IT Director"
      ];
      
    case 'marketing':
      return [
        "CEO", "CMO", "Marketing Director", "Creative Director", "Brand Manager",
        "Digital Marketing Manager", "SEO Specialist", "Content Marketing Manager", "Social Media Manager",
        "Public Relations Director", "Marketing Analyst", "Campaign Manager", "Market Research Manager",
        "Advertising Manager", "Media Planner", "Growth Hacker", "CRM Manager",
        "Email Marketing Specialist", "Marketing Coordinator", "Graphic Designer"
      ];
      
    case 'retail_manufacturing':
      return [
        "CEO", "COO", "Supply Chain Director", "Production Manager", "Operations Director",
        "Purchasing Manager", "Inventory Manager", "Quality Control Manager", "Plant Manager",
        "Retail Operations Manager", "Store Manager", "Merchandising Manager", "Logistics Coordinator",
        "Sales Manager", "Warehouse Manager", "Procurement Specialist", "Production Supervisor",
        "Distribution Manager", "Retail Buyer", "Category Manager"
      ];
      
    case 'real_estate':
      return [
        "Broker/Owner", "Managing Broker", "Principal Broker", "Broker of Record", "CEO",
        "VP of Sales", "VP of Property Management", "Director of Acquisitions", "Director of Leasing",
        "Senior Real Estate Agent", "Real Estate Agent", "Realtor", "Commercial Broker",
        "Property Manager", "Leasing Consultant", "Mortgage Broker", "Transaction Coordinator",
        "Real Estate Developer", "Real Estate Investor", "Marketing Director"
      ];
      
    default:
      return [
        "CEO", "President", "COO", "CFO", "CTO",
        "VP of Sales", "VP of Marketing", "VP of Operations", "Director",
        "Manager", "Team Lead", "Supervisor", "Coordinator",
        "Specialist", "Analyst", "Consultant", "Assistant",
        "Administrator", "Associate", "Representative"
      ];
  }
}

// Returns area codes that are common in regions where specific industries concentrate
function getIndustryAreaCodes(industryType: string): string[] {
  switch (industryType) {
    case 'technology':
      return ["415", "650", "408", "206", "512", "425", "669", "737"]; // SF, Seattle, Austin, etc.
      
    case 'finance':
      return ["212", "646", "917", "332", "312", "617"]; // NYC, Chicago, Boston
      
    case 'healthcare':
      return ["617", "857", "410", "443", "667", "301", "240"]; // Boston, Baltimore, etc.
      
    case 'marketing':
      return ["212", "310", "424", "213", "323", "312", "415"]; // NYC, LA, Chicago, SF
      
    case 'retail_manufacturing':
      return ["312", "313", "330", "234", "216", "614", "513"]; // Chicago, Detroit, Cleveland, etc.
      
    case 'real_estate':
      return ["212", "310", "305", "786", "214", "469", "972", "713", "281"]; // NYC, LA, Miami, Dallas, Houston
      
    default:
      return ["212", "415", "312", "213", "305", "214", "404", "617"];
  }
}
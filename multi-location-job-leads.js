/**
 * Enhanced Multi-Location Consumer Lead Generator with Accurate Job Titles
 * Generates consumer leads across multiple locations with realistic job titles
 * Includes data validation features for enhanced data quality
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const OUTPUT_DIR = 'consumer_leads';
const MAX_LEADS_PER_LOCATION = 25;

// Job categories with weighted distribution
const JOB_CATEGORIES = [
  {
    name: 'Professional',
    weight: 25,
    titles: [
      'Accountant',
      'Attorney',
      'Doctor',
      'Engineer',
      'Software Developer',
      'Teacher',
      'Nurse',
      'Architect',
      'Financial Advisor',
      'Marketing Manager',
      'Project Manager',
      'Pharmacist',
      'Dentist',
      'Professor',
      'Veterinarian'
    ]
  },
  {
    name: 'Service',
    weight: 20,
    titles: [
      'Restaurant Manager',
      'Chef',
      'Server',
      'Hairstylist',
      'Bartender',
      'Flight Attendant',
      'Hotel Manager',
      'Retail Manager',
      'Customer Service Representative',
      'Sales Associate',
      'Property Manager',
      'Security Guard',
      'Real Estate Agent',
      'Barista',
      'Bank Teller'
    ]
  },
  {
    name: 'Trade',
    weight: 15,
    titles: [
      'Electrician',
      'Plumber',
      'Carpenter',
      'Mechanic',
      'HVAC Technician',
      'Welder',
      'Construction Worker',
      'Landscaper',
      'Painter',
      'Roofer',
      'Contractor',
      'Maintenance Technician',
      'Solar Installer',
      'Machinist',
      'Appliance Repair Technician'
    ]
  },
  {
    name: 'Healthcare',
    weight: 12,
    titles: [
      'Registered Nurse',
      'Medical Assistant',
      'Physical Therapist',
      'Dental Hygienist',
      'Radiologic Technologist',
      'Home Health Aide',
      'Occupational Therapist',
      'Pharmacy Technician',
      'Massage Therapist',
      'Emergency Medical Technician',
      'Laboratory Technician',
      'Speech Therapist',
      'Respiratory Therapist',
      'Clinical Psychologist',
      'Nutritionist'
    ]
  },
  {
    name: 'Executive',
    weight: 5, // Much lower weight to reduce frequency
    titles: [
      'CEO',
      'CFO',
      'Director',
      'Vice President',
      'President',
      'Executive Director',
      'Chief Marketing Officer',
      'Chief Technology Officer',
      'Chief Operating Officer',
      'Department Head',
      'Managing Partner',
      'Regional Director',
      'Senior Vice President',
      'Founder',
      'Owner'
    ]
  },
  {
    name: 'Administrative',
    weight: 18,
    titles: [
      'Administrative Assistant',
      'Office Manager',
      'Executive Assistant',
      'Receptionist',
      'Secretary',
      'Data Entry Clerk',
      'Office Administrator',
      'Bookkeeper',
      'Office Coordinator',
      'Operations Assistant',
      'Personal Assistant',
      'Front Desk Coordinator',
      'Records Manager',
      'Human Resources Assistant',
      'Scheduling Coordinator'
    ]
  },
  {
    name: 'Education',
    weight: 10,
    titles: [
      'Teacher',
      'Professor',
      'School Administrator',
      'Teaching Assistant',
      'Tutor',
      'Education Specialist',
      'Principal',
      'School Counselor',
      'Instructional Designer',
      'Curriculum Specialist',
      'Daycare Provider',
      'Special Education Teacher',
      'Music Teacher',
      'School Psychologist',
      'Academic Advisor'
    ]
  },
  {
    name: 'Technology',
    weight: 12,
    titles: [
      'Software Developer',
      'Web Developer',
      'IT Support Specialist',
      'Network Administrator',
      'Database Administrator',
      'UX Designer',
      'Systems Analyst',
      'QA Tester',
      'DevOps Engineer',
      'Technical Support',
      'Data Scientist',
      'Mobile App Developer',
      'IT Consultant',
      'Network Engineer',
      'Systems Administrator'
    ]
  },
  {
    name: 'Self-Employed',
    weight: 8,
    titles: [
      'Freelancer',
      'Independent Consultant',
      'Business Owner',
      'Self-Employed Professional',
      'Entrepreneur',
      'Contractor',
      'Freelance Writer',
      'Freelance Designer',
      'Consultant',
      'Small Business Owner',
      'Online Seller',
      'Professional Blogger',
      'Social Media Influencer',
      'Artist',
      'Photographer'
    ]
  },
  {
    name: 'Homemaker/Retired',
    weight: 15,
    titles: [
      'Homemaker',
      'Stay-at-Home Parent',
      'Retired',
      'Former Accountant',
      'Former Teacher',
      'Former Nurse',
      'Former Executive',
      'Retired Military',
      'Retired Law Enforcement',
      'Retired Healthcare Provider',
      'Full-time Parent',
      'Part-time Consultant',
      'Retiree',
      'Volunteer',
      'Caregiver'
    ]
  },
  {
    name: 'Student',
    weight: 10,
    titles: [
      'College Student',
      'Graduate Student',
      'Medical Student',
      'Law Student',
      'MBA Student',
      'PhD Candidate',
      'Undergraduate',
      'Part-time Student',
      'Student Worker',
      'Student Intern',
      'Research Assistant',
      'Teaching Assistant',
      'Student Athlete',
      'International Student',
      'Student'
    ]
  }
];

/**
 * Generate a correctly distributed job title
 */
function generateJobTitle() {
  // Only include non-executive categories for consumer leads
  const consumerCategories = JOB_CATEGORIES.filter(cat => cat.name !== 'Executive');
  
  // Calculate total weight
  const totalWeight = consumerCategories.reduce((sum, cat) => sum + cat.weight, 0);
  
  // Select a category based on weight
  let randomWeight = Math.random() * totalWeight;
  let selectedCategory = null;
  
  for (const category of consumerCategories) {
    randomWeight -= category.weight;
    if (randomWeight <= 0) {
      selectedCategory = category;
      break;
    }
  }
  
  // Fallback
  if (!selectedCategory) {
    selectedCategory = consumerCategories[0];
  }
  
  // Select a random title from the category
  const titleIndex = Math.floor(Math.random() * selectedCategory.titles.length);
  return selectedCategory.titles[titleIndex];
}

// Locations to generate leads for
const LOCATIONS = [
  'Orlando, Florida',
  'Tampa, Florida',
  'Brooklyn, New York',
  'Queens, New York',
  'Dallas, Texas',
  'Austin, Texas'
];

// Make sure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Generate realistic consumer leads for cleaning services
 */
function generateConsumerLeads(count, location) {
  console.log(`Generating ${count} consumer leads for ${location}...`);
  
  const leads = [];
  
  // Load name data
  const firstNames = [
    'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
    'William', 'Elizabeth', 'David', 'Susan', 'Richard', 'Jessica', 'Joseph', 'Sarah',
    'Thomas', 'Karen', 'Charles', 'Nancy', 'Christopher', 'Lisa', 'Daniel', 'Margaret',
    'Matthew', 'Betty', 'Anthony', 'Sandra', 'Mark', 'Ashley', 'Donald', 'Kimberly',
    'Steven', 'Emily', 'Paul', 'Donna', 'Andrew', 'Michelle', 'Joshua', 'Carol',
    'Kenneth', 'Amanda', 'Kevin', 'Dorothy', 'Brian', 'Melissa', 'George', 'Deborah',
    'Edward', 'Stephanie', 'Ronald', 'Rebecca', 'Timothy', 'Sharon', 'Jason', 'Laura'
  ];
  
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
    'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
    'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
    'Carter', 'Roberts', 'Phillips', 'Evans', 'Turner', 'Parker', 'Collins', 'Edwards'
  ];
  
  // Area codes by location
  const areaCodes = {
    'Orlando, Florida': ['407', '321'],
    'Tampa, Florida': ['813', '727'],
    'Brooklyn, New York': ['718', '347', '929'],
    'Queens, New York': ['718', '347', '929'],
    'Dallas, Texas': ['214', '469', '972'],
    'Austin, Texas': ['512', '737']
  };
  
  // Streets by location
  const streetsByLocation = {
    'Orlando, Florida': [
      'International Drive', 'Orange Blossom Trail', 'Colonial Drive', 'Sand Lake Road',
      'Universal Boulevard', 'Kirkman Road', 'Mills Avenue', 'Semoran Boulevard',
      'Lake Underhill Road', 'Vineland Road', 'Central Florida Parkway', 'John Young Parkway',
      'Conroy Road', 'Michigan Street', 'Orange Avenue'
    ],
    'Tampa, Florida': [
      'Bayshore Boulevard', 'Kennedy Boulevard', 'Dale Mabry Highway', 'Fowler Avenue',
      'Bruce B Downs Boulevard', 'Armenia Avenue', 'Howard Avenue', 'Tampa Street',
      'Florida Avenue', 'Westshore Boulevard', 'Hillsborough Avenue', 'Busch Boulevard',
      'Waters Avenue', 'Columbus Drive', 'Himes Avenue'
    ],
    'Brooklyn, New York': [
      'Bedford Avenue', 'Ocean Parkway', 'Atlantic Avenue', 'Flatbush Avenue',
      'Eastern Parkway', 'Ocean Avenue', 'Nostrand Avenue', 'Kings Highway',
      'Coney Island Avenue', 'Bay Parkway', 'Church Avenue', 'Court Street',
      'Fourth Avenue', 'Avenue J', 'Avenue U'
    ],
    'Queens, New York': [
      'Queens Boulevard', 'Northern Boulevard', 'Steinway Street', 'Jamaica Avenue',
      'Roosevelt Avenue', 'Astoria Boulevard', 'Main Street', 'Union Turnpike',
      'Bell Boulevard', 'Kissena Boulevard', 'Woodhaven Boulevard', 'Lefferts Boulevard',
      '21st Street', 'Merrick Boulevard', 'Francis Lewis Boulevard'
    ],
    'Dallas, Texas': [
      'Preston Road', 'Mockingbird Lane', 'Greenville Avenue', 'Northwest Highway',
      'Oak Lawn Avenue', 'Lemmon Avenue', 'Cedar Springs Road', 'Forest Lane',
      'Belt Line Road', 'McKinney Avenue', 'Skillman Street', 'Webb Chapel Road',
      'Coit Road', 'Inwood Road', 'Royal Lane'
    ],
    'Austin, Texas': [
      'Congress Avenue', 'Lamar Boulevard', 'Guadalupe Street', 'South First Street',
      'Riverside Drive', 'Burnet Road', 'Barton Springs Road', '6th Street',
      'Cesar Chavez Street', 'Bee Cave Road', 'MoPac Expressway', 'Anderson Lane',
      'Capital of Texas Highway', 'William Cannon Drive', 'Slaughter Lane'
    ]
  };
  
  // Zip codes by location
  const zipCodesByLocation = {
    'Orlando, Florida': ['32801', '32803', '32804', '32805', '32806', '32807', '32808', '32809', '32810', '32811', '32812', '32814', '32819', '32822', '32824', '32825', '32827', '32829', '32832', '32835', '32839'],
    'Tampa, Florida': ['33602', '33603', '33604', '33605', '33606', '33607', '33609', '33610', '33611', '33612', '33613', '33614', '33615', '33616', '33617', '33618', '33619', '33620', '33621', '33624', '33626', '33629', '33634', '33635', '33637'],
    'Brooklyn, New York': ['11201', '11203', '11204', '11205', '11206', '11207', '11208', '11209', '11210', '11211', '11212', '11213', '11214', '11215', '11216', '11217', '11218', '11219', '11220', '11221', '11222', '11223', '11224', '11225', '11226', '11228', '11229', '11230', '11231', '11232', '11233', '11234', '11235', '11236', '11237', '11238', '11239'],
    'Queens, New York': ['11101', '11102', '11103', '11104', '11105', '11106', '11354', '11355', '11356', '11357', '11358', '11359', '11360', '11361', '11362', '11363', '11364', '11365', '11366', '11367', '11368', '11369', '11370', '11371', '11372', '11373', '11374', '11375', '11377', '11378', '11379', '11385', '11411', '11412', '11413', '11414', '11415', '11416', '11417', '11418', '11419', '11420', '11421', '11422', '11423', '11426', '11427', '11428', '11429', '11430', '11432', '11433', '11434', '11435', '11436', '11691', '11692', '11693', '11694', '11695', '11697'],
    'Dallas, Texas': ['75201', '75202', '75203', '75204', '75205', '75206', '75207', '75208', '75209', '75210', '75211', '75212', '75214', '75215', '75216', '75217', '75218', '75219', '75220', '75223', '75224', '75225', '75226', '75227', '75228', '75229', '75230', '75231', '75232', '75233', '75234', '75235', '75236', '75237', '75238', '75240', '75241', '75243', '75244', '75246', '75247', '75248', '75249', '75251', '75252', '75253', '75254', '75287', '75390'],
    'Austin, Texas': ['78701', '78702', '78703', '78704', '78705', '78712', '78717', '78719', '78721', '78722', '78723', '78724', '78725', '78726', '78727', '78728', '78729', '78730', '78731', '78732', '78733', '78734', '78735', '78736', '78737', '78738', '78739', '78741', '78742', '78744', '78745', '78746', '78747', '78748', '78749', '78750', '78751', '78752', '78753', '78754', '78756', '78757', '78758', '78759']
  };
  
  // Get location-specific data or use defaults
  const cityState = location.split(', ');
  const city = cityState[0];
  const state = cityState[1];
  
  // Get the appropriate area codes for this location
  const locationAreaCodes = areaCodes[location] || ['555'];
  
  // Get the appropriate streets for this location
  const locationStreets = streetsByLocation[location] || [
    'Main Street', 'First Avenue', 'Second Street', 'Park Avenue',
    'Oak Street', 'Elm Avenue', 'Washington Boulevard', 'Lincoln Road'
  ];
  
  // Get the appropriate zip codes for this location
  const locationZipCodes = zipCodesByLocation[location] || ['10001', '20001', '30001', '40001', '50001'];
  
  // Property types
  const propertyTypes = ['Apartment', 'Condo', 'House', 'Townhouse', 'Studio'];
  
  // Property sizes
  const propertySizes = [
    'Studio apartment (~500 sq ft)',
    '1 bedroom apartment (~750 sq ft)',
    '2 bedroom apartment (~1000 sq ft)',
    '2 bedroom house (~1200 sq ft)',
    '3 bedroom condo (~1500 sq ft)',
    '3 bedroom house (~1800 sq ft)',
    '4 bedroom house (~2200 sq ft)',
    '4+ bedroom house (2500+ sq ft)'
  ];
  
  // Cleaning needs/preferences
  const cleaningNeeds = [
    'Regular weekly cleaning',
    'Bi-weekly cleaning service',
    'Monthly deep cleaning',
    'One-time move-in cleaning',
    'One-time move-out cleaning',
    'Post-renovation cleaning',
    'Same-day emergency cleaning',
    'Weekend cleaning'
  ];
  
  // Budgets
  const budgets = [
    'Under $100',
    '$100-$150',
    '$150-$200',
    '$200-$250',
    '$250-$300',
    '$300-$400',
    '$400+'
  ];
  
  // Generate leads
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${firstName} ${lastName}`;
    
    // Get a realistic job title
    const jobTitle = generateJobTitle();
    
    // Generate a realistic address
    const streetNumber = Math.floor(Math.random() * 9000) + 1000;
    const streetName = locationStreets[Math.floor(Math.random() * locationStreets.length)];
    const propertyType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
    const unitNumber = propertyType === 'House' ? '' : (Math.floor(Math.random() * 500) + 1);
    const zipCode = locationZipCodes[Math.floor(Math.random() * locationZipCodes.length)];
    
    const address = propertyType === 'House' 
      ? `${streetNumber} ${streetName}, ${city}, ${state} ${zipCode}`
      : `${streetNumber} ${streetName}, ${propertyType} ${unitNumber}, ${city}, ${state} ${zipCode}`;
    
    // Generate phone number
    const areaCode = locationAreaCodes[Math.floor(Math.random() * locationAreaCodes.length)];
    const exchangeCode = Math.floor(Math.random() * 900) + 100;
    const lineNumber = Math.floor(Math.random() * 9000) + 1000;
    const phoneNumber = `(${areaCode}) ${exchangeCode}-${lineNumber}`;
    
    // Generate email based on name
    const emailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com'];
    const domain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
    const emailName = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}`;
    const email = `${emailName}@${domain}`;
    
    // Select a cleaning need
    const need = cleaningNeeds[Math.floor(Math.random() * cleaningNeeds.length)];
    
    // Select property size
    const propertySize = propertySizes[Math.floor(Math.random() * propertySizes.length)];
    
    // Select budget
    const budget = budgets[Math.floor(Math.random() * budgets.length)];
    
    // Determine inquiry date (within the last 30 days)
    const daysAgo = Math.floor(Math.random() * 30);
    const inquiryDate = new Date();
    inquiryDate.setDate(inquiryDate.getDate() - daysAgo);
    
    // Determine if this is a hot lead
    const leadScore = Math.floor(Math.random() * 100) + 1;
    const isHotLead = leadScore > 70;
    
    // Create the lead
    leads.push({
      id: uuidv4(),
      name,
      jobTitle,
      address,
      phoneNumber,
      email,
      propertyType,
      propertySize,
      cleaningNeed: need,
      budget,
      inquiryDate: inquiryDate.toISOString().split('T')[0], // YYYY-MM-DD format
      leadScore,
      isHotLead,
      notes: generateLeadNotes(name, jobTitle, propertyType, need, city)
    });
  }
  
  return leads;
}

/**
 * Generate natural-sounding notes for a lead
 */
function generateLeadNotes(name, jobTitle, propertyType, need, city) {
  const namePrefix = Math.random() > 0.5 ? name.split(' ')[0] : '';
  
  const noteFragments = [
    `${namePrefix ? namePrefix + ' is' : 'Prospect is'} a ${jobTitle} looking for ${need.toLowerCase()}`,
    `Has a ${propertyType.toLowerCase()} in ${city}`,
    `Works long hours due to ${jobTitle} responsibilities`,
    `Prefers weekends` + (Math.random() > 0.7 ? ' only' : ''),
    `Has pets` + (Math.random() > 0.5 ? ` (${Math.random() > 0.5 ? 'dogs' : 'cats'})` : ''),
    `Mentioned they have children`,
    `Previous cleaning service was unsatisfactory`,
    `Needs service ASAP`,
    `Worried about price`,
    `Wants green/eco-friendly products`,
    `References available`,
    `Referred by another customer`,
    `Found us through Google search`,
    `Has allergies, needs special products`,
    `Flexible schedule`,
    `Works from home as a ${jobTitle}`,
    `Specific areas need extra attention`,
    `No previous cleaning service experience`,
    `Very particular about cleaning standards`,
    `Recently renovated, needs deep cleaning`,
    `Booking for a family member/elderly parent`
  ];
  
  // Select 2-4 random note fragments
  const numNotes = Math.floor(Math.random() * 3) + 2;
  const selectedNotes = [];
  
  for (let i = 0; i < numNotes; i++) {
    const randomNote = noteFragments[Math.floor(Math.random() * noteFragments.length)];
    if (!selectedNotes.includes(randomNote)) {
      selectedNotes.push(randomNote);
    }
  }
  
  return selectedNotes.join('. ') + '.';
}

/**
 * Save leads to CSV file
 */
function saveLeadsToCsv(leads, location) {
  const filename = `${location.replace(/,?\s+/g, '_').toLowerCase()}_consumer_leads.csv`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  // Create CSV header
  const header = 'Name,Job Title,Phone,Email,Address,Property Type,Property Size,Cleaning Need,Budget,Inquiry Date,Lead Score,Hot Lead,Notes\n';
  
  // Format leads as CSV rows
  const rows = leads.map(lead => {
    return [
      escapeCsv(lead.name),
      escapeCsv(lead.jobTitle),
      escapeCsv(lead.phoneNumber),
      escapeCsv(lead.email),
      escapeCsv(lead.address),
      escapeCsv(lead.propertyType),
      escapeCsv(lead.propertySize),
      escapeCsv(lead.cleaningNeed),
      escapeCsv(lead.budget),
      escapeCsv(lead.inquiryDate),
      lead.leadScore,
      lead.isHotLead ? 'Yes' : 'No',
      escapeCsv(lead.notes)
    ].join(',');
  });
  
  // Write to file
  fs.writeFileSync(filepath, header + rows.join('\n'));
  console.log(`Saved ${leads.length} leads to ${filepath}`);
  
  return filepath;
}

/**
 * Save leads to JSON file
 */
function saveLeadsToJson(leads, location) {
  const filename = `${location.replace(/,?\s+/g, '_').toLowerCase()}_consumer_leads.json`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(leads, null, 2));
  console.log(`Saved ${leads.length} leads to ${filepath}`);
  
  return filepath;
}

/**
 * Helper function to escape CSV values
 */
function escapeCsv(value) {
  if (value == null) return '';
  return `"${String(value).replace(/"/g, '""')}"`;
}

/**
 * Run the multi-location lead generation process
 */
async function runMultiLocationLeadGeneration() {
  console.log('Starting consumer lead generation for multiple locations');
  console.log('Targeting individual homeowners and renters who need cleaning services');
  console.log(`Locations: ${LOCATIONS.join(', ')}`);
  console.log(`Leads per location: ${MAX_LEADS_PER_LOCATION}`);
  console.log('Using realistic job title distribution (fewer executive titles)');
  
  // Track totals
  const allResults = [];
  let totalLeads = 0;
  let totalHotLeads = 0;
  const allJobTitles = {};
  
  // Generate leads for each location
  for (const location of LOCATIONS) {
    console.log(`\n--- Processing ${location} ---`);
    
    // Generate the leads
    const leads = generateConsumerLeads(MAX_LEADS_PER_LOCATION, location);
    
    // Validate leads if validation server is running
    await validateLeads(leads, location);
    
    // Save to CSV and JSON
    const csvPath = saveLeadsToCsv(leads, location);
    const jsonPath = saveLeadsToJson(leads, location);
    
    // Count job titles
    leads.forEach(lead => {
      allJobTitles[lead.jobTitle] = (allJobTitles[lead.jobTitle] || 0) + 1;
    });
    
    // Update totals
    totalLeads += leads.length;
    totalHotLeads += leads.filter(lead => lead.isHotLead).length;
    
    // Add to results
    allResults.push({
      location,
      totalLeads: leads.length,
      hotLeads: leads.filter(lead => lead.isHotLead).length,
      csvPath,
      jsonPath
    });
    
    // Small delay between locations to avoid overloading system
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Print job title distribution
  console.log('\nJob Title Distribution (Top 20):');
  const sortedTitles = Object.entries(allJobTitles).sort((a, b) => b[1] - a[1]);
  sortedTitles.slice(0, 20).forEach(([title, count]) => {
    console.log(`  ${title}: ${count} leads (${Math.round(count/totalLeads*100)}%)`);
  });
  
  // Print summary
  console.log('\n=== LEAD GENERATION SUMMARY ===');
  console.log(`Total Leads: ${totalLeads}`);
  console.log(`Total Hot Leads: ${totalHotLeads}`);
  console.log(`Unique Job Titles: ${Object.keys(allJobTitles).length}`);
  console.log(`Locations Processed: ${LOCATIONS.length}`);
  
  console.log('\nResults by Location:');
  allResults.forEach(result => {
    console.log(`${result.location}: ${result.totalLeads} leads (${result.hotLeads} hot leads)`);
  });
  
  console.log('\nAll files saved to the consumer_leads directory');
}

// Run the multi-location lead generation
/**
 * Validate leads using the validation API
 */
async function validateLeads(leads, location) {
  try {
    console.log(`Attempting to validate ${leads.length} leads for ${location}...`);
    
    // Check if validation server is running
    const isServerRunning = await checkValidationServer();
    
    if (!isServerRunning) {
      console.log('Validation server not running. Skipping validation.');
      return;
    }
    
    // Prepare leads for validation
    const leadsForValidation = leads.map(lead => ({
      id: lead.id,
      name: lead.name,
      phoneNumber: lead.phoneNumber,
      email: lead.email,
      address: lead.address,
      jobTitle: lead.jobTitle
    }));
    
    // Create directory for validation results if it doesn't exist
    const validationDir = 'validation_results';
    if (!fs.existsSync(validationDir)) {
      fs.mkdirSync(validationDir, { recursive: true });
    }
    
    // Call validation API
    console.log('Calling validation API...');
    try {
      const response = await fetch('http://localhost:5000/api/validate/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ leads: leadsForValidation })
      });
      
      if (!response.ok) {
        throw new Error(`Validation API error: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`Validation completed for ${location}`);
        console.log(`Summary: ${result.summary.valid} valid, ${result.summary.suspicious} suspicious, ${result.summary.invalid} invalid leads`);
        
        // Save validation results
        const filename = location.replace(/,?\s+/g, '_').toLowerCase();
        fs.writeFileSync(
          `${validationDir}/${filename}_validation.json`, 
          JSON.stringify(result, null, 2)
        );
        
        console.log(`Validation results saved to ${validationDir}/${filename}_validation.json`);
      } else {
        console.error(`Validation failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error calling validation API:', error.message);
    }
  } catch (error) {
    console.error('Error in validation process:', error);
  }
}

/**
 * Check if validation server is running
 */
async function checkValidationServer() {
  try {
    const response = await fetch('http://localhost:5000/api/validate/settings', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return response.ok;
  } catch (error) {
    console.log('Validation server check failed:', error.message);
    return false;
  }
}

runMultiLocationLeadGeneration();
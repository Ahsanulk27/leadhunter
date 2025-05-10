/**
 * Enhanced Consumer Lead Generator for cleaning services
 * Focuses on finding individual homeowners with accurate job titles who need cleaning services
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const OUTPUT_DIR = 'consumer_leads';
const LOCATION = 'Miami, Florida';
const MAX_LEADS = 50;

// Consumer targeting keywords
const CONSUMER_KEYWORDS = [
  'home cleaning',
  'house cleaning',
  'residential cleaning',
  'maid service',
  'apartment cleaning'
];

// Make sure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

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
  
  // Miami area codes and zip codes for realism
  const areaCodes = ['305', '786', '954'];
  const zipCodes = ['33125', '33126', '33127', '33128', '33129', '33130', '33131', '33132', '33133', '33134', '33135', '33136', '33137', '33138', '33139', '33140', '33141', '33142', '33143', '33144', '33145', '33146', '33147', '33149', '33150', '33154', '33155', '33156', '33157', '33158', '33160', '33161', '33162', '33165', '33166', '33167', '33168', '33169', '33170', '33172', '33173', '33174', '33175', '33176', '33177', '33178', '33179', '33180', '33181', '33182', '33183', '33184', '33185', '33186', '33187', '33189', '33190', '33193', '33194', '33196'];
  
  // Property types
  const propertyTypes = ['Apartment', 'Condo', 'House', 'Townhouse', 'Studio'];
  
  // Streets in Miami
  const streetNames = [
    'Brickell Avenue', 'Collins Avenue', 'Washington Avenue', 'Ocean Drive', 'Alton Road',
    'Biscayne Boulevard', 'Flagler Street', 'Coral Way', 'SW 8th Street', 'NW 7th Avenue',
    'SW 22nd Avenue', 'NE 15th Street', 'Lincoln Road', 'Kendall Drive', 'Miracle Mile',
    'Ponce de Leon Boulevard', 'Douglas Road', 'SW 87th Avenue', 'NW 36th Street', 'NE 2nd Avenue'
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
    'Eco-friendly cleaning only',
    'Needs allergy-friendly products',
    'Evening cleaning service preferred',
    'Weekend availability needed'
  ];
  
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
    
    // Get a realistic job title using our weighted distribution
    const jobTitle = generateJobTitle();
    
    // Generate a realistic address
    const streetNumber = Math.floor(Math.random() * 9000) + 1000;
    const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
    const propertyType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
    const unitNumber = propertyType === 'House' ? '' : (Math.floor(Math.random() * 500) + 1);
    const zipCode = zipCodes[Math.floor(Math.random() * zipCodes.length)];
    
    const address = propertyType === 'House' 
      ? `${streetNumber} ${streetName}, Miami, FL ${zipCode}`
      : `${streetNumber} ${streetName}, ${propertyType} ${unitNumber}, Miami, FL ${zipCode}`;
    
    // Generate phone number
    const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
    const exchangeCode = Math.floor(Math.random() * 900) + 100;
    const lineNumber = Math.floor(Math.random() * 9000) + 1000;
    const phoneNumber = `(${areaCode}) ${exchangeCode}-${lineNumber}`;
    
    // Generate email based on name
    const emailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com'];
    const domain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
    const emailName = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}`;
    const email = `${emailName}@${domain}`;
    
    // Select a random search keyword that brought this lead
    const searchKeyword = CONSUMER_KEYWORDS[Math.floor(Math.random() * CONSUMER_KEYWORDS.length)];
    
    // Select cleaning needs
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
      searchKeyword,
      leadScore,
      isHotLead,
      notes: generateLeadNotes(name, jobTitle, propertyType, need)
    });
  }
  
  return leads;
}

/**
 * Generate natural-sounding notes for a lead
 */
function generateLeadNotes(name, jobTitle, propertyType, need) {
  const namePrefix = Math.random() > 0.5 ? name.split(' ')[0] : '';
  
  const noteFragments = [
    `${namePrefix ? namePrefix + ' is' : 'Prospect is'} a ${jobTitle} looking for ${need.toLowerCase()}`,
    `Has a ${propertyType.toLowerCase()}`,
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
 * Run the lead generation process
 */
function runLeadGeneration() {
  console.log(`Starting enhanced consumer lead generation for ${LOCATION}`);
  console.log('Targeting individual homeowners and renters who need cleaning services');
  console.log(`Maximum leads to generate: ${MAX_LEADS}`);
  console.log('Using realistic job title distribution (reduced executive titles)')
  
  // Generate the leads
  const leads = generateConsumerLeads(MAX_LEADS, LOCATION);
  
  // Validate leads if validation server is running
  validateLeads(leads, LOCATION);
  
  // Save to CSV and JSON
  const csvPath = saveLeadsToCsv(leads, LOCATION);
  const jsonPath = saveLeadsToJson(leads, LOCATION);
  
  // Count job titles by category
  const jobTitleCounts = {};
  leads.forEach(lead => {
    jobTitleCounts[lead.jobTitle] = (jobTitleCounts[lead.jobTitle] || 0) + 1;
  });
}

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
    fetch('http://localhost:5000/api/validate/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ leads: leadsForValidation })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Validation API error: ${response.statusText}`);
      }
      return response.json();
    })
    .then(result => {
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
    })
    .catch(error => {
      console.error('Error calling validation API:', error.message);
    });
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
  sortedTitles.forEach(([title, count]) => {
    console.log(`  ${title}: ${count} leads (${Math.round(count/leads.length*100)}%)`);
  });
  
  // Print a sample of the data
  console.log('\nSample Results (3 random leads):');
  
  const sampleIndices = [];
  while (sampleIndices.length < 3) {
    const idx = Math.floor(Math.random() * leads.length);
    if (!sampleIndices.includes(idx)) {
      sampleIndices.push(idx);
    }
  }
  
  sampleIndices.forEach(idx => {
    const lead = leads[idx];
    console.log(`\n[${idx + 1}] ${lead.name} - ${lead.jobTitle} ${lead.isHotLead ? '🔥 HOT LEAD' : 'Regular Lead'}`);
    console.log(`    Phone: ${lead.phoneNumber}`);
    console.log(`    Email: ${lead.email}`);
    console.log(`    Address: ${lead.address}`);
    console.log(`    Property: ${lead.propertyType} (${lead.propertySize})`);
    console.log(`    Need: ${lead.cleaningNeed}`);
    console.log(`    Budget: ${lead.budget}`);
    console.log(`    Inquiry Date: ${lead.inquiryDate}`);
    console.log(`    Lead Score: ${lead.leadScore}/100`);
    console.log(`    Notes: ${lead.notes}`);
  });
  
  console.log('\nLead Generation Summary:');
  console.log(`Total Leads: ${leads.length}`);
  console.log(`Hot Leads: ${leads.filter(l => l.isHotLead).length}`);
  console.log(`Regular Leads: ${leads.filter(l => !l.isHotLead).length}`);
  console.log(`Unique Job Titles: ${Object.keys(jobTitleCounts).length}`);
  console.log(`CSV saved to: ${csvPath}`);
  console.log(`JSON saved to: ${jsonPath}`);
}

// Run the lead generation
runLeadGeneration();
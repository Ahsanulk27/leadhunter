/**
 * Job Title Generator Utility
 * Provides realistic job titles with proper distribution
 */

// Job categories with weighted distribution
interface JobCategory {
  name: string;
  weight: number; // Higher weight = more common
  titles: string[];
}

// Job categories with representative titles for each
const jobCategories: JobCategory[] = [
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
 * Calculate the total weight across all job categories
 */
const totalWeight = jobCategories.reduce((sum, category) => sum + category.weight, 0);

/**
 * Generate a random job title with proper distribution
 * Uses weighted selection to ensure realistic job distribution
 */
export function generateJobTitle(): string {
  // First, select a category based on weight
  let randomWeight = Math.random() * totalWeight;
  let selectedCategory: JobCategory | null = null;
  
  for (const category of jobCategories) {
    randomWeight -= category.weight;
    if (randomWeight <= 0) {
      selectedCategory = category;
      break;
    }
  }
  
  // Fallback to first category if something went wrong
  if (!selectedCategory) {
    selectedCategory = jobCategories[0];
  }
  
  // Then select a random title from the category
  const titleIndex = Math.floor(Math.random() * selectedCategory.titles.length);
  return selectedCategory.titles[titleIndex];
}

/**
 * Generate job title appropriate for a specific context
 * @param context The context to generate a title for (e.g., "consumer", "homeowner")
 */
export function generateContextualJobTitle(context: string): string {
  // For consumers/homeowners, we want to exclude certain categories
  if (context === 'consumer' || context === 'homeowner') {
    // Filter out executive roles for consumer leads to make it more realistic
    const consumerCategories = jobCategories.filter(cat => 
      cat.name !== 'Executive'
    );
    
    // Recalculate total weight
    const consumerTotalWeight = consumerCategories.reduce((sum, cat) => sum + cat.weight, 0);
    
    // Select category based on weight
    let randomWeight = Math.random() * consumerTotalWeight;
    let selectedCategory: JobCategory | null = null;
    
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
    
    // Select random title from category
    const titleIndex = Math.floor(Math.random() * selectedCategory.titles.length);
    return selectedCategory.titles[titleIndex];
  }
  
  // For general case, use the regular generator
  return generateJobTitle();
}

/**
 * Generate a set of job titles
 * @param count Number of titles to generate
 * @param context Optional context for generation
 */
export function generateJobTitles(count: number, context?: string): string[] {
  const titles: string[] = [];
  
  for (let i = 0; i < count; i++) {
    titles.push(context ? generateContextualJobTitle(context) : generateJobTitle());
  }
  
  return titles;
}
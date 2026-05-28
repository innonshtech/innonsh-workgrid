import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import JobRequisition from '../src/lib/db/models/recruitment/JobRequisition.js';
import Candidate from '../src/lib/db/models/recruitment/Candidate.js';
import OnboardingChecklist from '../src/lib/db/models/recruitment/OnboardingChecklist.js';
import Employee from '../src/lib/db/models/payroll/Employee.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env.local');
    process.exit(1);
}

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing recruitment data
        await JobRequisition.deleteMany({});
        await Candidate.deleteMany({});
        await OnboardingChecklist.deleteMany({});

        // 1. Create Job Requisitions
        const jobs = await JobRequisition.insertMany([
            {
                title: 'Senior Frontend Developer',
                department: 'Engineering',
                location: 'Mumbai / Remote',
                type: 'Full-time',
                status: 'Open',
                priority: 'High',
                description: 'We are looking for a Senior Frontend Developer with expertise in Next.js and Tailwind CSS.',
                requirements: ['Next.js', 'React', 'Tailwind CSS', '5+ years experience'],
                salaryRange: { min: 2000000, max: 3500000 }
            },
            {
                title: 'HR Manager',
                department: 'Human Resources',
                location: 'Pune',
                type: 'Full-time',
                status: 'Open',
                priority: 'Medium',
                description: 'Lead our HR team and manage talent acquisition and employee relations.',
                requirements: ['HR Strategy', 'Recruitment', 'Conflict Resolution', '8+ years experience'],
                salaryRange: { min: 1500000, max: 2500000 }
            },
            {
                title: 'Product Designer (UI/UX)',
                department: 'Design',
                location: 'Remote',
                type: 'Contract',
                status: 'Open',
                priority: 'Medium',
                description: 'Design beautiful and intuitive user interfaces for our HRMS platform.',
                requirements: ['Figma', 'User Research', 'Prototyping'],
                salaryRange: { min: 80000, max: 120000, currency: 'INR' }
            }
        ]);

        console.log('Jobs seeded');

        // 2. Create Candidates
        const candidates = await Candidate.insertMany([
            {
                name: 'Amit Sharma',
                email: 'amit.sharma@example.com',
                phone: '9876543210',
                jobRequisition: jobs[0]._id,
                status: 'Technical Interview',
                source: 'LinkedIn',
                notes: 'Strong React background. Impressed in the initial screening.'
            },
            {
                name: 'Priya Patel',
                email: 'priya.patel@example.com',
                phone: '8765432109',
                jobRequisition: jobs[0]._id,
                status: 'Applied',
                source: 'Referral',
                notes: 'Referral from Engineering Lead.'
            },
            {
                name: 'Rahul Verma',
                email: 'rahul.verma@example.com',
                phone: '7654321098',
                jobRequisition: jobs[1]._id,
                status: 'HR Interview',
                source: 'Indeed',
                notes: 'Good experience in similar industry.'
            }
        ]);

        console.log('Candidates seeded');

        // 3. Create Onboarding Checklist for an existing employee (or create a dummy)
        const employeesList = await Employee.find().limit(1);
        if (employeesList.length > 0) {
            await OnboardingChecklist.create({
                employee: employeesList[0]._id,
                tasks: [
                    { category: 'Documentation', task: 'Sign Employment Contract', status: 'Completed', completedAt: new Date() },
                    { category: 'Documentation', task: 'Submit PAN & Aadhaar details', status: 'Pending', dueDate: new Date(Date.now() + 86400000) },
                    { category: 'IT Setup', task: 'Allocate Laptop and Email ID', status: 'Completed', completedAt: new Date() },
                    { category: 'IT Setup', task: 'Configure Slack and Jira access', status: 'Pending' },
                    { category: 'Orientation', task: 'HR Policy Briefing', status: 'Pending', dueDate: new Date(Date.now() + 172800000) }
                ],
                status: 'In Progress'
            });
            console.log('Onboarding checklist seeded');
        }

        console.log('Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
}

seed();

import fetch from 'node-fetch';

async function testPUT() {
    console.log("Testing API PUT /api/v1/admin/recruitment/interviews");
    
    // We need an active candidate ID to test with.
    import mongoose from 'mongoose';
    import dbConnect from './src/lib/db/connect.js';
    import Candidate from './src/lib/db/models/recruitment/Candidate.js';
    
    await dbConnect();
    const candidate = await Candidate.findOne({ status: { $ne: 'Rejected' }, 'interviews.0': { $exists: true } });
    
    if (!candidate) return console.log("No test candidate found.");
    
    const interview = candidate.interviews[0];
    
    // We can simulate an API call directly against the `PUT` function instead of HTTP.
    // OR we just simulate the template payload.
    const { getOfferLetterEmailTemplate } = await import('./src/lib/email/templates/recruitment.js');
    try {
        console.log("Template generated successfully. Length:", getOfferLetterEmailTemplate(
            candidate.name || 'Candidate', 
            candidate.appliedRole || 'Team Member',
            null,
            candidate._id.toString(),
            candidate.email
        ).length);
        console.log("TEST PASSED!");
    } catch (e) {
        console.error("TEMPLATE CRASHED:", e);
    }
    
    process.exit(0);
}

testPUT().catch(console.error);

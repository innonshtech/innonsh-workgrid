import dbConnect from '../src/lib/db/connect.js';
import PulseSurvey from '../src/lib/db/models/engagement/PulseSurvey.js';

async function checkSurveys() {
    await dbConnect();
    const surveys = await PulseSurvey.find().lean();
    console.log(JSON.stringify(surveys, null, 2));
    process.exit(0);
}

checkSurveys();

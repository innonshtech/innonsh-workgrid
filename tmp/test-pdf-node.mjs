import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateOfferLetter } from '../src/lib/pdf/offer-generator.js';

try {
    const pdfData = generateOfferLetter({
        candidateName: "Test User",
        jobTitle: "Senior Developer",
        salary: "1,20,000",
        joiningDate: "Today"
    });
    console.log("PDF generated successfully. Length:", pdfData?.length);
    if (pdfData && pdfData.includes('base64,')) {
        console.log("PDF is valid base64 URI");
    }
} catch (err) {
    console.error("SERVER SIDE PDF FAILED:", err);
}

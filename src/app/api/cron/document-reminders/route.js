import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import DocumentReminder from "@/lib/db/models/payroll/DocumentReminder";
import Employee from "@/lib/db/models/payroll/Employee";
import { sendDocumentReminderNotification } from "@/utils/notifications";

// Function to process document reminders
async function processDocumentReminders() {
  try {
    console.log("🔄 Processing document reminders...");

    // Find reminders that are due
    const dueReminders = await DocumentReminder.find({
      status: 'pending',
      'missingDocuments.nextReminderDate': { $lte: new Date() },
      'missingDocuments.reminderSent': false
    }).populate('employeeId', 'personalDetails employeeId jobDetails');

    console.log(`📋 Found ${dueReminders.length} due reminders`);

    for (const reminder of dueReminders) {
      const employee = reminder.employeeId;
      if (!employee) {
        console.log(`⚠️ Employee not found for reminder ${reminder._id}`);
        continue;
      }

      // Get unsent reminders
      const unsentReminders = reminder.missingDocuments.filter(doc => !doc.reminderSent);

      if (unsentReminders.length === 0) {
        // Mark reminder as completed if all documents have been reminded
        await DocumentReminder.findByIdAndUpdate(reminder._id, { status: 'completed' });
        continue;
      }

      // Send reminder notification
      try {
        await sendDocumentReminderNotification({
          employee,
          missingDocuments: unsentReminders,
          reminderDays: 7 // Default, could be configurable
        });

        // Update reminder status
        const updateData = {
          'missingDocuments.$[].reminderSent': true,
          'missingDocuments.$[].reminderDate': new Date()
        };

        // Set next reminder date (could be configurable)
        const nextReminderDate = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days from now
        updateData['missingDocuments.$[].nextReminderDate'] = nextReminderDate;

        await DocumentReminder.findByIdAndUpdate(reminder._id, updateData);

        console.log(`✅ Reminder sent for employee ${employee.employeeId}`);

      } catch (error) {
        console.error(`❌ Failed to send reminder for employee ${employee.employeeId}:`, error);
      }
    }

    return { processed: dueReminders.length };

  } catch (error) {
    console.error("❌ Error processing document reminders:", error);
    throw error;
  }
}

// POST - Manual trigger (for testing)
export async function POST(request) {
  try {
    console.log("🚀 Manual document reminder trigger");

    await dbConnect();
    const result = await processDocumentReminders();

    return NextResponse.json({
      success: true,
      message: `Document reminders processed: ${result.processed} reminders sent`,
      data: result,
    });
  } catch (error) {
    console.error("Error in POST /api/cron/document-reminders:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}

// GET - Scheduled cron job endpoint
export async function GET(request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "your-secret-key";

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("⏰ Scheduled document reminder trigger at", new Date().toISOString());

    await dbConnect();
    const result = await processDocumentReminders();

    return NextResponse.json({
      success: true,
      message: `Document reminders processed: ${result.processed} reminders sent`,
      timestamp: new Date().toISOString(),
      data: result,
    });
  } catch (error) {
    console.error("Error in GET /api/cron/document-reminders:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
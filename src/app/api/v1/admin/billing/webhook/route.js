import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Subscription from '@/lib/db/models/Subscription';
import User from '@/lib/db/models/User';
import { RazorpayService } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    // In production, MUST verify signature
    if (process.env.RAZORPAY_WEBHOOK_SECRET) {
      const isValid = RazorpayService.verifyWebhookSignature(bodyText, signature);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    const event = JSON.parse(bodyText);
    await dbConnect();

    // Handle Subscription Activated or Renewed
    if (event.event === 'subscription.charged' || event.event === 'subscription.activated') {
      const payload = event.payload.subscription.entity;
      const subId = payload.id;
      
      const subscription = await Subscription.findOne({ razorpaySubscriptionId: subId });
      if (subscription) {
        subscription.status = 'active';
        subscription.currentPeriodStart = new Date(payload.current_start * 1000);
        subscription.currentPeriodEnd = new Date(payload.current_end * 1000);
        
        // Add invoice record
        if (event.payload.payment) {
          const payment = event.payload.payment.entity;
          subscription.invoices.push({
            razorpayInvoiceId: payment.invoice_id || payment.id,
            amount: payment.amount / 100, // Razorpay is in paise
            status: 'paid',
            paidAt: new Date(),
          });
        }
        
        await subscription.save();

        // Sync with User model for legacy/middleware compatibility
        await User.updateMany(
          { organizationId: subscription.organizationId, role: 'admin' },
          { 
            $set: { 
              plan: subscription.plan, 
              planExpiresAt: subscription.currentPeriodEnd,
              isActive: true,
              status: 'active'
            } 
          }
        );
      }
    }

    // Handle Subscription Cancelled
    if (event.event === 'subscription.cancelled' || event.event === 'subscription.halted') {
      const subId = event.payload.subscription.entity.id;
      await Subscription.updateOne(
        { razorpaySubscriptionId: subId },
        { $set: { status: 'cancelled', cancelledAt: new Date() } }
      );
    }

    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

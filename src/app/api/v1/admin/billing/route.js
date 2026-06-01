import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Subscription from '@/lib/db/models/Subscription';
import User from '@/lib/db/models/User';
import { getAuthUser } from '@/lib/auth-util';
import { ApiResponse } from '@/lib/api-response';
import { RazorpayService } from '@/lib/razorpay';
import { SAAS_CONFIG } from '@/lib/saas-config';

export const dynamic = 'force-dynamic';

// GET current billing status
export async function GET(req) {
  try {
    await dbConnect();
    const user = await getAuthUser();
    
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return ApiResponse.forbidden('Only admins can view billing');
    }

    if (!user.organizationId) {
      return ApiResponse.badRequest('No organization associated with this account');
    }

    let subscription = await Subscription.findOne({ organizationId: user.organizationId }).lean();
    
    // If no subscription record exists, synthesize one based on the User model
    if (!subscription) {
      const dbUser = await User.findById(user.id).lean();
      subscription = {
        plan: dbUser.plan || 'trial',
        status: dbUser.plan === 'trial' ? 'trialing' : 'active',
        currentPeriodEnd: dbUser.planExpiresAt,
        invoices: []
      };
    }

    const limits = SAAS_CONFIG.getPlanLimits(subscription.plan);
    
    // In a real app, query the Employee count here to return usage
    // const employeeCount = await Employee.countDocuments({ "jobDetails.organizationId": user.organizationId });

    return ApiResponse.success({ 
      subscription,
      limits
    });

  } catch (error) {
    console.error('Error fetching billing:', error);
    return ApiResponse.error(error.message);
  }
}

// POST create checkout session
export async function POST(req) {
  try {
    await dbConnect();
    const user = await getAuthUser();
    
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return ApiResponse.forbidden();
    }

    const body = await req.json();
    const { planTier } = body;

    if (!['starter', 'growth', 'enterprise'].includes(planTier)) {
      return ApiResponse.badRequest('Invalid plan tier specified');
    }

    let subscription = await Subscription.findOne({ organizationId: user.organizationId });
    const dbUser = await User.findById(user.id);

    // 1. Create or get Razorpay Customer
    let customerId = subscription?.razorpayCustomerId;
    if (!customerId) {
      const customer = await RazorpayService.createCustomer(
        dbUser.companyName || dbUser.name,
        dbUser.email,
        dbUser.phone || ""
      );
      customerId = customer.id;
    }

    // 2. Create Razorpay Subscription
    const rzpaySub = await RazorpayService.createSubscription(customerId, planTier);

    // 3. Save pending subscription to DB
    if (!subscription) {
      subscription = await Subscription.create({
        organizationId: user.organizationId,
        userId: user.id,
        plan: planTier,
        status: 'pending',
        razorpayCustomerId: customerId,
        razorpaySubscriptionId: rzpaySub.id
      });
    } else {
      subscription.razorpaySubscriptionId = rzpaySub.id;
      subscription.plan = planTier;
      subscription.status = 'pending';
      await subscription.save();
    }

    return ApiResponse.success({ 
      checkout_url: rzpaySub.short_url,
      subscription_id: rzpaySub.id 
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return ApiResponse.error(error.message);
  }
}

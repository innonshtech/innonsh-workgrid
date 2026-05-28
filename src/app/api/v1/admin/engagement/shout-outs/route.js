import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import ShoutOut from '@/lib/db/models/engagement/ShoutOut';
import Employee from '@/lib/db/models/payroll/Employee';
import User from '@/lib/db/models/User';
import { sendEmail } from '@/lib/email/service';
import { getShoutOutTemplate } from '@/lib/email/templates/index';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function GET(req) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin", "employee"]);
        
        await dbConnect();

        // Fetch posts, populate author and shoutoutTo details
        const posts = await ShoutOut.find({})
            .sort({ createdAt: -1 })
            .populate('author', 'personalDetails.firstName personalDetails.lastName')
            .populate('shoutoutTo', 'personalDetails.firstName personalDetails.lastName')
            .populate('comments.author', 'personalDetails.firstName personalDetails.lastName');

        return NextResponse.json({ success: true, posts });
    } catch (error) {
        console.error('Fetch shoutouts error:', error);
        return NextResponse.json({ success: false, message: 'Server error: ' + error.message }, { status: error.status || 500 });
    }
}

export async function POST(req) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin", "employee"]);
        
        await dbConnect();

        const body = await req.json();

        const post = await ShoutOut.create({
            ...body,
            author: authUser.id,
            announcementByAdmin: ["admin", "hr", "company_admin", "super_admin"].includes(authUser.role) && body.type === 'announcement'
        });

        // Trigger email notification for Shout-Outs
        if (post.type === 'shoutout' && post.shoutoutTo) {
            const dashboardUrl = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL;
            const [recipient, authorEmp, authorUser] = await Promise.all([
                Employee.findById(post.shoutoutTo).select('personalDetails.email personalDetails.firstName'),
                Employee.findById(authUser.id).select('personalDetails.firstName personalDetails.lastName'),
                User.findById(authUser.id).select('name')
            ]);

            if (recipient?.personalDetails?.email) {
                let authorName = "A colleague";
                if (authorEmp) {
                    authorName = `${authorEmp.personalDetails.firstName} ${authorEmp.personalDetails.lastName}`;
                } else if (authorUser) {
                    authorName = authorUser.name;
                }

                const emailHtml = getShoutOutTemplate(authorName, post.content, dashboardUrl);

                await sendEmail({
                    to: recipient.personalDetails.email,
                    subject: `You received a Shout-Out from ${authorName}!`,
                    html: emailHtml
                });
            }
        }

        return NextResponse.json({ success: true, post }, { status: 201 });
    } catch (error) {
        console.error('Create shoutout error:', error);
        return NextResponse.json({ success: false, message: 'Server error: ' + error.message }, { status: error.status || 500 });
    }
}

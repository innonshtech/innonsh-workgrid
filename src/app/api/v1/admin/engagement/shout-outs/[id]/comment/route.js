import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import ShoutOut from '@/lib/db/models/engagement/ShoutOut';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function POST(req, { params }) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin", "employee"]);

        await dbConnect();
        const { id } = await params;
        const { text } = await req.json();

        const post = await ShoutOut.findById(id);
        if (!post) return NextResponse.json({ message: 'Post not found' }, { status: 404 });

        post.comments.push({
            author: authUser.id,
            text: text
        });

        await post.save();
        return NextResponse.json({ success: true, post });
    } catch (error) {
        console.error('Comment error:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}

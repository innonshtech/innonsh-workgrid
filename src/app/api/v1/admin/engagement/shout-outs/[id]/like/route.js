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

        const post = await ShoutOut.findById(id);
        if (!post) return NextResponse.json({ message: 'Post not found' }, { status: 404 });

        const likedIndex = post.likes.indexOf(authUser.id);
        if (likedIndex > -1) {
            // Unlike
            post.likes.splice(likedIndex, 1);
        } else {
            // Like
            post.likes.push(authUser.id);
        }

        await post.save();
        return NextResponse.json({ success: true, likesCount: post.likes.length });
    } catch (error) {
        console.error('Like error:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}

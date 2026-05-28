import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
    },
    text: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: true });

const shoutOutSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['post', 'shoutout', 'announcement', 'milestone'],
        default: 'post',
    },
    shoutoutTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee', // If it's a shoutout, who is it for?
    },
    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
        }
    ],
    comments: [commentSchema],
    attachments: [String], // URLs to images or documents
    visibility: {
        type: String,
        enum: ['public', 'department', 'private'],
        default: 'public',
    },
    announcementByAdmin: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

export default mongoose.models.ShoutOut || mongoose.model('ShoutOut', shoutOutSchema);

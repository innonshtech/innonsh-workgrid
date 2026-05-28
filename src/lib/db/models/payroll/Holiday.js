import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        default: null // If null, it's a single-day holiday
    },
    numberOfDays: {
        type: Number,
        default: 1,
        min: 1
    },
    type: {
        type: String,
        enum: ['Public', 'Company', 'Regional', 'Restricted'],
        default: 'Public'
    },
    isRestricted: {
        type: Boolean,
        default: false
    },
    holidayListId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HolidayList'
    },
    description: {
        type: String,
        trim: true
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Index for efficient lookups by organization and date
holidaySchema.index({ organizationId: 1, date: 1 });
holidaySchema.index({ date: 1 });

export default mongoose.models.Holiday || mongoose.model('Holiday', holidaySchema);

import mongoose from 'mongoose';

const holidayListSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    year: {
        type: Number,
        required: true,
        default: () => new Date().getFullYear()
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    applicableLocations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OfficeLocation'
    }],
    restrictedHolidayCount: {
        type: Number,
        default: 2, // Keka standard is usually 2 or 3
        min: 0
    },
    isDefault: {
        type: Boolean,
        default: false
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

// Ensure only one default list per organization per year
holidayListSchema.index({ organizationId: 1, year: 1, isDefault: 1 }, { 
    unique: true, 
    partialFilterExpression: { isDefault: true } 
});

// Virtual field to populate holidays belonging to this list
holidayListSchema.virtual('holidays', {
    ref: 'Holiday',
    localField: '_id',
    foreignField: 'holidayListId'
});

// Ensure virtuals are included in JSON and plain objects
holidayListSchema.set('toObject', { virtuals: true });
holidayListSchema.set('toJSON', { virtuals: true });

export default mongoose.models.HolidayList || mongoose.model('HolidayList', holidayListSchema);

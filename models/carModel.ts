import mongoose, { Schema, Document } from 'mongoose';

export interface ICar extends Document {
    carNumber: string;
    capacity: number;
    status: 'available' | 'rented' | 'maintenance';
    pricePerDay: number;
    features: string[];
    createdAt: Date;
    updatedAt: Date;
}

const CarSchema: Schema = new Schema({
    carNumber: {
        type: String,
        required: true,
        unique: true
    },
    capacity: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['available', 'rented', 'maintenance'],
        default: 'available'
    },
    pricePerDay: {
        type: Number,
        required: true
    },
    features: {
        type: [String],
        default: []
    }
}, {
    timestamps: true
});

const Car = mongoose.model<ICar>('Car', CarSchema);

export default Car;

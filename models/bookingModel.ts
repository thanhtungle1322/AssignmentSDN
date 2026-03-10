import mongoose, { Schema, Document } from 'mongoose';

export interface IBooking extends Document {
    customerName: string;
    carNumber: string;
    startDate: Date;
    endDate: Date;
    totalAmount: number;
    status: 'chờ đón' | 'đã đón' | 'hoàn thành' | 'huỷ';
    pickupAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const BookingSchema: Schema = new Schema({
    customerName: {
        type: String,
        required: true
    },
    carNumber: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['chờ đón', 'đã đón', 'hoàn thành', 'huỷ'],
        default: 'chờ đón'
    },
    pickupAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

const Booking = mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;

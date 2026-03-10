import { Request, Response } from 'express';
import Booking from '../models/bookingModel';
import Car from '../models/carModel';

// Calculate rental days
const calculateDays = (startDate: string | Date, endDate: string | Date): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
};

// Check date overlap
const checkDateOverlap = async (carNumber: string, startDate: string | Date, endDate: string | Date, excludeId: string | null = null) => {
    const query: any = { carNumber, $or: [{ startDate: { $lte: new Date(endDate as string) }, endDate: { $gte: new Date(startDate as string) } }] };
    if (excludeId) query._id = { $ne: excludeId };
    return Booking.findOne(query);
};

// ===== VIEW ROUTES (render HBS) =====

export const bookingsPage = async (req: Request, res: Response): Promise<void> => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 }).lean();
        res.render('bookings/index', { title: 'Quản lý Đặt xe', activeBookings: 'active', bookings });
    } catch (error: any) {
        res.status(500).render('error', { title: 'Lỗi', message: 'Không thể tải danh sách đặt xe', error: error.message });
    }
};

export const createBookingPage = async (req: Request, res: Response): Promise<void> => {
    try {
        const cars = await Car.find({ status: { $ne: 'maintenance' } }).lean();
        res.render('bookings/create', { title: 'Tạo Đặt xe mới', activeBookings: 'active', cars });
    } catch (error: any) {
        res.status(500).render('error', { title: 'Lỗi', message: 'Không thể tải form tạo đặt xe', error: error.message });
    }
};

export const editBookingPage = async (req: Request, res: Response): Promise<void> => {
    try {
        const booking = await Booking.findById(req.params.bookingId).lean();
        if (!booking) { res.status(404).render('error', { title: 'Lỗi', message: 'Không tìm thấy đơn đặt xe', error: null }); return; }
        const cars = await Car.find().lean();
        res.render('bookings/edit', { title: 'Sửa Đặt xe', activeBookings: 'active', booking, cars });
    } catch (error: any) {
        res.status(500).render('error', { title: 'Lỗi', message: 'Không thể tải đơn đặt xe', error: error.message });
    }
};

// ===== API ROUTES (return JSON) =====

export const createBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        const { customerName, carNumber, startDate, endDate } = req.body;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) { res.status(400).json({ message: 'End date must be after start date' }); return; }

        const car = await Car.findOne({ carNumber });
        if (!car) { res.status(404).json({ message: 'Car not found' }); return; }
        if (car.status === 'maintenance') { res.status(400).json({ message: 'Car is under maintenance' }); return; }

        const overlap = await checkDateOverlap(carNumber, startDate, endDate);
        if (overlap) { res.status(400).json({ message: 'Booking dates overlap with an existing booking', conflictingBooking: overlap }); return; }

        const numberOfDays = calculateDays(startDate, endDate);
        const totalAmount = numberOfDays * car.pricePerDay;

        const booking = new Booking({ customerName, carNumber, startDate: start, endDate: end, totalAmount });
        const savedBooking = await booking.save();
        await Car.findOneAndUpdate({ carNumber }, { status: 'rented' });
        res.status(201).json(savedBooking);
    } catch (error: any) { res.status(400).json({ message: error.message }); }
};

export const updateBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        const { bookingId } = req.params;
        const { customerName, carNumber, startDate, endDate } = req.body;
        const existing = await Booking.findById(bookingId);
        if (!existing) { res.status(404).json({ message: 'Booking not found' }); return; }

        if (startDate && endDate) {
            if (new Date(endDate) <= new Date(startDate)) { res.status(400).json({ message: 'End date must be after start date' }); return; }
            const overlap = await checkDateOverlap(carNumber || existing.carNumber, startDate, endDate, bookingId as string);
            if (overlap) { res.status(400).json({ message: 'Booking dates overlap', conflictingBooking: overlap }); return; }
        }

        let totalAmount = existing.totalAmount;
        const finalCar = carNumber || existing.carNumber;
        const finalStart = startDate || existing.startDate;
        const finalEnd = endDate || existing.endDate;

        if (startDate || endDate || carNumber) {
            const car = await Car.findOne({ carNumber: finalCar });
            if (!car) { res.status(404).json({ message: 'Car not found' }); return; }
            totalAmount = calculateDays(finalStart, finalEnd) * car.pricePerDay;
        }

        const updated = await Booking.findByIdAndUpdate(bookingId, {
            customerName: customerName || existing.customerName, carNumber: finalCar, startDate: finalStart, endDate: finalEnd, totalAmount
        }, { new: true, runValidators: true });
        res.status(200).json(updated);
    } catch (error: any) { res.status(400).json({ message: error.message }); }
};

export const deleteBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        const booking = await Booking.findByIdAndDelete(req.params.bookingId);
        if (!booking) { res.status(404).json({ message: 'Booking not found' }); return; }
        const otherBookings = await Booking.findOne({ carNumber: booking.carNumber });
        if (!otherBookings) { await Car.findOneAndUpdate({ carNumber: booking.carNumber }, { status: 'available' }); }
        res.status(200).json({ message: 'Booking deleted successfully' });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const pickupCar = async (req: Request, res: Response): Promise<void> => {
    try {
        const customerName = req.cookies.customerName;
        if (!customerName) { res.status(401).json({ message: 'Unauthorized: customerName cookie is required' }); return; }

        const booking = await Booking.findById(req.params.bookingId);
        if (!booking) { res.status(404).json({ message: 'Booking not found' }); return; }
        if (booking.customerName !== customerName) { res.status(403).json({ message: 'Forbidden: You are not the owner of this booking' }); return; }
        if (booking.status === 'đã đón') { res.status(400).json({ message: 'Car has already been picked up' }); return; }
        if (booking.status === 'hoàn thành' || booking.status === 'huỷ') { res.status(400).json({ message: `Cannot pickup. Status: ${booking.status}` }); return; }

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startDate = new Date(booking.startDate);
        if (startDate < today) { res.status(400).json({ message: 'Cannot pickup: startDate is before today' }); return; }

        const updated = await Booking.findByIdAndUpdate(req.params.bookingId, { status: 'đã đón', pickupAt: now }, { new: true });
        res.status(200).json({ message: 'Car picked up successfully', booking: updated });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
};

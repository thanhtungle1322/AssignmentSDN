import { Request, Response } from 'express';
import Car from '../models/carModel';

// ===== VIEW ROUTES (render HBS) =====

export const carsPage = async (req: Request, res: Response): Promise<void> => {
    try {
        const cars = await Car.find().lean();
        res.render('cars/index', { title: 'Quản lý Xe', activeCars: 'active', cars });
    } catch (error: any) {
        res.status(500).render('error', { title: 'Lỗi', message: 'Không thể tải danh sách xe', error: error.message });
    }
};

export const createCarPage = (req: Request, res: Response): void => {
    res.render('cars/create', { title: 'Thêm Xe mới', activeCars: 'active' });
};

export const editCarPage = async (req: Request, res: Response): Promise<void> => {
    try {
        const car = await Car.findOne({ carNumber: req.params.carNumber }).lean();
        if (!car) {
            res.status(404).render('error', { title: 'Lỗi', message: 'Không tìm thấy xe', error: null });
            return;
        }
        res.render('cars/edit', { title: 'Sửa Xe', activeCars: 'active', car });
    } catch (error: any) {
        res.status(500).render('error', { title: 'Lỗi', message: 'Không thể tải thông tin xe', error: error.message });
    }
};

// ===== API ROUTES (return JSON) =====

export const createCar = async (req: Request, res: Response): Promise<void> => {
    try {
        const { carNumber, capacity, status, pricePerDay, features } = req.body;
        const existingCar = await Car.findOne({ carNumber });
        if (existingCar) {
            res.status(400).json({ message: 'Car with this number already exists' });
            return;
        }
        const car = new Car({ carNumber, capacity, status: status || 'available', pricePerDay, features: features || [] });
        const savedCar = await car.save();
        res.status(201).json(savedCar);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const updateCar = async (req: Request, res: Response): Promise<void> => {
    try {
        const car = await Car.findOneAndUpdate({ carNumber: req.params.carNumber }, req.body, { new: true, runValidators: true });
        if (!car) { res.status(404).json({ message: 'Car not found' }); return; }
        res.status(200).json(car);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteCar = async (req: Request, res: Response): Promise<void> => {
    try {
        const car = await Car.findOneAndDelete({ carNumber: req.params.carNumber });
        if (!car) { res.status(404).json({ message: 'Car not found' }); return; }
        res.status(200).json({ message: 'Car deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

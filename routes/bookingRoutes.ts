import { Router } from 'express';
import * as bookingController from '../controllers/bookingController';

const router = Router();

// View routes (render EJS pages)
router.get('/', bookingController.bookingsPage);
router.get('/create', bookingController.createBookingPage);
router.get('/edit/:bookingId', bookingController.editBookingPage);

// API routes (JSON)
router.post('/', bookingController.createBooking);
router.put('/:bookingId', bookingController.updateBooking);
router.delete('/:bookingId', bookingController.deleteBooking);
router.patch('/:bookingId/pickup', bookingController.pickupCar);

export default router;

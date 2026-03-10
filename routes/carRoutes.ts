import { Router } from 'express';
import * as carController from '../controllers/carController';

const router = Router();

// View routes (render EJS pages)
router.get('/', carController.carsPage);
router.get('/create', carController.createCarPage);
router.get('/edit/:carNumber', carController.editCarPage);

// API routes (JSON)
router.post('/', carController.createCar);
router.put('/:carNumber', carController.updateCar);
router.delete('/:carNumber', carController.deleteCar);

export default router;

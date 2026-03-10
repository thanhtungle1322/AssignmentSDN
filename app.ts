import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { engine } from 'express-handlebars';

// Import routes
import carRoutes from './routes/carRoutes';
import bookingRoutes from './routes/bookingRoutes';
import authRoutes from './routes/authRoutes';

// Import middleware
import { protect, setUserLocals } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/carRental';

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB successfully');
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error);
    });

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// View engine setup - Handlebars
app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(process.cwd(), 'views', 'layouts'),
    helpers: {
        eq: function (this: any, a: any, b: any, options: any) {
            return a === b ? options.fn(this) : options.inverse(this);
        },
        formatNumber: function (num: number) {
            if (num == null) return '0';
            return num.toLocaleString('vi-VN');
        },
        formatDate: function (date: Date | string) {
            if (!date) return '—';
            return new Date(date).toLocaleDateString('vi-VN');
        },
        formatDateTime: function (date: Date | string) {
            if (!date) return '—';
            return new Date(date).toLocaleString('vi-VN');
        },
        dateToISO: function (date: Date | string) {
            if (!date) return '';
            return new Date(date).toISOString().split('T')[0];
        },
        joinArray: function (arr: string[]) {
            if (!arr || !arr.length) return '';
            return arr.join(', ');
        },
        multiply: function (a: number, b: number) {
            return a * b;
        },
        initial: function (name: string) {
            if (!name) return '?';
            return name.charAt(0).toUpperCase();
        },
        shortId: function (id: string) {
            if (!id) return '';
            return String(id).substring(0, 8);
        }
    }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(process.cwd(), 'views'));

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(process.cwd(), 'public')));

// Set user info in all views (for navbar)
app.use(setUserLocals);

// Auth routes (public - no protection)
app.use('/auth', authRoutes);

// Home page (public)
app.get('/', (req: Request, res: Response) => {
    res.render('index', { title: 'Trang chủ', activeHome: 'active' });
});

// Protected routes (require login)
app.use('/cars', protect, carRoutes);
app.use('/bookings', protect, bookingRoutes);

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).render('error', {
        title: 'Lỗi',
        message: 'Đã có lỗi xảy ra!',
        error: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚗 Car Rental Server is running on http://localhost:${PORT}`);
});

export default app;

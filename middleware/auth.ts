import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_COOKIE_NAME } from '../config/auth';
import User, { IUser } from '../models/userModel';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: IUser;
        }
    }
}

// Protect routes - require authentication
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        let token: string | undefined;

        // Check cookie first
        if (req.cookies && req.cookies[JWT_COOKIE_NAME]) {
            token = req.cookies[JWT_COOKIE_NAME];
        }
        // Check Authorization header
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            // If it's an API request, return JSON
            if (req.headers.accept?.includes('application/json') || req.path.startsWith('/api')) {
                res.status(401).json({ message: 'Unauthorized: Please login' });
                return;
            }
            // Otherwise redirect to login page
            res.redirect('/auth/login');
            return;
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            if (req.headers.accept?.includes('application/json')) {
                res.status(401).json({ message: 'User not found' });
                return;
            }
            res.redirect('/auth/login');
            return;
        }

        req.user = user;
        next();
    } catch (error) {
        if (req.headers.accept?.includes('application/json') || req.path.startsWith('/api')) {
            res.status(401).json({ message: 'Invalid token' });
            return;
        }
        res.redirect('/auth/login');
    }
};

// Admin only middleware
export const adminOnly = (req: Request, res: Response, next: NextFunction): void => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).render('error', {
            title: 'Lỗi',
            message: 'Bạn không có quyền truy cập trang này',
            error: 'Chỉ admin mới được phép thực hiện thao tác này'
        });
    }
};

// Middleware to pass user info to all views (for navbar)
export const setUserLocals = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = req.cookies?.[JWT_COOKIE_NAME];
        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
            const user = await User.findById(decoded.id).select('-password');
            if (user) {
                req.user = user;
                res.locals.currentUser = {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                };
            }
        }
    } catch (error) {
        // Token invalid - ignore, user just won't be logged in
    }
    next();
};

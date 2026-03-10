import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/userModel';
import { JWT_SECRET, JWT_EXPIRES_IN, JWT_COOKIE_NAME, JWT_COOKIE_OPTIONS } from '../config/auth';

// Generate JWT token
const generateToken = (id: string, role: string): string => {
    return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: 604800 }); // 7 days in seconds
};

// ===== VIEW ROUTES =====

export const loginPage = (req: Request, res: Response): void => {
    if (req.user) { res.redirect('/'); return; }
    res.render('auth/login', { title: 'Đăng nhập', layout: 'auth' });
};

export const registerPage = (req: Request, res: Response): void => {
    if (req.user) { res.redirect('/'); return; }
    res.render('auth/register', { title: 'Đăng ký', layout: 'auth' });
};

// ===== API ROUTES =====

// POST /auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, email, password, confirmPassword } = req.body;

        // Validate
        if (!username || !email || !password) {
            res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
            return;
        }
        if (password !== confirmPassword) {
            res.status(400).json({ message: 'Mật khẩu xác nhận không khớp' });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
            return;
        }

        // Check existing user
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            res.status(400).json({ message: 'Username hoặc email đã tồn tại' });
            return;
        }

        // Create user
        const user = new User({ username, email, password });
        await user.save();

        // Generate token
        const token = generateToken(String(user._id), user.role);

        // Set cookie
        res.cookie(JWT_COOKIE_NAME, token, JWT_COOKIE_OPTIONS);

        res.status(201).json({
            message: 'Đăng ký thành công',
            user: { id: user._id, username: user.username, email: user.email, role: user.role },
            token
        });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// POST /auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
            return;
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
            return;
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
            return;
        }

        // Generate token
        const token = generateToken(String(user._id), user.role);

        // Set cookie
        res.cookie(JWT_COOKIE_NAME, token, JWT_COOKIE_OPTIONS);

        res.status(200).json({
            message: 'Đăng nhập thành công',
            user: { id: user._id, username: user.username, email: user.email, role: user.role },
            token
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// POST /auth/logout
export const logout = (req: Request, res: Response): void => {
    res.clearCookie(JWT_COOKIE_NAME);
    res.redirect('/auth/login');
};

// GET /auth/me - Get current user
export const getMe = (req: Request, res: Response): void => {
    if (!req.user) {
        res.status(401).json({ message: 'Not authenticated' });
        return;
    }
    res.json({
        user: { id: req.user._id, username: req.user.username, email: req.user.email, role: req.user.role }
    });
};

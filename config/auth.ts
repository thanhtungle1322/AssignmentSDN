export const JWT_SECRET = process.env.JWT_SECRET || 'car_rental_jwt_secret_key_2026';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
export const JWT_COOKIE_NAME = 'token';
export const JWT_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax' as const
};

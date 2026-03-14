import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const protect = async (req, res, next) => {
    let token;

    //check if token exists in authorization header and starts with Bearer
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            //Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');

            if(!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Not authorized, user not found',
                    statusCode: 401 
                });
            }


            next();
        } 
        catch (error) {
            console.error('Auth verification error:', error.message );

            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Not authorized, token expired',
                    statusCode: 401
                });
            }

            return res.status(401).json({
                success: false,
                error: 'Not authorized, token failed'
            });
        }
    }
    if (!token) {   
        return res.status(401).json({
            success: false,
            error: 'Not authorized, no token'
        });
    }
};

export { protect };
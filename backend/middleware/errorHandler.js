const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    //Mongoose bad ObjectId error
    if (err.name === "CastError") {
        message = `Resource not found `;
        statusCode = 400;
    }

    //Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        message = `Duplicate field value entered for ${field}`;
        statusCode = 400;
    }

    //Mongoose validation error
    if (err.name === "ValidationError") {
        message = Object.values(err.errors).map((val) => val.message).join(", ");
        statusCode = 400;
    }

    //Multer file size error
    if(err.code === "LIMIT_FILE_SIZE"){
        message = "File size is too large. Max limit is 10MB";
        statusCode = 400;
    }

    //JWT error
    if (err.name === "JsonWebTokenError") {
        message = "Invalid token. Please log in again.";
        statusCode = 401;
    }

    if (err.name === "TokenExpiredError") {
        message = "Your token has expired. Please log in again.";
        statusCode = 401;
    }   
    
    console.error('Error:',{
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    res.status(statusCode).json({
        success: false,
        error: message,
        statusCode,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};
export default errorHandler;
    
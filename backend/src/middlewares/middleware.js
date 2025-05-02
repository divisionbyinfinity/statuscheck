const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

const checkAuthorazation = (req, res, next) => {
    console.log("head=",req.headers)
    try {
        if (!req.headers.authorization) {
            return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
        }
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
    }
    };
exports.checkAuthorazation = checkAuthorazation;
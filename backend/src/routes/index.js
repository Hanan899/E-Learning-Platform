const express = require('express');
const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const courseRoutes = require('./courseRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/courses', courseRoutes);

module.exports = router;

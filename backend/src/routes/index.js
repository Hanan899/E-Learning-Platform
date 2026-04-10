const express = require('express');
const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const assignmentRoutes = require('./assignments');
const contentRoutes = require('./contentRoutes');
const courseRoutes = require('./courseRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/', assignmentRoutes);
router.use('/', contentRoutes);
router.use('/courses', courseRoutes);

module.exports = router;

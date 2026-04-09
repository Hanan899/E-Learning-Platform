const express = require('express');
const authRoutes = require('./authRoutes');
const courseRoutes = require('./courseRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);

module.exports = router;

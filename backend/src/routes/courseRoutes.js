const express = require('express');
const { listCourses } = require('../controllers/courseController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, listCourses);

module.exports = router;

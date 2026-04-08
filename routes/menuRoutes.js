const express = require('express');
const router = express.Router();
const { getMenuItems, getMenuItem } = require('../controllers/menuController');

router.get('/', getMenuItems);
router.get('/:id', getMenuItem);

module.exports = router;

const MenuItem = require('../models/MenuItem');

// @desc    Get all menu items (with search, pagination, category filter)
// @route   GET /api/menu
exports.getMenuItems = async (req, res, next) => {
    try {
        const { category, search, page, limit: limitParam } = req.query;

        // Build filter
        const filter = { isActive: true };

        if (category) {
            filter.category = category;
        }

        if (search) {
            filter.$text = { $search: search };
        }

        // Pagination
        const pageNum = parseInt(page) || 1;
        const limit = parseInt(limitParam) || 100;
        const skip = (pageNum - 1) * limit;

        const total = await MenuItem.countDocuments(filter);
        const items = await MenuItem.find(filter)
            .sort(search ? { score: { $meta: 'textScore' } } : { category: 1, name: 1 })
            .skip(skip)
            .limit(limit);

        // Group by category
        const grouped = {};
        items.forEach(item => {
            if (!grouped[item.category]) {
                grouped[item.category] = [];
            }
            grouped[item.category].push(item);
        });

        res.json({
            success: true,
            count: items.length,
            total,
            page: pageNum,
            pages: Math.ceil(total / limit),
            data: grouped
        });
    } catch (error) {
        // Fallback: if text index not ready, use regex search
        if (error.code === 27 && req.query.search) {
            try {
                const filter = { isActive: true };
                const regex = new RegExp(req.query.search, 'i');
                filter.$or = [{ name: regex }, { description: regex }];

                if (req.query.category) filter.category = req.query.category;

                const items = await MenuItem.find(filter).sort({ category: 1, name: 1 });
                const grouped = {};
                items.forEach(item => {
                    if (!grouped[item.category]) grouped[item.category] = [];
                    grouped[item.category].push(item);
                });

                return res.json({
                    success: true,
                    count: items.length,
                    total: items.length,
                    page: 1,
                    pages: 1,
                    data: grouped
                });
            } catch (fallbackError) {
                return next(fallbackError);
            }
        }
        next(error);
    }
};

// @desc    Get single menu item
// @route   GET /api/menu/:id
exports.getMenuItem = async (req, res, next) => {
    try {
        const item = await MenuItem.findById(req.params.id);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }
        res.json({ success: true, data: item });
    } catch (error) {
        next(error);
    }
};

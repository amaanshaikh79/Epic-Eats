const Contact = require('../models/Contact');

// @desc    Submit a contact form message
// @route   POST /api/contact
exports.submitContactForm = async (req, res, next) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please fill in all required fields (name, email, subject, message)'
            });
        }

        const contact = await Contact.create({
            name,
            email,
            phone: phone || '',
            subject,
            message
        });

        res.status(201).json({
            success: true,
            message: 'Thank you! Your message has been sent successfully.',
            data: { id: contact._id }
        });
    } catch (error) {
        next(error);
    }
};

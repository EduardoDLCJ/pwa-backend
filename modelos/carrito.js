const mongoose = require('mongoose');

const carritoSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        productId: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 }
    }],
    updatedAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Carrito', carritoSchema);



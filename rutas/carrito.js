const express = require('express');
const router = express.Router();
const Carrito = require('../modelos/carrito');

// Crear o actualizar carrito (agregar producto)
router.post('/', async (req, res) => {
    const { userId, items } = req.body;
    try {
        let carrito = await Carrito.findOne({ userId });
        if (carrito) {
            // Si el producto ya está en el carrito, actualiza la cantidad
            items.forEach(item => {
                const index = carrito.items.findIndex(i => i.productId === item.productId);
                if (index > -1) {
                    carrito.items[index].quantity += item.quantity;
                } else {
                    carrito.items.push(item);
                }
            });
            carrito.updatedAt = Date.now();
            await carrito.save();
        } else {
            carrito = new Carrito({ userId, items });
            await carrito.save();
        }
        res.status(200).json(carrito);
    } catch (error) {
        res.status(500).json({ message: 'Error al agregar al carrito', error: error.message });
    }
});

// Obtener carrito por usuario
router.get('/:userId', async (req, res) => {
    try {
        const carrito = await Carrito.findOne({ userId: req.params.userId });
        if (!carrito) {
            return res.status(404).json({ message: 'Carrito no encontrado' });
        }
        res.json(carrito);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el carrito', error: error.message });
    }
});

// Actualizar carrito completo
router.put('/:userId', async (req, res) => {
    try {
        const carrito = await Carrito.findOneAndUpdate(
            { userId: req.params.userId },
            { items: req.body.items, updatedAt: Date.now() },
            { new: true }
        );
        if (!carrito) {
            return res.status(404).json({ message: 'Carrito no encontrado' });
        }
        res.json(carrito);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar el carrito', error: error.message });
    }
});

// Eliminar carrito por usuario
router.delete('/:userId', async (req, res) => {
    try {
        const carrito = await Carrito.findOneAndDelete({ userId: req.params.userId });
        if (!carrito) {
            return res.status(404).json({ message: 'Carrito no encontrado' });
        }
        res.json({ message: 'Carrito eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el carrito', error: error.message });
    }
});

module.exports = router;
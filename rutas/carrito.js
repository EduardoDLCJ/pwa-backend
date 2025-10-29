const express = require('express');
const router = express.Router();
const Carrito = require('../modelos/carrito');
const Subscription = require('../modelos/subscription');
const webpush = require('../webpush');

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
        // Enviar notificación push a este usuario si tiene suscripción
        try {
            const subs = await Subscription.find({ userId });
            if (subs && subs.length > 0) {
                const added = items && items[0] ? items[0] : null;
                const productText = added ? `${added.productId} x${added.quantity}` : 'Producto agregado';
                const payload = JSON.stringify({
                    title: '🛒 Producto agregado al carrito',
                    body: productText
                });
                for (const sub of subs) {
                    try {
                        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
                    } catch (e) {
                        // continuar con siguientes
                    }
                }
            }
        } catch (e) {
            // no bloquear respuesta por errores de push
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
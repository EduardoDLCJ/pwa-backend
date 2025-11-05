const mongoose = require('mongoose');
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const app = express(); 
const PORT = process.env.PORT || 4001;
const bodyParser = require('body-parser');
const webpush = require('./webpush');


// webpush ya está configurado en ./webpush



const userRoutes = require('./rutas/usuarios');
const carritoRoutes = require('./rutas/carrito');
const Subscription = require('./modelos/subscription');
const User = require('./modelos/users');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conexión exitosa a MongoDB'))
  .catch((error) => console.error('Error conectando a MongoDB:', error));

// Función para hacer ping a la base de datos
function pingDatabase() {
  const db = mongoose.connection;
  
  if (db.readyState === 1) {
    // La conexión está activa, hacer ping
    db.db.admin().ping()
      .then(() => {
        console.log(`[${new Date().toISOString()}] ✅ Ping exitoso a MongoDB`);
      })
      .catch((error) => {
        console.error(`[${new Date().toISOString()}] ❌ Error en ping a MongoDB:`, error.message);
      });
  } else {
    console.log(`[${new Date().toISOString()}] ⚠️  Base de datos no conectada. Estado: ${db.readyState}`);
  }
}
// Configurar ping cada 10 segundos
setInterval(pingDatabase, 10000);
// Hacer el primer ping inmediatamente
pingDatabase();


// Middlewares antes de endpoints
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// ---- Guardar Suscripción desde el frontend (por usuario) ----
app.post("/api/subscribe", async (req, res) => {
  try {
    const { userId, subscription } = req.body || {};
    if (!userId || !subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ message: 'Parámetros inválidos' });
    }

    // Buscar si ya existe una suscripción con este endpoint (mismo dispositivo)
    let saved = await Subscription.findOne({ endpoint: subscription.endpoint });
    
    if (saved) {
      // Si existe, actualizar el userId por si el usuario cambió
      saved.userId = userId;
      await saved.save();
    } else {
      // Si no existe, crear una nueva suscripción (permite múltiples dispositivos por usuario)
      saved = await Subscription.create({
        userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys
      });
    }

    // Marcar usuario como suscrito
    await User.findByIdAndUpdate(userId, { notificationSubscribed: 'true' }).catch(() => {});

    return res.status(201).json({ message: 'Suscripción guardada', subscription: saved });
  } catch (err) {
    // Si es error de duplicado, intentar actualizar
    if (err.code === 11000) {
      try {
        const saved = await Subscription.findOneAndUpdate(
          { endpoint: subscription.endpoint },
          { userId, keys: subscription.keys },
          { new: true }
        );
        await User.findByIdAndUpdate(userId, { notificationSubscribed: 'true' }).catch(() => {});
        return res.status(200).json({ message: 'Suscripción actualizada', subscription: saved });
      } catch (updateErr) {
        return res.status(500).json({ message: 'Error actualizando suscripción', error: updateErr.message });
      }
    }
    return res.status(500).json({ message: 'Error guardando suscripción', error: err.message });
  }
});


// ---- Enviar notificación ----
app.post("/api/send-push", async (req, res) => {
  try {
    const { userId, title, body } = req.body || {};
    const query = userId ? { userId } : {};
    const subs = await Subscription.find(query);
    
    if (subs.length === 0) {
      return res.status(404).json({ message: 'No se encontraron suscripciones para este usuario' });
    }
    
    let finalBody = body;
    if (userId) {
      try {
        const user = await User.findById(userId).lean();
        if (user && user.username) {
          finalBody = `${user.username}: ${body || ''}`.trim();
        }
      } catch (_) {}
    }
    const payload = JSON.stringify({ title, body: finalBody });
    
    let sentCount = 0;
    let failedCount = 0;
    const invalidSubs = [];
    
    for (const sub of subs) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
        sentCount++;
      } catch (err) {
        failedCount++;
        console.error('Error al enviar push:', err);
        // Si la suscripción es inválida (410 Gone, 404 Not Found), marcarla para eliminar
        if (err.statusCode === 410 || err.statusCode === 404) {
          invalidSubs.push(sub._id);
        }
      }
    }
    
    // Eliminar suscripciones inválidas
    if (invalidSubs.length > 0) {
      await Subscription.deleteMany({ _id: { $in: invalidSubs } });
      console.log(`Eliminadas ${invalidSubs.length} suscripciones inválidas`);
    }
    
    return res.json({ 
      message: 'Notificaciones enviadas.', 
      total: subs.length,
      sent: sentCount,
      failed: failedCount,
      invalidRemoved: invalidSubs.length
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error enviando push', error: err.message });
  }
});
app.use('/carrito', carritoRoutes);
app.use('/users', userRoutes);

app.listen(PORT, '0.0.0.0', () => console.log(`Servidor escuchando en puerto ${PORT}`));
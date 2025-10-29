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

    const saved = await Subscription.findOneAndUpdate(
      { userId },
      {
        userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Marcar usuario como suscrito
    await User.findByIdAndUpdate(userId, { notificationSubscribed: 'true' }).catch(() => {});

    return res.status(201).json({ message: 'Suscripción guardada', subscription: saved });
  } catch (err) {
    return res.status(500).json({ message: 'Error guardando suscripción', error: err.message });
  }
});


// ---- Enviar notificación ----
app.post("/api/send-push", async (req, res) => {
  try {
    const { userId, title, body } = req.body || {};
    const query = userId ? { userId } : {};
    const subs = await Subscription.find(query);
    const payload = JSON.stringify({ title, body });
    for (const sub of subs) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
      } catch (err) {
        console.error('Error al enviar push:', err);
      }
    }
    return res.json({ message: 'Notificaciones enviadas.', count: subs.length });
  } catch (err) {
    return res.status(500).json({ message: 'Error enviando push', error: err.message });
  }
});
app.use('/carrito', carritoRoutes);
app.use('/users', userRoutes);

app.listen(PORT, '0.0.0.0', () => console.log(`Servidor escuchando en puerto ${PORT}`));
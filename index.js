const mongoose = require('mongoose');
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const app = express(); 
const PORT = process.env.PORT || 4001;
const webpush = require('web-push');
const bodyParser = require('body-parser');


// (coloca las tuyas aquí)
const publicVapidKey = "BBR2W5ZrA8jgnh1dB_vbVAzu4PVS5t81sXyv_B-bdbkUCUd0d-ZglMsXTHcJTIRa7RY9erDAcm0NlkYkZnZ2DgY";
const privateVapidKey = "BIdljMrJYmsTBR27TdujeT8vZtxzStasvFIu__7W8OU";

webpush.setVapidDetails(
  "mailto:tucorreo@ejemplo.com",
  publicVapidKey,
  privateVapidKey
);



const userRoutes = require('./rutas/usuarios');
const carritoRoutes = require('./rutas/carrito');

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


// ---- Modelo de Suscripción ----
const SubscriptionSchema = new mongoose.Schema({
  endpoint: String,
  keys: Object,
});
const Subscription = mongoose.model("Subscription", SubscriptionSchema);

// ---- Guardar Suscripción desde el frontend ----
app.post("/api/subscribe", async (req, res) => {
  const subscription = req.body;

  await Subscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    subscription,
    { upsert: true }
  );

  res.status(201).json({ message: "Suscripción guardada." });
});


// ---- Enviar notificación ----
app.post("/api/send-push", async (req, res) => {
  const { title, body } = req.body;

  const allSubs = await Subscription.find();

  const payload = JSON.stringify({
    title,
    body,
  });

  for (let sub of allSubs) {
    try {
      await webpush.sendNotification(sub, payload);
    } catch (err) {
      console.error("Error al enviar push:", err);
    }
  }

  res.json({ message: "Notificaciones enviadas." });
});

app.use(bodyParser.json());
app.use(cors());
app.use(express.json());
app.use('/carrito', carritoRoutes);
app.use('/users', userRoutes);

app.listen(PORT, '0.0.0.0', () => console.log(`Servidor escuchando en puerto ${PORT}`));
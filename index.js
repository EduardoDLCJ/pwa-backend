const mongoose = require('mongoose');
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const app = express(); 
const PORT = process.env.PORT || 4001;


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

app.use(cors());
app.use(express.json());
app.use('/carrito', carritoRoutes);
app.use('/users', userRoutes);

app.listen(PORT, '0.0.0.0', () => console.log(`Servidor escuchando en puerto ${PORT}`));
const express = require('express');
const router = express.Router();
const webpush = require('web-push');

// Configuración de Web Push (VAPID)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Almacenamiento en memoria de suscripciones (para demo)
const pushSubscriptions = new Set();

// Endpoint para obtener la clave pública VAPID
router.get('/vapidPublicKey', (req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    return res.status(500).json({ message: 'VAPID_PUBLIC_KEY no configurada' });
  }
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Suscripción de un cliente
router.post('/subscribe', (req, res) => {
  try {
    const subscription = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ message: 'Suscripción inválida' });
    }
    pushSubscriptions.add(JSON.stringify(subscription));
    return res.status(201).json({ message: 'Suscrito correctamente' });
  } catch (err) {
    return res.status(500).json({ message: 'Error al suscribir', error: err.message });
  }
});

// Enviar notificación de prueba a todas las suscripciones
async function notifyAll(payload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error('VAPID no configurado en el servidor');
  }
  const errors = [];
  const successes = [];
  await Promise.all(Array.from(pushSubscriptions).map(async (subStr) => {
    const subscription = JSON.parse(subStr);
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      successes.push(subscription.endpoint);
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        pushSubscriptions.delete(subStr);
      } else {
        errors.push({ endpoint: subscription.endpoint, error: err.message });
      }
    }
  }));
  return { sent: successes.length, errors };
}

router.post('/notify', async (req, res) => {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return res.status(500).json({ message: 'VAPID no configurado en el servidor' });
  }
  const payload = req.body && Object.keys(req.body).length > 0 ? req.body : {
    title: 'Notificación de prueba',
    body: 'Hola desde el backend!',
    icon: '/icon-192.svg',
    url: '/'
  };

  const result = await notifyAll(payload);
  res.json(result);
});

module.exports = { router, notifyAll };



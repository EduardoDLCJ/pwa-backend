const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
	endpoint: { type: String, required: true, unique: true },
	keys: {
		auth: { type: String, required: true },
		p256dh: { type: String, required: true }
	}
}, { timestamps: true });

// Índice para buscar suscripciones por usuario (sin unique para permitir múltiples dispositivos)
subscriptionSchema.index({ userId: 1 });
// Índice único en endpoint para evitar duplicados del mismo dispositivo
subscriptionSchema.index({ endpoint: 1 }, { unique: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);



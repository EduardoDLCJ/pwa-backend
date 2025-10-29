const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
	endpoint: { type: String, required: true },
	keys: {
		auth: { type: String, required: true },
		p256dh: { type: String, required: true }
	}
}, { timestamps: true });

subscriptionSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);



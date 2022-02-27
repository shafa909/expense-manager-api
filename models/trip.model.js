const mongoose = require('mongoose');

const Trip = new mongoose.Schema(
	{
		name: { type: String, required: true, unique: true },
		desc: { type: String, required: true },
		created_by: { type: String, required: true },
		member_ids: { type: Array, default: [] },
	},
	{ timestamps: true },
	{ collection: 'trips' }
);

const model = mongoose.model('TripData', Trip);
module.exports = model;
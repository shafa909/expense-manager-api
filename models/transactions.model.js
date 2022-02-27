const mongoose = require('mongoose');

const Transaction = new mongoose.Schema(
	{
		expense_id: { type: String, required: true },
		member_id: { type: String, required: true },
		amount: { type: Number, required: true },
		paid_amount: { type: Number, required: true, default: 0 },
	},
	{ timestamps: true },
	{ collection: 'Transactions-Data' }
);

const model = mongoose.model('TransactionData', Transaction);
module.exports = model;
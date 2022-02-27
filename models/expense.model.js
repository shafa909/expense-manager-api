const mongoose = require('mongoose');

const Expense = new mongoose.Schema(
	{
		trip_id: { type: String, required: true },
		name: { type: String, required: true },
		amount: { type: Number, required: true },
		created_by: { type: String, required: true },
	},
	{ timestamps: true },
	{ collection: 'Expenses-data' }
);

const model = mongoose.model('ExpenseData', Expense);
module.exports = model;
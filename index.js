const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
var indexRouter = require('./routes/index');

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/', {
	dbName: 'expense_db',
	useNewUrlParser: true,
	useUnifiedTopology: true
}, err => err ? console.log(err) : console.log('Connected to database'));

app.use('/api', indexRouter);

app.listen(8800, () => {
	console.log('Server started on 8800');
});
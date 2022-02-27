const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const User = require('../models/user.model');
const Trip = require('../models/trip.model');
const Expense = require('../models/expense.model');
const Transaction = require('../models/transactions.model');

async function registerUser(req, res) {
    const newPassword = await bcrypt.hash(req.body.password, 10)
    try {
        const fromDB = await User.findOne({
            email: req.body.email.toLowerCase()
        })
        if (fromDB) return res.status(409).send({ error: 'Duplicate Email' })
        const user = await User.create({
            name: req.body.name,
            email: req.body.email,
            password: newPassword,
        })
        return res.status(201).send({ email: user.email })
    } catch (err) {
        return res.status(500).send({ error: 'Some thing Went Wrong' })
    }
}

async function loginUser(req, res) {
    try {
        const user = await User.findOne({
            email: req.body.email,
        })
        if (!user) {
            return res.status(404).send({ error: 'User not found' })
        }
        const isPasswordValid = await bcrypt.compare(
            req.body.password,
            user.password
        )
        if (isPasswordValid) {
            const token = jwt.sign(
                {
                    user_id: user.id,
                    name: user.name,
                },
                'secret123'
            )
            return res.status(201).send({ user: token, user_name: user.name, user_id: user.id })
        } else {
            return res.status(401).send({ error: 'Invalid Password' })
        }
    } catch (err) {
        return res.status(500).send({ error: 'Some thing Went Wrong' })
    }
}

async function getUser(req, res) {
    try {
        const user = await User.findOne({
            id: req.body.userid,
        })
        return res.status(201).send({ user: user })
    } catch (err) {
        return res.status(500).send({ error: 'Some thing Went Wrong' })
    }
}

async function getUsers(req, res) {
    try {
        const trip = await Trip.findById(req.query.trip_id);
        if (!trip) return res.status(400).send({ error: "Trip not found" });
        const userIds = [req.user_id].concat(trip.member_ids)
        const users = await User.find({ name: { $regex: RegExp(req.query.search_key, "i") }, _id: { $nin: userIds } }, { password: 0 })
        return res.status(201).send({ users: users })
    } catch (err) {
        return res.status(500).send({ error: 'Some thing Went Wrong' })
    }
}

async function createTrip(req, res) {
    try {
        const fromDB = await Trip.findOne({
            name: req.body.tripName
        })
        if (fromDB) return res.status(409).send({ error: 'duplicate trip Name' })
        await Trip.create({
            name: req.body.trip_name,
            desc: req.body.trip_desc,
            created_by: req.user_id,
            member_ids: [req.user_id]
        })
        return res.status(201).send({ msg: 'trip created successfully' })
    } catch (err) {
        return res.status(500).send({ error: 'Some thing Went Wrong' })
    }
}

async function getTripList(req, res) {
    try {
        const trips = await Trip.find({ $or: [{ created_by: req.user_id }, { member_ids: { "$in": [req.user_id] } }] })
        let buildpromises = trips.map((trip) => {
            return new Promise(async (resolve, reject) => {
                if (trip.created_by == req.user_id) {
                    let item = { ...trip.toObject(), creater_name: 'you' }
                    return resolve(item)
                } else {
                    let created_by = await User.findById(trip.created_by)
                    let item = { ...trip.toObject(), creater_name: created_by.name }
                    return resolve(item)
                }
            })
        })
        Promise.all(buildpromises).then((trips) => {
            return res.status(200).send({ trips: trips })
        }).catch((err) => {
            return res.status(200).send({ trips: [] })
        })
    } catch (err) {
        return res.status(500).send({ error: 'Some thing Went Wrong' })
    }
}

async function getTripDetails(req, res) {
    try {
        let userId = req.user_id
        let transactionDetails = [];
        const trip = await Trip.findById(req.query.trip_id);

        let memebrDetails = await User.find({ _id: { $in: trip.member_ids } }, { name: 1 })
        const expenses = await Expense.find({ trip_id: trip._id, created_by: { $nin: [userId] } })
        const expenseIds = expenses.map(x => x._id)
        const transactions = await Transaction.find({ expense_id: { $in: expenseIds }, member_id: req.user_id })

        let buildPromises = transactions.map((transaction) => {
            return new Promise(async (resolve, reject) => {
                let expense = expenses.find(x => x._id == transaction.expense_id)
                let createdBy = await User.findById(expense.created_by);
                transactionDetails.push({
                    created_name: createdBy.name,
                    ...transaction.toObject(),
                    expense_name: expense.name,
                    total_amount: expense.amount,
                    type: "owesout"
                })
                return resolve(true);
            })
        });

        const myExpenses = await Expense.find({ trip_id: trip._id, created_by: userId })
        const myExpenseIds = myExpenses.map(x => x._id)
        const myTransactions = await Transaction.find({ expense_id: { $in: myExpenseIds } });
        myTransactions.map((transaction) => {
            let promise = new Promise(async (resolve, reject) => {
                let expense = myExpenses.find(x => x._id == transaction.expense_id)
                let createdBy = await User.findById(transaction.member_id)
                transactionDetails.push({
                    created_name: createdBy.name,
                    expense_name: expense.name,
                    total_amount: expense.amount,
                    ...transaction.toObject(),
                    type: "owesin"
                })
                return resolve(true);
            });
            buildPromises.push(promise);
        });


        let tripCreaterName = ''
        if (trip.created_by == req.user_id) {
            tripCreaterName = 'you';
        } else {
            const user = await User.findById(trip.created_by);
            tripCreaterName = user.name
        }

        Promise.all(buildPromises).then((success) => {
            let inTransaction = transactionDetails.filter(x => x.type == "owesin");
            let outTransaction = transactionDetails.filter(x => x.type == "owesout");

            inTransaction = inTransaction.reduce(function (r, a) {
                r[a.expense_id] = r[a.expense_id] || [];
                r[a.expense_id].push(a);
                return r;
            }, Object.create(null));

            let result = {
                trip: { ...trip.toObject(), member_details: memebrDetails, trip_creater_name: tripCreaterName, current_user_id: req.user_id },
                out: outTransaction,
                in: inTransaction,
            }
            return res.status(201).send(result);
        }).catch((err) => {
            return res.status(500).send({})
        })
    } catch (err) {
        return res.status(500).send({ error: 'Some thing Went Wrong' })
    }
}

async function addExpense(req, res) {

    const { tripId, name, amount, memberIds } = req.body;
    let expense = new Expense();
    expense.trip_id = tripId
    expense.name = name;
    expense.amount = amount;
    expense.created_by = req.user_id;
    expense = await expense.save()

    const perShareAmount = Math.round((expense.amount / (memberIds.length + 1)));

    const buildPromises = memberIds.map((memberId) => {
        return new Promise(async (resolve, reject) => {
            let transaction = new Transaction();
            transaction.expense_id = expense._id
            transaction.member_id = memberId;
            transaction.amount = perShareAmount;
            transaction = await transaction.save()
            return resolve(transaction);
        })
    });

    Promise.all(buildPromises).then((success) => {
        return res.status(200).send({})
    }).catch((err) => {
        return res.status(500).send({ error: 'Some thing Went Wrong' })
    })
}

async function addTripMembers(req, res) {

    try {
        const { trip_id, member_ids } = req.body
        console.log(trip_id, member_ids)
        let fromDB = await Trip.findById(trip_id)
        if (!fromDB) return res.status(404).send({ error: 'Trip Not Found' })
        let existingMembers = fromDB.member_ids
        let newMembers = req.body.member_ids
        fromDB.member_ids = [... new Set(existingMembers.concat(newMembers))]
        fromDB = await fromDB.save()
        return res.status(200).send({ trip: fromDB })
    } catch (err) {
        return res.status(500).send({ error: 'Some thing Went Wrong' })
    }
}

async function updateTransaction(req, res) {
    const userId = req.user_id;
    const amount = req.body.amount;
    const transactionId = req.body.transaction_id;
    let transaction = await Transaction.findById(transactionId);
    if (!transaction) return res.status(404).send({ error: "Transaction not found." });
    if (transaction.member_id != userId) return res.status(403).send({ error: "transaction not accessible." });
    const balance = transaction.amount - transaction.paid_amount;
    if (amount > balance) return res.status(400).send({ error: `Maximum payabale amount is ${balance}` });
    transaction.paid_amount = (transaction.paid_amount | 0) + amount;
    transaction = await transaction.save();
    return res.status(200).send({ msg: 'transaction added' });
}

module.exports = {
    registerUser,
    loginUser,
    getUser,
    getTripList,
    createTrip,
    getUsers,
    addTripMembers,
    getTripDetails,
    addExpense,
    updateTransaction
}
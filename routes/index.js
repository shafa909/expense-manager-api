var express = require('express');
const appController = require('../controllers/appController');
var router = express.Router();


const { verifyToken } = require("../controllers/helper/authHelper")

router.post('/register', appController.registerUser);
router.post('/login', appController.loginUser);
router.post('/user', verifyToken, appController.getUser);
router.get('/users', verifyToken, appController.getUsers);

router.post('/create-trip', verifyToken, appController.createTrip);
router.get('/get-trip-lists', verifyToken, appController.getTripList);
router.get('/get-trip-details', verifyToken, appController.getTripDetails);
router.post('/add-trip-members', appController.addTripMembers);
router.post('/add-expense', verifyToken, appController.addExpense);
router.post('/update-transaction', verifyToken, appController.updateTransaction)

module.exports = router;
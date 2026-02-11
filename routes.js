const express = require('express');
const userController = require('./controllers/userController')

const routes = new express.Router();

routes.post('/register',userController.registerController)

routes.post('/verify-email',userController.verifyEmailController)

routes.post('/login',userController.loginController)

module.exports = routes
const express = require('express');
const puppeteer = require('puppeteer')
const userController = require('./controllers/userController')
const resumeController = require('./controllers/resumeController')
const authMiddleware = require('./middleware/authMiddleware')

const routes = new express.Router();


routes.post('/register',userController.registerController)

routes.post('/verify-email',userController.verifyEmailController)

routes.post('/login',userController.loginController)

routes.post('/generate-pdf',resumeController.generatePdfController);

routes.post('/store-data',authMiddleware,resumeController.storeDataController);

routes.get('/get-resumes',authMiddleware,resumeController.getAllResumesController);

module.exports = routes
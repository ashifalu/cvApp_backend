const express = require('express');
const userController = require('./controllers/userController')
const resumeController = require('./controllers/resumeController')
const authMiddleware = require('./middleware/authMiddleware')
const multerMiddleware = require('./middleware/multerMiddleware')
const resumeParseController = require("./controllers/resumeParseController");


const routes = new express.Router();


routes.post('/register',userController.registerController)

routes.post('/verify-email',userController.verifyEmailController)

routes.post('/login',userController.loginController)

routes.post('/google-login',userController.googleLoginController)

routes.post('/resume-parse',multerMiddleware,resumeParseController.parsingController)

routes.post('/generate-pdf',resumeController.generatePdfController);

routes.post('/store-data',authMiddleware,resumeController.storeDataController);

routes.get('/get-resumes',authMiddleware,resumeController.getAllResumesController);

module.exports = routes
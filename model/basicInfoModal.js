const mongoose = require('mongoose');

const basicInfoSchema = mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        default:""
    },
    role: {
        type: String,
        required: true
    },
    photo: {
        type: String,
        default: ""
    },
    email: {
        type: String,
        required: true
    },
    professionalSummary: {
        type: String,
        default: ""
    },
    phone: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    nationality: {
        type: String,
        required: true
    },
    language: {
        type: String,
        default: ""
    },
   
})

const basicInfo = mongoose.model('users',basicInfoSchema);

module.exports = basicInfo
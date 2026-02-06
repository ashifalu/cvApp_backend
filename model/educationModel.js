const mongoose = require("mongoose")

const educationSchema = mongoose.Schema({
    school: {
        type: String,
        required: true
    },
    degree: {
        type: String,
        required: true
    },
    fieldOfStudy: {
        type: String,
        required: true
    },
    grade: {
        type: String,
        default: ""
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
    },
    country: {
        type: String,
        required: true
    },
    city: {
        type: String,
        default: ""
    },
    usermail: {
        type: String,
        default: ""
    }
})

const education = mongoose.model("education",educationSchema);

module.exports = education
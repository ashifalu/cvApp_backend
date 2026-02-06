const mongoose = require('mongoose');

const experianceSchema = mongoose.Schema({

    jobTitle: {
        type: String,
        required: true
    },
    employer: {
        type: String,
        required: true
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
        required: true
    },
    usermail: {
        type: String,
        required: true
    }
})

const experiance = mongoose.model("experiance",experianceSchema);

module.experiance = experiance
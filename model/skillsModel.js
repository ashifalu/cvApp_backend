const mongoose = require('mongoose');

const skillSchema = mongoose.Schema({
    skill: {
        type: String,
        required: true
    },
    level: {
        type: String,
        required: true
    },
    usermail: {
        type: String,
        required: true
    }
})

const skills = mongoose.model("skills",skillSchema);

module.exports = skills
const mongoose = require('mongoose');

const projectSchema = mongoose.Schema({
        projectTitle:{
            type: String,
            required: true
        },
        projectDescription:{
            type: String,
            default:""
        },
        projectUrl:{
            type: String,
            default:""
        },
        usermail:{
            type: String,
            required: true
        }
})

const projects = mongoose.model("projects",projectSchema);

module.exports = projects

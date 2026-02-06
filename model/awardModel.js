const mongoose = require('mongoose');

const awardSchema = mongoose.Schema({
        awardName:{
            type:String,
            required: true
        },
        issueingOrg:{
            type:String,
            required: true
        },
        issueingDate:{
            type:Date,
            required: true
        },
        expirationDate:{
            type:Date,
            
        },
        usermail:{
            type:String,
            required: true
        }
})

const awards = mongoose.model("awards",awardSchema)

module.exports = awards
const mongoose = require('mongoose');

const otpSchema = mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    emailOtp: {
        type:String,
    },
    emailOtpExpiry:{
        type: Date
    },
    
})

const otps = mongoose.model("otps",otpSchema);

module.exports = otps
const users = require("../model/userModel");
const bcrypt = require("bcryptjs");
const generateOtp = require("../utils/generateOtp");
const sendEmail = require("../utils/sendMail");
const info = require('../model/infoModel')
const otps = require("../model/otpModel");
const jwt = require('jsonwebtoken')



exports.verifyEmailController = async (req, res) => {
    const { email } = req.body;
    console.log(email);

    try {
        const existingUser = await users.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }
        else{
                const otp = generateOtp();
                const hashedOtp = await bcrypt.hash(otp, 10);

                await otps.findOneAndUpdate(
                { email },
                {
                    emailOtp: hashedOtp,
                    emailOtpExpiry: Date.now() + 10 * 60 * 1000
                },
                { upsert: true, new: true }
                );
                await sendEmail({
                    to: email,
                    subject: "Email Verification OTP",
                    html: `<h1>${otp}</h1>`
                })
                res.status(200).json({ message: 'OTP sent' });
            }

    } catch (error) {
        res.status(500).json(error)
    }
}

exports.registerController = async (req, res) => {

    const { email, otp, password } = req.body;

    try {
            const userOtp = await otps.findOne({email})
            if (userOtp.emailOtpExpiry < Date.now()) {
                return res.status(400).json({ message: 'OTP expired' });
            }
            else {
                const isOtpValid = await bcrypt.compare(otp, userOtp.emailOtp);
                if (!isOtpValid) {
                    return res.status(400).json({ message: 'Invalid OTP' });
                }
                else{

                    const hashedPassword = await bcrypt.hash(password, 10);

                    const newUser = await users.create({
                    email,
                    password: hashedPassword

                    })
                    const token = jwt.sign({id:newUser._id},process.env.JWTSECRETKEY)

                    await otps.deleteOne({ email });

                    res.status(200).json({
                        message: 'Registration successful',
                        user: newUser,
                        token
                    });
                    }
                }
        }
        catch (error) {
        res.status(500).json(error)
        }
};

exports.loginController = async (req,res) => {
    console.log('LOGIN START');
    const { email,password } = req.body;

    try {
        const existingUser = await users.findOne({email});
        console.log('user Query finished');
        if(!existingUser){
            console.log('SENDING RESPONSE');
            return res.status(400).json({message:"User not found"})
        }
        else{
            console.log('SENDING RESPONSE');
            const isPswdValid = await bcrypt.compare(password,existingUser.password)
            if(!isPswdValid){
                return res.status(401).json({message:"Incorrect Password"});
            }
            else {
                const token = jwt.sign({id:existingUser._id},process.env.JWTSECRETKEY)
                const { password: _, ...userData } = existingUser._doc;
                res.status(200).json({
                        message: 'Login successful',
                        user: userData,
                        token
                    });
            }

        }

    } catch (error) {
        console.log(error);

        res.status(500).json({message:"server error"})
    }
}

exports.googleLoginController = async(req,res) => {
    console.log('LOGIN START');
    const {email,firstName,lastName,photo} =req.body;
    console.log(email,firstName,lastName,photo)

    try{
        const existingUser = await users.findOne({email});
        console.log('user Query START');

        if(existingUser){
            const token = jwt.sign({id:existingUser._id},process.env.JWTSECRETKEY)
            const { password: _, ...userData } = existingUser._doc;
            console.log('res START');

            res.status(200).json({
                message: 'Login successful',
                user: userData,
                token
            });
        }
       else {
            const newUser = await users.create({
                email,
                password: '#googleLogin'

            })
            console.log(newUser._id)

            const userInfo = await info.create({
                user: newUser._id,
                firstName,
                lastName,
                photo
            })
            const token = jwt.sign({id:newUser._id},process.env.JWTSECRETKEY)

            console.log('res START');

            res.status(200).json({
                message: 'login successful',
                user: newUser,
                token
            });
        }
    }
    catch(error){
        res.status(500).json(error)
    }
}
const users = require("../model/userModel");
const bcrypt = require("bcryptjs");
const generateOtp = require("../utils/generateOtp");
const sendEmail = require("../utils/sendMail");
const info = require('../model/infoModel')
const otps = require("../model/otpModel");
const jwt = require('jsonwebtoken')
const { otpEmailTemplate } = require("../utils/emailTemplates");
const authMiddleware = require("../middleware/authMiddleware"); // used in routes, not here

// ── Step 1: send OTP to the logged-in user's own email before letting them set a password ──
exports.sendSetupPasswordOtpController = async (req, res) => {
    try {
        const existingUser = await users.findById(req.user.id);
        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const otp = generateOtp();
        const hashedOtp = await bcrypt.hash(otp, 10);

        await otps.findOneAndUpdate(
            { email: existingUser.email },
            {
                emailOtp: hashedOtp,
                emailOtpExpiry: Date.now() + 10 * 60 * 1000
            },
            { upsert: true, new: true }
        );

        await sendEmail({
            to: existingUser.email,
            subject: "Confirm Password Setup",
            html: otpEmailTemplate({
                otp,
                title: "Set up your password",
                message: "Use the code below to confirm it's you before setting up email & password login. This code expires in 10 minutes."
            })
        });

        res.status(200).json({ message: 'OTP sent' });

    } catch (error) {
        res.status(500).json(error);
    }
};

// ── Step 2: verify OTP + set the password ──
exports.setupPasswordController = async (req, res) => {
    const { otp, newPassword } = req.body;

    try {
        const existingUser = await users.findById(req.user.id);
        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userOtp = await otps.findOne({ email: existingUser.email });
        if (!userOtp) {
            return res.status(400).json({ message: 'OTP not found, please request a new one' });
        }
        if (userOtp.emailOtpExpiry < Date.now()) {
            return res.status(400).json({ message: 'OTP expired' });
        }

        const isOtpValid = await bcrypt.compare(otp, userOtp.emailOtp);
        if (!isOtpValid) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        existingUser.password = hashedPassword;
        await existingUser.save();

        await otps.deleteOne({ email: existingUser.email });

        res.status(200).json({ message: 'Password set successfully' });

    } catch (error) {
        res.status(500).json(error);
    }
};

// ── Delete account ──
exports.deleteAccountController = async (req, res) => {
    try {
        const existingUser = await users.findById(req.user.id);
        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Clean up related data — adjust model names to match your actual schemas
        await info.deleteMany({ user: existingUser._id });
        // await resumes.deleteMany({ user: existingUser._id }); // if you have a Resume model

        await users.findByIdAndDelete(existingUser._id);

        res.status(200).json({ message: 'Account deleted successfully' });

    } catch (error) {
        res.status(500).json(error);
    }
};



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
                html: otpEmailTemplate({
                    otp,
                    title: "Verify your email",
                    message: "Use the code below to verify your email address and complete your registration. This code expires in 10 minutes."
                })
            })
                res.status(200).json({ message: 'OTP sent' });
            }

    } catch (error) {
        res.status(500).json(error)
    }
}

exports.registerController = async (req, res) => {

    const { email, otp, password } = req.body;
    console.log(otp)
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
            console.log(`newUser:${newUser._id}`)
            const personalInfo = {
                firstName,
                lastName,
                role: "",
                photo,
                linkedInUrl: "",
                email: "",
                phoneCountryCode: "+1",
                phone: "",
                country: "", city: "", nationality: "", portfolioUrl: ""
            }

            const userInfo = await info.create({
                user: newUser._id,
                personalInfo
            })
            const token = jwt.sign({id:newUser._id},process.env.JWTSECRETKEY)
            console.log(userInfo)

            const { password: _, ...userData } = newUser._doc;
            res.status(200).json({
                message: 'login successful',
                user: userData,
                token
            });

        }
    }
    catch(error){
        res.status(500).json(error)
    }
}

exports.forgotPasswordController = async (req, res) => {
    const { email } = req.body;

    try {
        const existingUser = await users.findOne({ email });
        if (!existingUser) {
            return res.status(404).json({ message: 'No account found with this email' });
        }

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
            subject: "Reset Your Password",
            html: otpEmailTemplate({
                otp,
                title: "Reset your password",
                message: "We received a request to reset your password. Use the code below to continue. This code expires in 10 minutes."
            })
        });

        res.status(200).json({ message: 'Reset code sent' });

    } catch (error) {
        res.status(500).json(error);
    }
};

exports.resetPasswordController = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        const userOtp = await otps.findOne({ email });

        if (!userOtp) {
            return res.status(400).json({ message: 'OTP not found, please request a new one' });
        }
        if (userOtp.emailOtpExpiry < Date.now()) {
            return res.status(400).json({ message: 'OTP expired' });
        }

        const isOtpValid = await bcrypt.compare(otp, userOtp.emailOtp);
        if (!isOtpValid) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const updatedUser = await users.findOneAndUpdate(
            { email },
            { password: hashedPassword },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        await otps.deleteOne({ email });

        res.status(200).json({ message: 'Password reset successful' });

    } catch (error) {
        res.status(500).json(error);
    }
};
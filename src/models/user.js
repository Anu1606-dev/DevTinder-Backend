const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        index: true,
        minlength: 4,
        maxlength: 30,
    },
    lastName: {
        type: String,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        validate(value) {
            if(!validator.isEmail(value)) {
                throw new Error("Email is invalid!!" + value);
            }
        }
    },
    password: {
        type: String,
        required: true,
    },
    age: {
        type: Number,
        min: 18,
    },
    gender: {
        type: String,
        enum: {
            values: ["male", "female", "other"],
            message: `{VALUE} is not supported`,
        },
    },
    photoUrl: {
        type: String,
        default: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png",
        validate(value) {
            if(!validator.isURL(value)) {
                throw new Error("URL is invalid!!" + value);
            }
        }
    },
    about: {
        type: String,
        default: "Hey there! I am using DevTinder",
    },
    skills: {
        type: [String],
    }
},
{
    timestamps: true,  
});

userSchema.index({firstName: 1, lastName: 1, email: 1});

userSchema.methods.getJWT = async function() {
    const user = this;

    const token = await jwt.sign(
        { _id: user._id }, 
        process.env.JWT_SECRET, 
        {expiresIn: "7d"} 
    );

    return token;
}

userSchema.methods.validatePassword = async function(passwordInputByUser){
    const user = this;
    const passwordHash = user.password;
    const isPasswordValid = await bcrypt.compare(passwordInputByUser, passwordHash);

    return isPasswordValid;
}

module.exports = mongoose.model('User', userSchema);
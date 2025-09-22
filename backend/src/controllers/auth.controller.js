const userModel = require('../models/user.model')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')


async function registerUser(req, res){

    const{ fullName:{firstName,lastName},email,password} = req.body;

    const isUserAlreadyExits = await userModel.findOne({
        email
    })

    if(isUserAlreadyExits) {
        res.status(400).json({
            message : "User is already exists"
        })
    }

    const hashPassword  = await bcrypt.hash(password,10)

    const user = await userModel.create({
        fullName:{
            firstName,lastName
        },
        email,
        password : hashPassword
    })

    const token = jwt.sign({id:user._id},process.env.JWT_SECRET)

    res.cookie("token",token)

    res.status(201).json({
        message : "User registered successfully😁.",
        user : {
            fullName : user.fullName,
            email : user.email,
            _id : user._id 
        }
    })

}

async function loginUser(req,res){

    const {email,password} = req.body;

    const user = await userModel.findOne({
        email
    })

    if(!user){
        return res.status(401).json({
            message : "Invalid user or password😔"
        })
    }
    const isPasswordValid = await bcrypt.compare(password,user.password);

    if(!isPasswordValid){
        return res.status(401).json({
            message : "Wrong Password😒"
        })
    }

    const token = jwt.sign({id:user._id},process.env.JWT_SECRET)

    res.cookie("token",token)

    res.status(201).json({
        message : 'User loggin successfully✅',
        user :{
            fullName:user.fullName,
            email:user.email,
            _id : user._id
        }
    })

}


module.exports = {
    registerUser,
    loginUser
}
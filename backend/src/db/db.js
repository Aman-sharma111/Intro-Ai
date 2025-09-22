const mongoose = require('mongoose');

async function connectDB(){

    try{
        await mongoose.connect(process.env.MONGODB_URI);

        console.log("Connected to MONGODB😎");
    }catch(err){
        console.log("Error connecting to MONGODB😔",err)
    }
}

module.exports = connectDB;
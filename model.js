const mongoose = require("mongoose");
const schema = mongoose.Schema


const userDetails = new schema({
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        min:8,
        required:true
    },
    mobile:{
        type:String,
        unique:true,
        required:true
    },
    name:{
        type:String,
        unique:true,
        required:true
    },
    place:{
        type:String,
        required:true
    }


});

const model = mongoose.model("userDetails",userDetails,"users");

module.exports = model
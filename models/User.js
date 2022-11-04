const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const findOrCreate = require('mongoose-findorcreate');

const userSchema = new mongoose.Schema({
    username: {
        type:String,
    },
    email:{
        type: String
    },
    password:{
        type: String
    },
    googleId: String,
    githubId: String,
    status:{
        type:Boolean,
        default: false
    },
    logo:{
        type:String,
        default: ''
    },
    talking: {
        type:Boolean,
        default:false
    },
    firstName: {
        type:String,
        default: ''
    },
    lastName: {
        type:String,
        default: ''
    },
    role: {
        type: String,
        enum: ['user','root'],
        default: 'user'
    },
    token: String,
    bio:{
        type: String,
        default: ''
    },
    createToken: {
        type: Date
    },
    unreadPosts:{
        type: Boolean,
        default: false
    },
    unreadNotifications:{
        type: Boolean,
        default: false
    },
    secret:{
        type: Boolean,
        default: false
    },
    isDeleted:{
        type:Boolean,
        default:false
    }
},{timestamps: true});

userSchema.plugin(findOrCreate);

userSchema.plugin(passportLocalMongoose,{  usernameQueryFields: ['email', 'username']});

const User = mongoose.model('User',userSchema);

module.exports = User;
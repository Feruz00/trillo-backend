const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    mainUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    type: {
        type: String,
        enum: ['newLike', 'newComment', 'newFollower', 'jogap']
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    },
    ansUser: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    comment: { type: String },
    text: { type: String },
    date: {type: Date, default: Date.now()}

})

const Notifications = mongoose.model('Notifications', notificationSchema)

module.exports = Notifications;
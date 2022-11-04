const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    followers:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    blocking:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    block:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
})

const Follow = mongoose.model('Follow', followSchema)

module.exports = Follow;

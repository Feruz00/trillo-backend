const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    text: {
        type: String,
        required: [true, 'A post must have description']
    },
    ansUser: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    date: Date
    
})

const Comment = mongoose.model('Comment', commentSchema)

module.exports = Comment;
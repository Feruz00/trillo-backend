const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    location:{
        type: String,
        required: [true, 'A post must have location']
    },
    
    files:[{
        type:Object
    }],
    description:{
        type: String,
        required: [true, 'A post must have description']
    },
    date:{
        type: Date
    },
    tags:[{
        type:String
    }],
    // comments:[{
    //     _id: String,
    //     user: {
    //         type: mongoose.Schema.Types.ObjectId,
    //         ref: 'User'
    //     },
    //     text: {
    //         type: String,
    //         required: [true, 'A post must have description']
    //     },
    //     ansUser: [{
    //         type: mongoose.Schema.Types.ObjectId,
    //         ref: 'User'
    //     }],
    //     date: Date
    // }],
    likes:[{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }]
})

const Post = mongoose.model('Post', postSchema)

module.exports = Post;
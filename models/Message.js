const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new mongoose.Schema({
    about: {type: Schema.Types.ObjectId,
        ref: 'Conversation'},
    sender:{
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    text: String,
    watchers: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    readers: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    type: {
        type: 'String',
        enum: ['text', 'video', 'image', 'file','post']
    }
},{timestamps: true});


const Messages = mongoose.model('Messages', messageSchema);

module.exports = Messages;
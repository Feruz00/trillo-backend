const User = require('../models/User')
const Notifications = require('../models/Notifications')

const doret = async userId => {
    try {
        const d = await Notifications.findOne({ user: userId })
        if (!d) {
            await new Notifications({ user: userId, notifications: [] }).save();
        }    
    } catch (error) {
        console.error(error)
    }
    
}

const userChange = async (id) =>{
    try {
        const user = await User.findById(id)
        user.unreadNotifications = true; 
        await user.save()
    } catch (error) {
        
    }
}

const newLikeNotification = async (user, post, posteyesi)=>{
    try {
        // await doret(posteyesi)
        // const notification = await Notifications.findOne({user: posteyesi})

        const newNotification = new Notifications({
            mainUser: posteyesi,
            type: 'newLike',
            user,
            post,
            date: Date.now()
        })

        await newNotification.save()

        // await notification.notifications.unshift(newNotification)
        // await notification.save()

        await userChange(posteyesi)

        return

    } catch (error) {
        console.error(error)
    }
}

const newCommentNotification = async (postId, commentId, userId, posteyesi, text) => {
    try {
        
        // await doret(posteyesi)
        // const userToNotify = await Notifications.findOne({ user: posteyesi })
        
        const newNotification = new Notifications({
            mainUser: posteyesi,
            type: "newComment",
            user: userId,
            post: postId,
            commentId,
            text,
            date:Date.now()
        })
        // await userToNotify.notifications.unshift(newNotification)
        
        await newNotification.save()

        await userChange(posteyesi)
        return

    } catch (error) {
        console.error(error)
    }
}
const newJogapCommentNotification = async (
    postId, 
    commentId, 
    userId, 
    posteyesi, 
    text, 
    ansUser) => {
        console.log("geldim icine jogap\n");
    // console.log("geldim jogaba:", text, ansUser, userId);
    try {
        
        // await doret(posteyesi)
        // const userToNotify = await Notifications.findOne({ user: posteyesi })
        
        const newNotification = new Notifications( {
            mainUser: posteyesi,
            type: "jogap",
            user: userId,
            post: postId,
            commentId,
            ansUser,
            text,
            date:Date.now()
        })
        // await userToNotify.notifications.unshift(newNotification)
        
        await newNotification.save()

        await userChange(posteyesi)
        return

    } catch (error) {
        console.error(error)
        return
    }
}

const newFollowerNotification = async (userId, userToNotifyId) => {
    try {
        
        // await doret(userToNotifyId)
        // const user = await Notifications.findOne({ user: userToNotifyId })
        
        const newNotification = new Notifications({
            mainUser:userToNotifyId,
            type: "newFollower",
            user: userId,
            date: Date.now()
        })

        // await user.notifications.unshift(newNotification)
        await newNotification.save()
        
        await userChange(userToNotifyId)
    } catch (error) {
        console.error(error)

    }
}
module.exports = {newLikeNotification, newCommentNotification, newFollowerNotification, newJogapCommentNotification}
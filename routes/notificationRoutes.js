const router = require('express').Router();
const User = require('../models/User')
const Post = require('../models/Post')
const Follow = require('../models/Follow')
const uuid = require('uuid').v4;
const Notifications = require('../models/Notifications');
const { logged } = require('../middleware/authMiddleware');


router.put('/', logged, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {$set: { unreadNotifications: false} } )
        return res.json()
    } catch (error) {
        return res.status(500).json(error)
    }
});

router.get('/', logged, async (req, res) => {
    try {
        const p = req.query.p * 1;
        // {notifications: {$slice: [ (p-1)*10, 10 ]}}
        const notifi = await Notifications
        .find({mainUser: req.user._id})
        .sort('-date')
        .populate('mainUser')
        .populate('user')
        .populate('post')
        .populate('ansUser')

        // console.log(notifi.length);
        const result = notifi.filter( i=>{
            const {user, post, ansUser, type ,...other} = i._doc
            // console.log(user , post)
            if(typeof user !== 'object') return false
            if( !post && (type === 'newComment' || type==="jogap" || type==='newLike')   ) return false
            // if(
            //     !(type ==='newLike' || type === 'newFollower') && 
            //     typeof post !== 'object') return false
            const arr = ansUser.filter(k=>{
                if(!k) return false
                return true 
            })
            return {user:user, post, ansUser:arr, ...other}
        } )
        

        return res.json({notifications: result.slice((p-1)*10, 10) })
    } catch (error) {
        return res.status(500).json(error)
    }
} )


module.exports = router
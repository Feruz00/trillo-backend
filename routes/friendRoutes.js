const User = require('../models/User')
const Follow = require('../models/Follow')
const router = require('express').Router();
const {logged} = require('../middleware/authMiddleware')
// const User = require('../models/User')
const {newFollowerNotification} = require('../utils/notifications')

router.post('/follow', logged, async(req, res) => {
    
    const { _id } = req.body;
    if(req.user._id.toString() === _id) return res.status(403).json({message: 'You cannot follow himself!'})

    // console.log(_id)
    
    try {
        const user = await Follow.findOne({user: req.user._id}); //laura
        const kabul = await Follow.findOne({user: _id}) // aarav
        
        if(!user || !kabul) return res.status(400).json({message: 'Invalid data'})
        const isFollow = 
            kabul.followers.length > 0 && kabul.followers.filter( f=>f.toString() === req.user._id.toString() ).length > 0
        if(isFollow) return res.status(400).json({message: 'User already follow this user'})
        kabul.followers.unshift(req.user._id)
        user.following.unshift(_id)

        const blocking = user.blocking.filter(f=>{ return f.toString() !== _id})
        const bb = kabul.block.filter(f=>{ return f.toString() !== req.user._id })

        user.blocking = blocking
        kabul.block = bb
        await kabul.save()
        await user.save()
        await newFollowerNotification(req.user._id, kabul.user._id)
        return res.redirect(`/api/v1/friends/id/${_id}`)
    } catch (error) {
        console.error(error);
        return res.status(500).json({message: 'Something wrong went!'})
    }
});

router.post('/unfollow', logged, async(req, res) => {
    const { _id } = req.body;
    if(req.user._id.toString() === _id) return res.status(403).json({message: 'Bad request'})

    try {
        const user = await Follow.findOne({user: req.user._id});
        const kabul = await Follow.findOne({user: _id})

        if(!user || !kabul) return res.status(400).json({message: 'Invalid data'})
        const isFollow = kabul.followers.length > 0 && kabul.followers.filter( f=>f.toString() === req.user._id.toString() ).length > 0
        
        if(!isFollow) return res.status(400).json({message: 'User must follow this user if you want unfollow'})

        const removeFollowing = user.following.map(f => f.toString()).indexOf(_id)

        await user.following.splice(removeFollowing, 1) 
        await user.save()

        const removeFollower = kabul.followers.map(f => f.toString()).indexOf(req.user._id)

        await kabul.followers.splice(removeFollower, 1)
        await kabul.save()

        return res.redirect(`/api/v1/friends/id/${_id}`)
    } catch (error) {
        return res.status(500).json({message: 'Something wrong went!'})
    }
});


router.put('/upd_info', logged, async (req, res) => {
    

    try {
        await User.updateOne({ _id: req.user._id, },
            { $set: req.body }, {
                runValidators: true,
             })  ;
        return res.status(200).send('Success')
    } catch (e) {
        return res.status(400).json({message: 'Invalid data'})
    }
    
});

router.get('/:username', logged, async (req, res) => {
    try {
        const t = await User.findOne({username: req.params.username}) // aarav
        if(!t) return res.status(404).json({message: 'User not found!'})
        
        const ans = await Follow.findOne({ user: t._id }).populate('user') // aaravyn followerleri
        const {username, _id, logo, firstName, lastName, bio, blocking, secret} = ans.user;
        const isFollow = ans.followers.length > 0 ? ans.followers.filter(f=>f.toString()===req.user._id.toString()).length>0 : false
        const isFollowing = ans.following.length > 0 ? ans.following.filter(f=>f.toString()===req.user._id.toString()).length>0 : false
        
        const netije = { 
            username, 
            _id, 
            logo, 
            firstName, 
            lastName, 
            isFollow, 
            isFollowing,
            followers: ans.followers.length, 
            following: ans.following.length,
            bio,
            blocking,
            secret
        }
        return res.json(netije)
    } catch (error) {
        console.error(error)
        return res.status(500).json({message: 'Server error. Try again!'})
    }
});

router.get('/user/:id', logged, async (req, res)=>{
    try {
        // console.log(req.params.id)
        const data = await Follow.findOne({ user: req.params.id }).populate('blocking').populate('block')
        // console.log(data)
        return res.json(data)
    } catch (error) {
        res.status(404).json({message: 'Not found'})
    }
})

router.get('/getprofile/profile', logged, async (req, res)=>{
    try {
        const data = await Follow.findOne({ user: req.user._id }).populate('blocking').populate('block')
        return res.json(data)
    } catch (error) {
        res.status(404).json({message: 'Not found'})
    }
})


router.patch('/addblock', logged, async (req,res)=>{
    try {
        // console.log('geldim', req.body)
        await Follow.findOneAndUpdate( {user: req.user._id}, {$push: {blocking: req.body._id}} )
        await Follow.findOneAndUpdate( {user: req.body._id}, {$push:  {block: req.user._id} } )
        return res.json()
    } catch (error) {
        return res.status(400).json({message: 'Try again!'})
    }
})

router.patch('/removeblock', logged, async (req,res)=>{
    try {
        await Follow.findOneAndUpdate( {user: req.user._id}, {$pull: {blocking: req.body._id}} )
        await Follow.findOneAndUpdate( {user: req.body._id}, {$pull:  {block: req.user._id} } )
        return res.json()
    } catch (error) {
        return res.status(400).json({message: 'Try again!'})
    }
})


router.get('/id/:userId', logged, async (req, res) => {
    try {
        const t = await User.findById(req.params.userId) // aarav
        if(!t) return res.status(404).json({message: 'User not found!'})
        
        const ans = await Follow.findOne({ user: t._id }).populate('user') // aaravyn followerleri
     
        const {username, _id, logo, firstName, lastName, bio, blocking, secret} = ans.user;
        const isFollow = ans.followers.length > 0 ? ans.followers.filter(f=>f.toString()===req.user._id.toString()).length>0 : false
        const isFollowing = ans.following.length > 0 ? ans.following.filter(f=>f.toString()===req.user._id.toString()).length>0 : false
        
        const netije = { 
            username, 
            _id, 
            logo, 
            firstName, 
            lastName, 
            isFollow, 
            isFollowing,
            followers: ans.followers.length, 
            following: ans.following.length,
            bio,
            blocking,
            secret
        }

        return res.json(netije)
    } catch (error) {
        console.error(error)
        return res.status(500).json({message: 'Server error. Try again!'})
    }
});


router.get('/following/:userId', logged, async (req,res)=>{
    try {
        const user = await Follow.findOne({user: req.params.userId}).populate({
            path: 'following',
            fields: 'following'
        }).select('following')
        const {following} = user;

        const current = await Follow.findOne({user: req.user._id})
        
        const result = following.map( fol =>{
            const isFollow = current.following.length > 0 ? current.following.filter(f=> f.toString() === fol._id.toString()).length>0 : false
            const {_id, username, email, status, logo, firstName, lastName, role } = fol;

            return {_id, username, email, status, logo, firstName, lastName, role, isFollow};
        } )
        return res.json(result)

    } catch (error) {
        console.error(error)
        return res.status(500).json({message: "Server error. Try again!"})
    }
})
router.get('/follower/:userId', logged, async (req,res)=>{
    
    try {
        const user = await Follow.findOne({user: req.params.userId}).populate({   
                path: 'followers',
                fields: 'followers'
            }
        ).select('followers')
        
        const {followers} = user;
        const current = await Follow.findOne({user: req.user._id})
        
        const result = followers.map( fol =>{
            const isFollow = current.following.length > 0 ? current.following.filter(f=> f.toString() === fol._id.toString()).length>0 : false
            const {_id, username, email, status, logo, firstName, lastName, role } = fol;

            return {_id, username, email, status, logo, firstName, lastName, role, isFollow};
        } )
        return res.json(result)

    } catch (error) {
        console.error(error)
        return res.status(500).json({message: "Server error. Try again!"})
    }
})

router.get('/users/all', logged, async (req, res) => {
    try {
        const user = await Follow.findOne({user: req.user._id}).populate('following')
        const netije = user.following;
        return res.json(netije)
    } catch (error) {
        console.error(error)
        return res.status(500).json({message: 'Something wrong went'})
    }
});
module.exports = router;
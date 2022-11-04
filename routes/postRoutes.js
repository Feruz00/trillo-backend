const mongoose = require('mongoose');
const router = require('express').Router();
const upload = require('../controller/multer');
const { logged } = require('../middleware/authMiddleware');
const User = require('../models/User')
const Post = require('../models/Post')
const Follow = require('../models/Follow')
const Comment = require('../models/Comment')
const uuid = require('uuid').v4;
const Notifications = require('../models/Notifications');
const { newLikeNotification , newCommentNotification, newJogapCommentNotification} = require('../utils/notifications');

// Change user unreadpost type


router.put('/unread', logged, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {$set: { unreadPosts: false} } )
        return res.json()
    } catch (error) {
        return res.status(500).json(error)
    }
});

// CREATE NEW POST
router.post('/', logged ,upload.array('files'), async (req, res) => {
    const {
        location,
        description,
        tags
    } = req.body;
    const files = req.files.map( file => ({path: file.path, type: file.mimetype}))
    try {
        
        await Post.create({
            location,
            description,
            tags,
            files,
            user: req.user._id,
            comments: [],
            likes: [],
            date: Date.now()
        })
        return res.json()
    } catch (error) {
        console.error(error)
        return res.status(500).json({message: 'Network error'})        
    }
    
});

// GET ALL POSTS ???? HALI FULL DAL

router.get('/', logged, async (req, res) => {
    try {
        const p = req.query.p * 1;
        const username = req.query.username ? req.query.username: undefined;
        
        const ans = await Follow.findOne({user: req.user._id});
        const following = ans.following
        following.push(req.user._id.toString())
        const posts = await Post.find({
           $or: following.map( i=> ({user: i.toString()}) )
        }).sort('-date').skip( (p-1)*4 ).limit(4).populate('user').populate('likes.user')
        // .populate('comments.user').populate('comments.ansUser')
        // console.log("sahypa:",p,"\ndata:",posts.length)

        const comments = posts.length > 0 ? await Comment.find(
            
            { 
             $or: posts.map( i=> ({post: i._doc._id})) }).sort('-date').populate('user').populate('ansUser')  :[]
        // console.log(comments);

        const feruz = posts.map( i=>{
            return ({
                ...i._doc,
                comments: comments.filter( t=>t._doc.post.toString() === i._doc._id.toString() )
            })
        } )
        // console.log(feruz)
        return res.json(feruz)
    } catch (error) {
        console.error(error)
        return res.status(500).json(error)
    }
});
router.get('/getpostbyuser/:user', logged, async (req, res) => {
    try {
        const {user} = req.params;
        const p = req.query.p * 1;
        const ans = await User.findOne({username: user});
        
        const posts = await Post.find({ user: ans._id }).sort('-date').skip( (p-1)*4 ).limit(4).populate('user').populate('comments.user').populate('comments.ansUser').populate('likes.user')
        return res.json(posts)
    } catch (error) {
        console.error(error)
        return res.status(500).json(error)
    }
});

router.get('/getpost/:postId', logged, async (req, res) => {
    try {
        const {postId} = req.params;
        const posts = await Post.findById(mongoose.Types.ObjectId(postId))
        .populate('user').populate('likes.user')
        if(!posts) return res.status(404).json({message: 'No post found this id'})
        
        // .populate('comments.user').populate('comments.ansUser').populate('likes.user')
        const comments = await Comment.find({ post:posts._doc._id }).sort('-date').populate('user').populate('ansUser')
        // console.log(comments);

        const feruz = ({
                ...posts._doc,
                comments
            })
        
        return res.json(feruz)
    } catch (error) {
        console.error(error)
        return res.status(500).json(error)
    }

});
// Add Like
router.put('/liked/:postId', logged, async (req,res)=>{
    try {
        
        const {postId} = req.params

        const post = await Post.findById(postId)
        if(!post) return res.status(404).json({message: 'Post not found'})

        const isLiked = post.likes.length > 0 && post.likes.filter( like => like.user.toString() === req.user._id.toString() ).length>0
        if (isLiked) {
            return res.status(401).send('Post already liked');
        }
        await post.likes.unshift({ user: req.user._id })
        await post.save()

        if (post.user.toString() !== req.user._id.toString()) {
            await newLikeNotification(req.user._id, postId, post.user.toString())
        }

        return res.status(200).json()
        

    } catch (error) {
        console.error(error)
        return res.status(500).json(error)
    }
})
// removeLike
router.put('/unliked/:postId', logged, async (req,res)=>{
    try {
        
        const {postId} = req.params

        const post = await Post.findById(postId)
        if(!post) return res.status(404).json({message: 'Post not found'})

        const isLiked = post.likes.length > 0 && post.likes.filter( like => like.user.toString() === req.user._id.toString() ).length>0
        if (!isLiked) {
            return res.status(401).send('Post not liked before');
        }
        const index = post.likes.map(like => like.user.toString()).indexOf(req.user._id.toString());
        
        await post.likes.splice(index,1);

        await post.save()

        return res.status(200).json()
        

    } catch (error) {
        console.error(error)
        return res.status(500).json(error)
    }
})

// newComment
router.post('/post/:postId', logged, async (req,res)=>{
    const {postId} = req.params;
    const {text} = req.body;
    // console.log(req.body)
    try {
        if (text.length < 1) return res.status(400).send('Commmet should be at least 1 character')
        const post = await Post.findById(postId)
        if (!post) return res.status(404).send('Post not found!')

        const newComment = await Comment({
            post: postId,
            text,
            user: req.user._id,
            ansUser: req.body.ansUsers.map( i=>i._id ),
            date: Date.now()
        
        })

        await newComment.save()
        // console.log("ansUsers:",req.body.ansUsers);
        if (post.user.toString() !== req.user._id.toString()) {
            
            await newCommentNotification(
                postId, 
                newComment._id, 
                req.user._id.toString(), 
                post.user.toString(), 
                text);
            
            
                
        
        }
        req.body.ansUsers.map( i=>i._id ).forEach( async i => {
            await newJogapCommentNotification(
                postId, 
                newComment._id, 
                req.user._id.toString(), 
                i,
                text,
                req.body.ansUsers.map( i=>i._id )
                )
        } )
        const result = await Comment.find({post:postId}).sort('-date').populate('user').populate('ansUser')
        
        // await post.populate('comments.user').populate('comments.ansUser')
        // console.log(result);
        return res.json(result)
    } catch (error) {
        console.error(error)
        return res.status(500).json({message: 'Error'})
    }

})

// delete comment

router.delete('/delete/:postId', logged, async (req,res)=>{
    try {
        const { postId } = req.params
        const {comments} = req.body
        const post = await Post.findById(postId)
        if (!post) return res.status(404).send("Post not found!")
        
        await Comment.deleteMany( { $or: comments.map( i=>({_id: i}) ) } )
        const data = await Comment.find({ post: postId }).populate('user').populate('ansUser')
        
        return res.json(data)
    } catch (error) {
        console.error(error)
        return res.status(500).send('Server error');
    }
})

// delete post

router.delete('/post', logged, async (req,res)=>{
    try {
        const {_id} = req.body
        await Post.findByIdAndDelete(_id)
        
        return res.json()
    } catch (error) {
        console.error(error)
        return res.status(500).send('Server error');
    }
})


module.exports = router;
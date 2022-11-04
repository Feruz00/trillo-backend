const router = require('express').Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GithubStrategy = require('passport-github2').Strategy;
const transporter = require('../utils/transporter')
const {logged, notLogged} = require('../middleware/authMiddleware')
const User = require('../models/User')
const Follow = require('../models/Follow')
const crypto = require('crypto')
const isTrue = require('../controller/canLogin')
const upload = require('../controller/multer')

const rateLimit = require('express-rate-limit');
const limitter = rateLimit({
    max: 10,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour!',
 });
 


const Link = process.env.FRONTEND_URL + '/';
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser( function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

/// OAUTH 
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:3001/api/v1/users/auth/google/callback',
    userProfileURL: 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json',
    // passReqToCallback: true
}, async function(accessToken, refreshToken, profile, done){
        let data = {};
        const id = profile._json.id;
        const fer = await User.findOne({ googleId: id });
        if (!fer) {
            data = {
                googleId: id,
                username: profile._json.given_name + profile._json.family_name,
                firstName: profile._json.given_name,
                lastName: profile._json.family_name
            }
        }
        else {
            data = {
                googleId: id
            }
        }
        User.findOrCreate(data, (err,user)=>{
            return done(err,user);
        })
    
    }
))

router.get('/auth/google', 
passport.authenticate('google',{
    scope: ['profile', 'email'],
    prompt: 'select_account'
 }));

router.get('/auth/google/callback',
 passport.authenticate('google', { 
    
    successRedirect: Link,   
    failureRedirect: Link 
}) );

passport.use(new GithubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: 'http://localhost:3001/api/v1/users/auth/github/callback'
    // userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
}, async function(accessToken, refreshToken, profile, done){
    
    let data = {};
    const id = profile.id;
    const fer = await User.findOne({ githubId: id });
    if (!fer) {
        data = {
            githubId: id,
            username: profile._json.login
        }
    }
    else {
        data = {
            githubId: id
        }
    }
    User.findOrCreate(data, (err,user)=>{
        return done(err,user);
    })
}
));


router.get('/auth/github', 
passport.authenticate('github',{ 
    scope: [ 'user:email' ], 
    prompt: 'select_account' 
}));

router.get('/auth/github/callback', passport.authenticate('github', {
    successRedirect: Link,   
    failureRedirect: Link 
}) );


// -------------------------
// Check if user logged in
router.get('/auth', async (req, res) => {
    if(req.isAuthenticated()){
        try {
            const u = await Follow.findOne({user: req.user._id})
            if(!u) await Follow.create({user: req.user._id, followers: [], following: []})

            res.status(200).json(req.user);
            
        } catch (error) {
            return res.status(500).send('Something wrong went!')    
        }
    }
    else{
        
        return res.status(401).json({
            isAuth: false
        });
    }
});
// Admin can upd every user
router.get('/upd', logged, async (req, res) => {
    if( req.user.role !== 'root' ) return res.status(403).json({message: 'This route for only admins'})

    const found = await User.find();

    for(let i=0;i<found.length; i++)
    await User.updateOne({ _id: found[i].id, token: found[i].token }, { $set: { status: true } }, (err)=>{});
    res.send("ok~");
});

// register user
router.post('/register', async (req, res) => {
    const resetToken = crypto.randomBytes(32).toString('hex')
    const passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    const createToken = new Date( Date.now() + 3 * 60* 60 * 1000)
    await User.register( {
        email: req.body.email, 
        username: req.body.username, 
        token: passwordResetToken,
        createToken: createToken
    }, req.body.password, async (err,user)=>{
       
        if(err){
            console.log(err.message)
            res.status(400).json({message:err.message});
        }
        else{
            await Follow({user: user._id, followers:[], following:[]}).save()
            transporter.sendMail({
                from: process.env.USER_ADDRESS,
                to: req.body.email,
                subject: "Confirm Email",
                html: `<h3> Hello ${req.body.username}! </h3> Welcome to our website. Please confirm your email this <a href='${process.env.FRONTEND_URL}/activate/${user._id}/${resetToken}'> link </a> 3 hours `
            }, (err,data)=>{
                console.log(err, data);
                if(err) res.status(500).json({message: "Sorry please again!"});
                else res.status(200).json("User successfully registered! Please confirm your email");
            });     
        }
    });
});
// forgot password
router.post('/forgot_send', notLogged, async (req, res) => {
    const resetToken = crypto.randomBytes(32).toString('hex')
    const passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
    try {
        
        const email =req.body.email;
        const user = await User.findOne({email})
        if(!user) return res.status(404).json({message: "User not found!"})
        user.token = passwordResetToken
        user.createToken = new Date( Date.now() + 3 * 60* 60 * 1000)
        await user.save()
        
        transporter.sendMail({
            from: process.env.USER_ADDRESS,
            to: email,
            subject: "Reset Password",
            html: `<h3> Hello! </h3>  Please click this for reset password <a href='${process.env.FRONTEND_URL}/confirm_password/${email}/${resetToken}'> link </a> 3 hours `
        }, (err,data)=>{
            if(err) res.status(500).json({message: "Sorry please again!"});
            else res.status(200).json("User successfully registered! Please confirm your email");
        });        
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Something wrong went!"})
    }


});

router.patch('/verify' , notLogged, limitter, async (req, res) => {
    const {id, token} = req.query;
    const passwordResetToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
    try {

        const user = await User.findOne({_id: id, token: passwordResetToken, 
            createToken: { $gt: Date.now() } });
        if(!user) return res.status(404).json({message: 'Token is invalid or has expired'})
        user.createToken = undefined;
        user.token = undefined;
        user.status = true;
        await user.save()
        return res.status(200).json()
    } catch (error) {
        return res.status(500).json(error)
    }
});

router.post('/forgot_confirm', notLogged, limitter, async (req, res) => {

    const {email, token, newPassword} = req.body;

    const passwordResetToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

    try {
       const found = await User.findOne( { email: email, token: passwordResetToken, createToken: { $gt: Date.now() } }  );
       if(!found) return res.status(404).json({message: "You must confirm new token again!"});

       await found.setPassword(newPassword, async function(err, user){
        if(!err) await user.save();
       } );
       found.token = undefined;
       found.createToken = undefined;
       await found.save()
       return res.status(200).json({message:"Successfully updated!"});
   } catch (error) {
       return res.status(500).json({message: "Something was happy. Try again!"});
   }
});

// login 
router.get('/login_success', (req, res) => {
    return res.status(200).json(
        req.user
    );
});

router.get('/login_error', (req, res) => {
    return res.status(401).json({message:"Invalid email or password"}) 	
});

router.post("/login", limitter, isTrue,  passport.authenticate("local"
, { successRedirect: '/api/v1/users/login_success',
failureRedirect: '/api/v1/users/login_error' 
}
) , function (req, res) {

});

router.patch('/change', logged, async  (req, res) => {
    const {oldPassword, newPassword} = req.body;
    try {
        const user = await User.findById(req.user._id)
        await user.changePassword(oldPassword, newPassword, err=>{
            if(err) {
                if(err.name === 'IncorrectPasswordError'){
                    res.status(400).json({ success: false, message: 'Incorrect password' }); // Return error
                }else {
                    res.status(400).json({ success: false, message: 'Something went wrong!! Please try again after sometimes.' });
                }
            }else {
             res.json({ success: true, message: 'Your password has been changed successfully' });
            }
        })
    } catch (error) {
        return res.status(500).json({message: 'Something wrong went!'})
    }
});

router.delete('/delete', logged, async (req, res) => {
    const id = req.user._id;
    req.logout();
    await User.findByIdAndDelete(id, (err)=>{
        if(err) return res.status(400).json(err);
        else return res.status(200).json();
    })
    // await User.findyIdAndUpdate(id, (err)=>{
    //     if(err) return res.status(400).json(err);
    //     else return res.status(200).json();
    // })
});


router.post('/picture',logged, upload.single('file') , async (req, res) => {
    try {
        const file = req.file.path;
        await User.updateOne({ _id: req.user._id, }, { $set: { logo: file } })
        return res.json()
    } catch (error) {
        return res.status(500).json(error);
    }
});

// logout
router.get('/logout',logged, (req, res) => {
    
    req.logout();
    res.status(200).json({success: true});
});


// ALL ????
router.post('/all', async (req, res) => {
    const all = req.body.map( i=>{
        return {_id:i}
    } );
    try {
        const found = await User.find( { $or: [ ...all ] } );
        // if(!found) return res.status(404).json({message: "User not found!"});
        return res.status(200).json(found);
    } catch (error) {
        return res.status(500).json(error);
    }
});


module.exports = router;
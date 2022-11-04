const User = require("../models/User");

const isTrue = async (req,res,next)=>{
    try {
        const {username, password} = req.body;
        if(!username || !password) return res.status(400).json({message: 'Invalid dates'})

        const user = await User.findOne({
            $or: [ {email: username}, {username:username} ]
            })
        if(!user) return res.status(404).json( { message: "User not found!"} );
        if( user.status === false ) return res.status(400).json({message: "Please confirm your email!"});
        if( user.status===true){
            return next();
        }
        if(user.createToken && user.createToken.getTime() < Date.now().getTime()) return res.status(400).json({message: "You can't confirm email. "});
        else return res.status(401).json({message: 'Please confirm your email!'})
    } catch (error) {
        return res.status(500).json({message: "Something wrong went! Try again!"});
    }
}

module.exports = isTrue
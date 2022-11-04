
const logged = (req,res,next)=>{
    if(!req.isAuthenticated()) return res.status(403).json({message: 'This route for only logged users'})
    next()
}

const notLogged = (req,res,next)=>{
    if(req.isAuthenticated()) return res.status(403).json({message: 'This route for only not logged users'})
    next()
}

module.exports = {logged, notLogged}
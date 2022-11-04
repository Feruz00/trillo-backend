const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req,res,cb)=>{
        cb(null, 'uploads');
    },
    filename: (req,file,cb) => {
        cb(null, new Date().getTime() +  req.user.email + '_' + file.originalname)
    }

});

const filefilter = (req,file, cb)=>{
    if(!req.isAuthenticated()) cb(null, false);
    if(file.mimetype.substr(0,5) === 'image' ) cb(null,true);
    else cb(null, false);
}

const upload = multer({storage: storage, fileFilter: filefilter});

module.exports = upload;

const Conversation = require('../models/Conversation');
const Messages = require('../models/Message');
const Follow = require('../models/Follow')
const router = require('express').Router();
const {logged} = require('../middleware/authMiddleware')
// const formidable = require('')

const upload = require('../controller/multer')

function fer( f ){
    return f.map( i=>{
        const {_id, groupName, recipients, admins, status, isGroup} = i;
        return {_id, groupName, recipients, admins, status, isGroup};
    })
}
function mer(m){
    return m.map( i=>{
        const {about, sender, text, type, readers, createdAt} = i;
        return {about, sender, text,type, readers, createdAt};
    } )
}

router.post('/upload',logged, upload.single('file') , async (req, res) => {
    try {
        const file = req.file.path;
        // await User.updateOne({ _id: req.user._id, }, { $set: { logo: file } })
        return res.json(file)
    } catch (error) {
        return res.status(500).json(error);
    }
});

router.post('/video', logged, async (req, res) => {
return 	
});


router.get('/mylist', logged, async (req, res) => {

    try {
        const t =  await Conversation.find( 
            { $and: [ 
                {recipients: 
                    { $elemMatch: 
                        {$eq: req.user._id } 
                    } 
                }, 
                {status: 
                    {
                        $ne: req.user._id 
                    } 
                }  
            ]}  
            ).populate('recipients')
            
        if(t.length === 0) 
            return res.status(200).json( { conversation: [], message: [] } ) 
        let found_conr = fer(t)
        
        const fl = await Follow.findOne({user: req.user._id})
        
        // console.log(fl)
        // console.log(found_conr)
        let found_conver = found_conr.filter(i=>{
            if(i.isGroup) return true
            const {blocking} = fl;
            if(blocking.length === 0) return true
            
            

            return blocking.filter( t=>
                t.toString() === i.recipients[0]._id.toString()
             ).length === 0
        })

        if(found_conver.length === 0) return res.status(200).json( { conversation: [], message: [] } )

        const k =  await Messages.find( { 
            $or: found_conver.map( (i)=> ( 
                
                {$and: [ 
                    
                    { about: i._id }, 
                    
                    {watchers: 
                        { 
                            $elemMatch: 
                                {$eq: req.user._id } 
                        } 
                    } 
                ] 
            } 
            )  ) } ).populate('sender');

        const found_messeg = mer(k)
        
        const result = found_conver.map( i=>{
            
            const m = found_messeg.filter( t=>{
                return  i._id.equals(t.about);
            } )

            return { _id: i._id, messages: m.length === 0 ? [] : m }
        })
        
        return res.status(200).json( { conversation: found_conver, message: result } )    
    } catch (error) {
        console.log(error)
        return res.status(500).json({messages: 'Something wrong went!'})
    }
});

router.post('/name', async (req, res) => {
    const {name, id} = req.body
    if(!req.isAuthenticated()) return res.status(400).json({message: "User cant loginned"});
    try {
        await Conversation.updateOne({ _id: id, }, { $set: { groupName: name } }, (err)=>{
            if(err) return res.status(404).json(err);
            else return res.redirect('/api/v1/conversations/mylist')
        })
    } catch (e) {
        return res.status(500).json({message:"Try again!"})
    }
});
router.post('/insert', async (req, res) => {
    if(!req.isAuthenticated()) return res.status(400).json({message: "User cant loginned"});
    const { id, current } = req.body;
    try {
        await Conversation.findByIdAndUpdate( id, {$push: {admins: current} } );
        res.redirect('/api/v1/conversations/mylist')
    } catch (error) {
        return res.status(404).json(error);
    }
});
router.post('/remove', async (req, res) => {
    if(!req.isAuthenticated()) return res.status(400).json({message: "User cant loginned"});
    const { id, current } = req.body;
    try {
        await Conversation.findByIdAndUpdate( id, {$pull: {admins: current} } );
        res.redirect('/api/v1/conversations/mylist')
    } catch (error) {
        return res.status(404).json(error);
    }
});

router.post('/findOrCreate', async (req, res) => {
    if(!req.isAuthenticated()) return res.status(400).json({message: "User cant loginned"});

    const {recipients} = req.body;
    const only = recipients
    const nr = [...only, req.user._id]
    try {
        // if(nr.length === 2){
        const found = await Conversation.find({ 
                $and: [ { recipients: { $size: nr.length } }, 
                        { recipients: {$all: nr} } 
                    ] 
            }).populate('recipients')
            
            if(found.length > 0){
                
                const { status } = found[0];
                if( status.findIndex( i=>{ return  i.equals(req.user._id) } ) >= 0 ){
                    
                    try {
                        const data = await Conversation.findByIdAndUpdate( 
                            found[0]._id ,
                            {$pull: {status: req.user._id}},
                            {new: true}
                        ).populate('recipients')
                        
                        return res.status(200).json({ans: data, qty: false})
                    } catch (error) {
                        return res.status(500).json({message: 'Something wrong went! Try again!'})
                    }
                    
                }
                
                return res.status(200).json({ans: found[0], qty: true})
            }
            
        const nw = new Conversation({
            recipients: nr,
            admins: [req.user._id],
            isGroup: nr.length > 2
        })
        nw.save().then( result => {
            Conversation
                .populate(nw, {path: 'recipients'})
                    .then( rt => {
                        return res.status(200).json({ans: rt, qty: false})
                    } )
        } );
    
    } catch (e) {
        return res.status(500).json({message: 'Something wrong went! Try again!'})
    }
});

router.post('/add', async (req, res) => {
    if(!req.isAuthenticated()) return res.status(400).json({message: "User cant loginned"});
    const {add,id} = req.body;
    try {
        await Conversation.findByIdAndUpdate( id, {$push: {recipients: { $each: add }  } } );      
        res.redirect('/api/v1/conversations/mylist')
    } catch (error) {
        return res.status(500).json({message: 'Something wrong went! Try again!'})
    }
});

router.post('/group', async (req, res) => {
    if(!req.isAuthenticated()) return res.status(400).json({message: "User cant loginned"});
    const {id} = req.body;
    try {
        await Conversation.findByIdAndUpdate( id, {$pull: {recipients: req.user._id} } );   
        res.redirect('/api/v1/conversations/mylist')
    } catch (error) {
        return res.status(500).json({message: 'Something wrong went! Try again!'})
    }
});

router.post('/one', async (req, res) => {
    if(!req.isAuthenticated()) return res.status(400).json({message: "User cant loginned"});

    const {id} = req.body;
    try {
        await Conversation.findByIdAndDelete( id );   
        res.redirect('/api/v1/conversations/mylist')
    } catch (error) {
        return res.status(500).json({message: 'Something wrong went! Try again!'})
    }
});

router.post('/deleteChat', async (req, res) => {
    if(!req.isAuthenticated()) return res.status(400).json({message: "User cant loginned"});
    
    const {currentConversation} = req.body;

    try {
       
        Messages.updateMany( 
            
            { $and: [ 
                {about: currentConversation._id}, 
                {watchers: 
                    { 
                        $elemMatch: 
                            {$eq: req.user._id } 
                    } 
                }
            ] }, 
            
            {$pull: { watchers: req.user._id } },
            // {$push: {who_delete: req.user._id} },
            
            
            (err)=>{
                if(err) return res.status(400).json({message: 'something wrong went!'})
            }
        )
        Conversation.updateOne( 
            
            {$and: [ 
                {_id: currentConversation._id}, 
                {status: 
                    {$ne: req.user._id 
                    } 
                } 
            ] },
            
            {$addToSet: {status: req.user._id }},
            // {$push: {status: req.user._id }},
            
            (err)=>{
                if(err) console.log("Error:", err);
                else console.log("No error");
            }
        )
        return res.json()
    } catch (error) {
        return res.status(500).json({message: "Something wrong went!"})
    }
    
});

module.exports = router;

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const cors = require('cors');
const session = require('express-session');
const socketio = require('socket.io');
const path = require('path')
const http = require('http');

const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const {addUser, removeUser} = require('./utils/roomAction')
const app = express();

mongoose.connect(
process.env.MONGO_URL
    , {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  useFindAndModify: false
}).then( ()=>{
    console.log('connected database')
} );

const Conversation = require('./models/Conversation');
const User = require('./models/User');
const Messages = require('./models/Message');
const Follow = require('./models/Follow')

// app.use(cors(
//     {
//     origin: process.env.FRONTEND_URL,
//     credentials: true
// }
// ));

app.use(cors());
app.options('*', cors())

// app.use(helmet());

// if (process.env.NODE_ENV === 'development') {
//    app.use(morgan('dev'));
// }

const limitter = rateLimit({
   max: 100,
   windowMs: 60 * 60 * 1000,
   message: 'Too many requests from this IP, please try again in an hour!',
});

// against NoSQL INJECTION
app.use(mongoSanitize());

//agains XSS
app.use(xss());

// prevent parametr pollution
// app.use(
//    hpp()
// );
// app.set('trust proxy', 1)
app.use(express.json());

app.use(express.urlencoded({extended:true}));
// app.use((req,res,next)=>{
//     console.log(req.session)
//     next()
// })
app.use(session({
    secret:process.env.SESSION_SECRET,
    saveUninitialized:false,
    resave: false,
    // cookie: { secure: true }

    // cookie:{
    //     maxAge: 7 * 24 * 60 * 60 * 1000,
    //     sameSite: "none",
    //     secure:false,
    // }
}));

// app.use((req,res,next)=>{
//     console.log(req.session)
//     next()
// })

app.use('/api/v1/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/v1/friends', require('./routes/friendRoutes') );
app.use('/api/v1/conversations', require('./routes/conversationRoutes'));
app.use('/api/v1/posts/', require('./routes/postRoutes') )
app.use('/api/v1/notifications/', require('./routes/notificationRoutes') )


// app.use('/api', limitter);
app.use('/api/v1/users',require('./routes/userRoutes'));
const server = http.createServer(app);

const io = socketio(server,{
    cors: {
      origin: 'http://localhost:3000'
    }
});
io.on('connection', async (socket) => {

    const id = socket.handshake.query.id
    const users = await addUser(id, socket.id);
    io.emit('connectedUsers',{users: users})
    socket.join(id)
    // socket.join(id)
    
    await User.findByIdAndUpdate(id, { $set: { online: true } }, { new: true })
    
    
    io.emit("users", {baza: await User.find({}) })
    socket.on('newpost', async ({userId})=>{
        try {
            const user = await Follow.findOne({user: mongoose.Types.ObjectId(userId)})
            const fer = user.followers;
            
            fer.forEach( async cr=>{
                try {
                    await User.findByIdAndUpdate(cr, {$set: {unreadPosts: true}})
                    socket.broadcast.to(cr.toString()).emit('post', { fer: "fer" })
                } catch (error) {
                    console.log(error)
                }
                
            } )
            
        } catch (error) {
            console.error("post icinde: ", error)        
        }
    })

    socket.on('newnotification', async ({users})=>{
        console.log("geldim", users)
        try {
            users.forEach( async cr=>{
                try {
                    console.log(cr)
                    await User.findByIdAndUpdate(mongoose.Types.ObjectId(cr), {$set: {unreadNotifications: true}})
                    socket.broadcast.to(cr).emit('getnewnotification', { fer: "fer" })
                } catch (error) {
                    console.error(error)
                }
                
            } )
            
        } catch (error) {
            console.error(error)      
        }
    })

    socket.on('deleteUser', ({currentConversation, current}, callback)=>{
        let err1 = false;

        try {
            if(currentConversation.recipients.length === 1) {
                Conversation.findByIdAndDelete( currentConversation._id, function (err, docs) {
                    if (err){
                        err1 = true
                    }
                    
                } )
            }
            else{
                if( currentConversation.admins.includes(current) ){
                    Conversation.findByIdAndUpdate( currentConversation._id, {$pull: {admins: current} }, 
                        function (err, docs) {
                        if (err){
                            err1 = true
                        }
                        
                    } ); 
                }
                Conversation.findByIdAndUpdate( currentConversation._id, {$pull: {recipients: current} }, 
                    function (err, docs) {
                    if (err){
                        err1 = true
                    }
                    
                } );    
            }
            currentConversation.recipients.forEach( r=>{
                if(r._id === current){
                    socket.broadcast.to(current).emit('iamdeleted', {cr: currentConversation})
                }
                else{
                    socket.broadcast.to(r._id).emit('somebodydeleted', {cr: currentConversation, current})
                }
            } )
            
        } catch (error) {
            err1 = true    
        }
        
        callback({err: err1})
    })

    socket.on('handleChange', ({currentConversation, name}, callback)=>{
        console.log("handleChange icinde:", name);
        let err1 = false;
        try {
            Conversation.findByIdAndUpdate(currentConversation._id , { $set: { groupName: name } } ,
                function (err, docs) {
                    if (err){
                        err1 = true
                    }
                    
                } )
            currentConversation.recipients.forEach(r=>{
                if(r._id!==id) socket.broadcast.to(r._id).emit('groupname', {cr: currentConversation, name})
            })
        } catch (error) {
            err = true;
        }
        callback({err: err1})
    })

    socket.on("changeUser", ({currentConversation, current}, callback)=>{
        let err1 = false;
        let ans = currentConversation.admins.includes(current)
        try {
            if( !ans ){
                Conversation.findByIdAndUpdate( currentConversation._id, {$push: {admins: current} }, function (err, docs) {
                    if (err){
                        err1 = true
                    }
                    
                } )
            }
            else{
                Conversation.findByIdAndUpdate( currentConversation._id, {$pull: {admins: current} }, function (err, docs) {
                    if (err){
                        err1 = true
                    }
                    
                } )
            }

            currentConversation.recipients.forEach(r=>{
                if(ans) socket.broadcast.to(r._id).emit("adminout", {cr: currentConversation, current})
                else   socket.broadcast.to(r._id).emit("adminin", {cr: currentConversation, current})
            
            })

        } catch (error) {
            err1 = true
        }
        callback({err: err1, ans})
    })

    socket.on('add_user', async ({add, currentConversation}, callback)=>{
        let err_1 = false;
        const {recipients} = currentConversation
        let data;
        try {
            // const fero = add.map(i=>i._id)
            
            data = await Conversation.findByIdAndUpdate(currentConversation._id, 
                {
                    $push: {
                        recipients: {
                            $each: add,
                            $position: 0
                        }
                    }
                },{new: true}).populate('recipients');
            
            // const nw = [ ...add ,...recipients ]
                // console.log(data)
            add.forEach( i=>{
                socket.broadcast.to(i).emit('group-add', {
                    geldim: data
                })
            
            })

            recipients.forEach( i=>{
                if(i !== id)
                socket.broadcast.to( i ).emit('somebody-added', {
                    geldim: data
                })
            } )

        } catch (error) {
            err_1 = true
        }

        callback({err: err_1, data})

    })
    socket.on('leave-group', ({currentConversation, user}, callback)=>{
        let err_1 = false;
        try {
             
            Conversation.findByIdAndUpdate( currentConversation._id , {$pull: {recipients: user._id}},
                function (err, docs) {
                    if (err){
                        err_1 = true
                    }
                    
                    }
                ) 
            
                currentConversation.recipients.forEach( i=>{
                socket.broadcast.to(i._id).emit('leave-somebody', {
                    cr: currentConversation, 
                    fer: user
                })
            })

        } catch (error) {
            err_1 = true
        }

        callback({err: err_1})

    })
    socket.on('send-message', async ( {recipients, sender , current, value}, callback )=>{
        
        await Conversation.findByIdAndUpdate( current._id, { $set: {status: [] } } )
        .catch(err=>{
            console.log(err);
        })
        let err=false;
        
        // console.log(recipients, sender , current, value)
        if(recipients.length === 1){
            try {
                
                const fl = await Follow.findOne({user: recipients[0]})// laura aarava ugratjak bolya yone aarav block etdi ony
                const {blocking} = fl
                console.log(blocking)
                
                if( blocking.filter(i=>i.toString() === id).length > 0 ) return
            } catch (error) {
                console.log(error)
                err = true
                callback({err: err})
            }
        }

        recipients.forEach(recipient => {
            socket.broadcast.to(recipient).emit('receive-message', {
              current, sender, type: value.type, text: value.text, readers:[], createdAt: Date.now()
            })
        })
        // console.log(value)
        // let dt;
        try {
            
            const nw = new Messages( 
                { 
                    about: current._id, 
                    sender: sender._id, 
                    text:value.text, 
                    watchers: current.recipients.map(r => r._id), 
                    readers:[],
                    type: value.type 
                });
            await nw.save();
            
            callback({err: false})
            // console.log(nw)
        } catch (e) {
            console.log("error:",e);
            err=true;
        }
        callback({err: err})
    });
    socket.on('send-typing', ({currentConversation, user})=>{
        currentConversation.recipients.forEach( r=>{
            socket.broadcast.to( r._id ).emit('get-typing', { current: currentConversation, writer: user })
        })
    })
    socket.on('stop-typing', ({currentConversation, user})=>{
        currentConversation.recipients.forEach( r=>{
            socket.broadcast.to( r._id ).emit('dur-typing', { current: currentConversation, writer: user })
        })
    })
    socket.on('read-message', async ({currentConversation}, callback)=>{
        let err = false;
        try {
            await Messages.updateMany( 
                { $and:[ 
                    {about: currentConversation._id}, 
                    {sender: {$not: {$eq:id}}}, 
                    { readers: { $nin: [id]  } } ] 
                }, 
                { $push: {readers: id} })
        } catch (error) {
            err = true;
        }
        callback({err})
    })
    
    socket.on("callUser", ({ userToCall, signalData, from }) => {
		io.to(userToCall).emit("callUser", { signal: signalData, from });
	});

	socket.on("answerCall", (data) => {
		io.to(data.to).emit("callAccepted", data.signal)
	});
    socket.on("leaveCall", ({user}) => {
		io.to(user._id).emit("leaveCallFrom")
	});
    

    socket.on('disconnect', async ()=>{
        removeUser(socket.id)
        io.emit('connectedUsers',{users: users})
    
        await User.findByIdAndUpdate(id, { $set: { online: false } })
    })

})
app.post('/api/v1/find/', async (req, res) => {
    if(!req.isAuthenticated()) return res.status(403).json({ message: "Only logged users can search!" });
    const {tapmaly} = req.body;
    // console.log(tapmaly)
    try {
        const found = await User.find( {$and: [ { _id: { $not: {$eq: req.user._id} } }, 
            { $or:[ { username: { $regex: `${tapmaly}`, $options: 'i' }},
                    { firstName: { $regex: `${tapmaly}`, $options: 'i' }},
                    { lastName: { $regex: `${tapmaly}`, $options: 'i' }} 
        ] } ]  }   );
        
        return res.status(200).json(found);
    } catch (error) {
        return res.status(500).json({message: "Sorry somenthing went wrong!"});
    }

});
app.post('/get', async (req, res) => {
    const {username} = req.body;
    try {
        const found = await User.findOne({username: username});
        if(!found) return res.status(404).json({message: "Not Found"})
        return res.status(200).json(found);
    } catch (error) {
        return res.status(500).json(error)
    }
});
app.get('/api/v1/video/:url', (req, res) => {
    const path = `${__dirname}/${req.params.id}`;
    const stat = fs.statSync(path);
    const fileSize = stat.size;
    const range = req.headers.range;
    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1]
            ? parseInt(parts[1], 10)
            : fileSize-1;
        const chunksize = (end-start) + 1;
        const file = fs.createReadStream(path, {start, end});
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(path).pipe(res);
    }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, ()=>{
    console.log(`Server started on ${PORT}`);
});
const express = require('express');
const fs = require('fs');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);


let users = [];
let playList = [];
let playCount = 1;

function add_video(title,url,sub){
    let video = {};
    video.id = playCount;
    video.url = url;
    if(sub!=''){
       video.sub_url = sub;
    }
    video.title = title;
    playList.push(video);
    playCount++;

    fs.writeFileSync("playlist.json", JSON.stringify(playList,null, 2));

    return video;
}

fs.readFile("playlist.json", "utf8", function(error,data){ 
    if(error) throw error; // если возникла ошибка
    playList = JSON.parse(data);
});


app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('a user connected');
    users.push({login:"guest",socket:socket});

    playList.forEach(item => {
        socket.emit('add_video', {id:item.id,title:item.title});
    });

    socket.on('disconnect', () => {
       let user='guest';
       users.forEach(userIn => {
        if(userIn.socket==socket){
            user = userIn.login;
        }
       });
      console.log('User: '+user+' disconnected');
    });

    socket.on('login',(login)=>{
        let user;
        users.forEach(userIn => {
            if(userIn.socket==socket){
                user = userIn
            }
        });
        user.login = login;
        console.log('User: '+login+' logged in');
        io.emit('chat message',"System: "+login+" has joined the chat");
    });

    socket.on('chat message', (msg) => {
        console.log('message: ' + msg);
    });

    socket.on('pause', (msg) => {
        console.log('pause: ' + msg);
        users.forEach(user => {
            if(user.socket!=socket){
                user.socket.emit('pause',msg);
            }
        });
    });

    socket.on('play', (msg) => {
        console.log('play: ' + msg);
        users.forEach(user => {
            if(user.socket!=socket){
                user.socket.emit('play',msg);
            }
        });
    });

    socket.on('seek', (msg) => {
        console.log('seek: ' + msg);
        users.forEach(user => {
            if(user.socket!=socket){
                user.socket.emit('seek',msg);
            }
        });
    });

    socket.on('play_video', (msg) => {
        console.log('play_video: ' + msg);
        let video;
        playList.forEach(item => {
            if(item.id==msg){
                video = item;
            }
        });
        if(!video){
            return;
        }
        console.log(JSON.stringify(video))
        users.forEach(user => {
           
            user.socket.emit('play_video',{video_url:video.url,sub_url:video.sub_url});
            
        });
    });

   socket.on('add_video', (msg) => {
    console.log('add_video: ' + msg);
    if(!msg.sub_url){
        fs.writeFileSync('public/sub/'+msg.video_title+'.vtt', msg.sub_text);
        msg.sub_url = 'sub/'+msg.video_title+'.vtt';
    }
    let video = add_video(msg.video_title,msg.video_url,msg.sub_url);
    users.forEach(user => {
        user.socket.emit('add_video',{id:video.id,title:video.title});
    });
   });
    
});


server.listen(process.env.PORT || 5000, () => {
  console.log('listening on *:5000');
});
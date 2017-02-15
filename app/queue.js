


module.exports = function(app, io){
 var queue = [];
 var clients =[];
 const maxQueue = 5;
     io.on('connection', function(socket){
        queue.push(socket.id); 
        
        io.emit('inQueue', "People in queue: " + queue.length + "| Need " + (maxQueue - queue.length) + " to proceed" );
        console.log('user connected:');

         socket.on('storeClientInfo', function (data) {

            var clientInfo = new Object();
            clientInfo.customId = data.customId;
            clientInfo.name = data.name;
            clientInfo.clientId = socket.id;
            clients.push(clientInfo);
        });

       
        console.log("Queue Length" + queue.length);

        socket.on('disconnect', function(){
            var name;
            clients.forEach(function(element){
                if(element.clientId = socket.id){
                    name = element.name;
                }
            });

            io.emit('inQueue', + name +" left the queue!" );
            queue.splice(queue.indexOf(socket.id));
        });

    });


}

  
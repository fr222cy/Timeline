"use strict";
$('document').ready(function(){
var inGame = false;
var socket = io();
var name = $('.name').attr('data-name-value');
var id = $('.id').attr('data-id-value');
var roomId;
var users;
console.log("SCRIPT IS RUNNING")

    socket.on('connect', function (data) {
        socket.emit('InitiliazeQueue', { userId: id, name: name });
    });

    socket.on('queue', function(data){
        $("#peopleLeft").html("Waiting for players : " + data.totalInQueue + "/" + data.maxPlayers);
        $("#inqueue").html(data.inQueue);
    });  

    socket.on('gameReady', function(data){
        socket.emit('joinRoom', {room: data.roomId, userId: id});
        $("#roomId").html("Room: "+data.roomId);
        roomId = data.roomId;
        gameState(data);
        chat();
    }); 


// QUEUE SECTION


//GAME SECTION  
function gameState(data){
    socket.off('queue');
    socket.off('gameReady');


    $( "#sortable" ).sortable({
      revert: true
    });

    $( "#draggable" ).draggable({
      connectToSortable: "#sortable",
      revert: "invalid",
      containment: "gameArea"
    });

    $("#nextTurnButton").click(function() {
        console.log("Click");
        socket.emit('nextTurn', { nextTurn : 1, roomId : roomId})
    })

    socket.on(roomId, function(data){
        $("#round").html("Round: "+ data.round);
        
        if(data.turn.userId == id){
            $("#turn").html("Its your turn");
            $("#nextTurnButton").show();          
        }else{
            $("#turn").html("Its " + data.turn.name + "'s turn");
            $("#nextTurnButton").hide();  
        }
    });

    socket.on(roomId+"/"+id+"/forceNextTurn",function(data){
        socket.emit('nextTurn', { nextTurn : 1, roomId : roomId})
    });

    $("#peopleLeft").html("All here! starting in 2 seconds");
    $("#info").html("Quitting now gives a temporary ban");
    $("#inqueue").html(data.players)
    $("#leaveQueueButton").hide(1000);
    countdown();
}
      
function countdown(){
    var i = 5;
    var myInterval = setInterval(function() {
        $("#peopleLeft").html("All here! starting in "+i+" seconds");
        if (i === 0) {    
            //Hide the queueDiv and show the Gamearea  
            $("#queueDiv").hide(500, function(){
            $("#gameArea").show(300);
            $("#queueDiv").css("display","none");
            
        });  
        clearInterval(myInterval);     
        }else {
            i--;
        }
    }, 1000);
}

window.onbeforeunload = function(event)
{
    return confirm("If you refresh, the game will be considered lost. Proceed?");
};

function chat(){     
    socket.on(roomId+'/message', function(data) {
        if(data.message) {       
            $("#gameChatArea ul").append('<li>'+data.time +'|'+data.sender+': '+data.message+'</li>');   
            var chatarea = $("#gameChatArea");
            chatarea.scrollTop(chatarea.prop('scrollHeight'));
        }else {
            console.log("Something went wrong:", data);
        }
    });

    $("#gameChatInput").keyup(function(e) {
        if(e.keyCode == 13) {
            var text = $("#gameChatInput").val();
            console.log(name + " wrote :" + text);
            if(text){
                socket.emit('newMessage', { message: text,
                                                roomId: roomId, 
                                                sender: name});
                $("#gameChatInput").val("");
            }
        }
    });
}
});
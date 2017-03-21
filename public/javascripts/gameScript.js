"use strict";
$('document').ready(function(){
var inGame = false;
var socket = io();
var name = $('.name').attr('data-name-value');
var id = $('.id').attr('data-id-value');
var roomId;
var users;
var sendDragInterval;
var isDragging = false;
var opponentCardPosY;
var opponentCardPosX;
var timeLeftInterval;

// QUEUE SECTION
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





//GAME SECTION  
function gameState(data){
    socket.off('queue');
    socket.off('gameReady');
  
    $("#nextTurnButton").click(function() {
        console.log("Click");
        socket.emit('nextTurn', { nextTurn : 1, roomId : roomId})
        resetPlayerDragging();
        clearInterval(timeLeftInterval);
    })

    socket.on(roomId+"/"+id, function(data){
        console.log(data);
        startRoundCountdown(data.time);
        removeCards();
        $("#round").html("Round: "+ data.round);
        if(data.isPlayersTurn){
            $("#turn").html("Its your turn");
            $("#nextTurnButton").show(); 
            generateCardDropZone(data.player.cards, true);
            generateCard(data.card, true ) 
        }else{
            $("#turn").html("Its " + data.nameOfTurn + "'s turn");
            $("#nextTurnButton").hide(); 
            generateCardDropZone(data.cards, false);
            generateCard(data.card, false )    
        }
    });

    socket.on(roomId+"/cardMovement", function(data){
        console.log("Movement was triggered");
        var opponentCard = $(".opponentCard");
        if(opponentCard){
            console.log("Movement was triggered & card found");
            opponentCard.animate({
                left: data.x+"%"
                 
                });
     
            $("card-desc").html("X:"+data.x+"% Y:"+data.y+"%");
        }
    });

    function startRoundCountdown(timelimit) {
        clearInterval(timeLeftInterval);
        var progressbar = $( "#progressbar" ),
        progressLabel = $( ".progress-label" );
        var timeleft = timelimit;
        console.log(timelimit);

        timeLeftInterval = setInterval(function(){
            timeleft-=0.5;
            var percentageLeft = (timeleft/timelimit) * 100;
            $(".determinate").css({'width': percentageLeft + '%'});

            if(timeleft==0){
                
            }
        },500);
    };


    socket.on(roomId+"/"+id+"/forceNextTurn",function(data){
        socket.emit('nextTurn', { nextTurn : 1, roomId : roomId})
        resetPlayerDragging();
        clearInterval(timeLeftInterval);
    });

    $("#info").html("Quitting now gives a temporary ban");
    $("#inqueue").html(data.players)
    $("#leaveQueueButton").hide(1000);
    countdown();
}
      
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

function removeCards(){
    $(".card").remove();
    $(".opponentCard").remove();
}

function generateCardDropZone(cards, isPlayersTurn){
    for ( var i=1; i<=10; i++ ) {
        $('<div class="slot">  </div>').attr( 'id', i ).appendTo( '#cardSlots' ).droppable( {
        accept: '#cardPile div',
        hoverClass: 'hovered',
        drop: validateDrop
        });
    }      
}

function generateCard(card, isPlayersTurn){
    if(isPlayersTurn){
        $('<div class="card"><card-year>?</card-year><card-desc>'+card.description+'</card-desc> </div>')
        .attr('id', card.cardId)
        .appendTo( '#cardPile' ).draggable( {
        containment: '#gameArea',
        stack: '#cardPile div',
        cursor: 'move',
        revert: true,
        drag: function(event, ui){
            console.log("MOVING CARD")
            var dragTime = 1;//ms
            self = this;
            if(!isDragging){
                console.log("Sending")
                isDragging = true;
                sendDragInterval = setInterval(function(){
                        var offset = $(self).offset();
                        var left = offset.left;
                        var top = offset.top;
                        var pageX = $("body").width();
                        var pageY = $("body").height(); 
                        var percentX = (left / pageX) * 100; 
                        var percentY = (top / pageY) * 100;
                    socket.emit('cardMovement', { x: percentX, y: percentY, roomId: roomId});
                    $("card-desc").html("X:"+left +" Y:"+ top);
                    if(dragTime <= 0){
                        resetPlayerDragging();
                    }
                    dragTime--;
                },1000);
            }     
        }
        });
    } else{
            $('<div class="opponentCard"><card-year>'+card.year+'</card-year><card-desc>'+card.description+'</card-desc> </div>')
        .appendTo( '#cardPile' );
    }    
}

function validateDrop( event, ui ) {
  var slotNumber = $(this).attr("id");
  var cardId = ui.draggable.attr( "id" );
  var self = this;
            

  console.log("Slot id " + slotNumber);
  

  socket.emit('validateCardDrop', {
      slotnum: slotNumber, 
      userId: id,
      cardId: cardId,
      roomId: roomId
  },function(isValid){
    if (isValid) {

        console.log("DID GO THROUGH Slot id " + slotNumber);
        ui.draggable.addClass( 'correct' );
        ui.draggable.draggable( 'disable' );
        $(self).droppable( 'disable' );
        ui.draggable.position( { of: $(self), my: 'left top', at: 'left top' } );
        ui.draggable.draggable( 'option', 'revert', false );
    }  
  });

 
}

function countdown(){
    var i = 2;
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

function resetPlayerDragging(){
    clearInterval(sendDragInterval);
    isDragging = false;
}

window.onbeforeunload = function(event)
{
    return confirm("If you refresh, the game will be considered lost. Proceed?");
};    

});



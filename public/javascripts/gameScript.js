"use strict";
$('document').ready(function(){
var inGame = false;
var socket = io();
var name = $('.name').attr('data-name-value');
var id = $('.id').attr('data-id-value');
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
        $("#roomId").html("Active room");
        gameState(data);
        chat();
    }); 

//GAME SECTION  
function gameState(data){
    socket.off('queue');
    socket.off('gameReady');
  
    $("#nextTurnButton").click(function() {
        socket.emit('nextTurn', { userId: id})
        resetPlayerDragging();
        clearInterval(timeLeftInterval);
    })

    socket.on("turn", function(data){
        $('.category').attr('disabled','disabled');
        console.log(data);
        startRoundCountdown(data.time);
        removeCards();
        $("#round").html("Round: "+ data.round);
        if(data.isPlayersTurn){
            $('.category').removeAttr('disabled');
            $("#turn").html("Its your turn");
            $("#nextTurnButton").show(); 
            generateCardDropZone(data.playersCards, true);
        }else{
            $("#turn").html("Its " + data.nameOfTurn + "'s turn");
            $("#nextTurnButton").hide(); 
            generateCardDropZone(data.cards, false);
        }
    });

    socket.on("cardMovement", function(data){   
            var options = {
            "my": "top left",
            "at": "top left",
            "of": "#"+data.slot,
            using: function(pos){
                if(data.success){
                    $(this).addClass("correct");
                    animateSuccess($(this), pos);
                }else{
                    animateFailure($(this), pos);
                }
            }
        };
        $("#"+data.cardId).position(options);       
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

    $(".category").click(function() {
        var category = $(this).attr("id");
        socket.emit("getCard",
        {userId: id,
         category: category}
         ,function(card){
            generateCard(card, true ) 
            $('.category').attr('disabled','disabled');
        });
    });

    socket.on("newCard", function(data){
         generateCard(data.card, false )  
    });

    socket.on("forceNextTurn",function(data){
        clearInterval(timeLeftInterval);
    });

    $("#info").html("Quitting now gives a temporary ban");
    $("#inqueue").html(data.players)
    $("#leaveQueueButton").hide(1000);
    countdown();
}
      
function chat(){     
    socket.on('message', function(data) {
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
            if(text){
                socket.emit('newMessage', { message: text, sender: name});
                $("#gameChatInput").val("");
            }
        }
    });
}

function removeCards(){
    $(".card").remove();
    $(".opponentCard").remove();
    $("#cardSlots").empty();
}

function generateCardDropZone(cards, isPlayersTurn){
    var dragOptions = {
            containment: '#gameArea',
            stack: '#cardPile div',
            cursor: 'move',
            revert: true,
            start: function(){
                $(this).data("origPosition",$(this).position()) 
                } 
            };
    
    for (var i=1; i<=10; i++) { 
        $('<div class="slot">  </div>').attr( 'id', i ).appendTo( '#cardSlots' ).droppable( {
        accept: '#cardPile div, #cardSlots div',
        hoverClass: 'hovered',
        drop: validateDrop
    });
        var card = cards[i-1];
        if(card !== 0){
            if(isPlayersTurn){
                console.log(card);
                    $('<div class="card"><card-year>'+card.year+'</card-year><card-desc>'+card.description+'</card-desc> </div>')
                    .attr('id', card.id)
                    .appendTo( '#'+i ).draggable(dragOptions);
            }else{
                $('<div class="opponentCard"><card-year>'+card.year+'</card-year><card-desc>'+card.description+'</card-desc> </div>')
                .appendTo( '#'+i ).attr('id', card.id);
            }
        }
    }      
}

function generateCard(card, isPlayersTurn){
    console.log(card);
    var dragOptions = {
            containment: '#gameArea',
            stack: '#cardPile div',
            cursor: 'move',
            revert: true,
            start: function(){
                $(this).data("origPosition",$(this).position()) 
                } 
            };


    if(isPlayersTurn) {
        $('<div class="card"><card-year>'+card.year+'</card-year><card-desc>'+card.description+'</card-desc> </div>')
        .attr('id', card.id)
        .appendTo( '#cardPile' ).draggable(dragOptions);
        
    } else {
            $('<div class="opponentCard"><card-year>'+card.year+'</card-year><card-desc>'+card.description+'</card-desc> </div>')
        .appendTo( '#cardPile' ).attr('id', card.id);
    }    
}

function validateDrop( event, ui ) {
 var draggedOptions = {
            containment: '#cardSlots',
            cursor: 'move',
            revert: true,
            start: function(){
                $(this).data("origPosition",$(this).position()) 
                } 
  };


  var slotNumber = $(this).attr("id");
  var cardId = ui.draggable.attr( "id" );
  var draggedCard = ui.draggable;
  var self = this;
  draggedCard.draggable( 'option', 'revert', false );          

    socket.emit('moveCard', {
      slotnum: slotNumber, 
      userId: id,
      cardId: cardId
    },function(isValid,year){ //Callback
        if (isValid) {
            draggedCard.draggable(draggedOptions);
            console.log(year);
            draggedCard.find("card-year").html(year)
            
         
            //draggedCard.data("slotNum", slotNumber.replace("slot", ""));
            $('.category').removeAttr('disabled');
            draggedCard.addClass( 'correct' )
            draggedCard.addClass( 'dropped' );
            //ui.draggable.draggable( 'disable' );
            //$(self).droppable( 'disable' );
            draggedCard.position( { of: $(self), my: 'left top', at: 'left top' } );
            animateSuccess(draggedCard, null);
        } else{
            $("#nextTurnButton").hide(); 
            console.log("Failed ");
            animateFailure(draggedCard, null);
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

function animateSuccess(cardObject, pos){
    if(pos == null){
        cardObject.css({"backgroundColor":"yellow"})
    }else{
       
        cardObject.animate(pos, 1000, "swing", function(){
        cardObject.css({"backgroundColor":"yellow"})
    });
    }  
}

function animateFailure(cardObject, pos){
    if(pos == null){
         cardObject.css({"backgroundColor":"darkRed"})
         .animate({top: -5+"%"}, 1000, "swing", function(){
        cardObject.fadeOut(500, function(){
        cardObject.remove();
            }); 
        });
    }else{ 
        cardObject.animate(pos, 1000, "swing", function(){
            cardObject.css({"backgroundColor":"darkRed"})
        }).animate({top: -5+"%"}, 1000, "swing", function(){
            cardObject.fadeOut(500, function(){
            cardObject.remove();
            }); 
        });
    }
}



window.onbeforeunload = function(event)
{
    return confirm("If you refresh, the game will be considered lost. Proceed?");
};    

});





"use strict";
$('document').ready(function () {	
  var socket = io();
  var name = $('.name').attr('data-name-value');
	var id = $('.id').attr('data-id-value');
  var isLeader = $.parseJSON($('.isLeader').attr('data-id-value'));

  if(isLeader != null && isLeader) {
    $('#joinRoomDiv').addClass('hidden');

    socket.on('connect', function (data) {
		  socket.emit('createNewGame', { userId: id, name: name });
	  });

    socket.on('onCreated', function (data) {
      $('#generatedRoomId').text("Your room is: " + data.roomId +". Share it with your friends!");

      $('#startPrivateGameButton').click(function() {
      socket.emit('startPrivateGame', { roomId : data.roomId , userId : id})
      });
    });

    showGameLobby();
  }else {
   
    $('#privateRoomDiv').addClass('hidden');

    $('#joinRoomForm').submit(function(e) {
      e.preventDefault();
      var roomId = $('#inputJoinRoom').val();
      $('#inputJoinRoom').val("")
      socket.emit('joinGame', {userId : id, name: name, roomId : roomId}, function(err, isValidJoin) {
        if(err) {
          $('#privateRoomErr').css({color : 'red'})
          $('#joinRoomDiv').effect( "shake");
          $('#privateRoomErr').text(err);
        } 
        else if(isValidJoin) {
          $('#privateRoomErr').text("");
          $('#joinRoomDiv').addClass('hidden');
          $('#privateRoomDiv').removeClass('hidden');
          showGameLobby();
        }
      });
    });
  }
  

  socket.on('updatePlayerList', function (data) {
    $('#playersInRoomDiv').html(data.tableHtml);
    playPlayerJoinSound();
  });

  socket.on('gameReady', function (data) {
    $("#roomId").html("Active room");
    console.log("start game")
    gameState(data, socket, id, name, "PRIVATE_GAME");
    chat();
  });
  
  function showGameLobby() {

    socket.on('onJoin', function (data) {
      
      $("#inqueue").html(data.inQueue);
	  });
  }



	


});
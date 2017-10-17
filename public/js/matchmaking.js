"use strict";
$('document').ready(function () {	
  var socket = io();
  var name = $('.name').attr('data-name-value');
	var id = $('.id').attr('data-id-value');

  socket.on('connect', function (data) {
		socket.emit('queueJoin', { userId: id, name: name });
	});

	socket.on('queue', function (data) {
		$("#waitNotification").html("Waiting for players : " + data.totalInQueue + "/" + data.maxPlayers);
		$("#inqueue").html(data.inQueue);
		playPlayerJoinSound();
	});

	socket.on('gameReady', function (data) {
		$("#roomId").html("");
		gameState(data, socket, id, name, "QUEUE");
		chat();
	});
});
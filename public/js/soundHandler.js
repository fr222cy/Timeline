
//Register sounds
var prefix = "public/sounds/";
var buttonClick = new Audio(prefix + 'button_click.wav');
var cardDraw = new Audio(prefix + 'card_draw.wav');
var correctSlot = new Audio(prefix + 'correct_slot.wav');
var wrongSlot = new Audio(prefix + 'wrong_slot.wav')
var playerJoin = new Audio(prefix + 'player_join.wav');
var yourTurn = new Audio(prefix + 'your_turn.wav');

$('document').ready(function () {	
  $('a, button').click(function(){
    
    buttonClick.play();
  });
});

function playCardDrawSound() {
cardDraw.play();
}

function playCorrectSlotSound() {
cardDraw.play();
}

function playWrongSlotSound() {
wrongSlot.play();
}

function playYourTurnSound() {
yourTurn.play();
}

function playPlayerJoinSound() {
playerJoin.play();
}
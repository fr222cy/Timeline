var addEloChange = require('./../dbProcs/addEloChange.js');
var getPlayerElo = require('./../dbProcs/getPlayerElo.js');

function calculateElo(players) {
  getPlayersElos(players, function (players) {
    players.sort(compare);
    calculateAndUpdateDb(players);
  })

}

function getPlayersElos(players, next) {
  var updatedPlayers = 0;
  players.forEach(function (player) {
    getPlayerElo(player.userId, function (err, elo) {
      player.rating = elo;
      player.ratingChange = 0;
      updatedPlayers++;
      if (updatedPlayers == players.length) {
        next(players);
      }
    });
  });
}

//https://github.com/FigBug/Multiplayer-ELO/blob/master/java/elo.java
//translated from java to js
function calculateAndUpdateDb(players) {
  var n = players.length;
  var K = 32 / (n - 1);
  console.log("N =" + n);
  console.log("K =" + K);
  for (var i = 0; i < n; i++) {
    var currentPlace = players.indexOf(players[i]);
    console.log(players[i].name + "Currentplace =" + currentPlace); 
    var currentElo = players[i].rating;


    for (var j = 0; j < n; j++) {
      if (i !== j) {
        var opponentPlace = players.indexOf(players[j]);
        console.log(players[i].name + "has opponent " + players[j].name); 
        
        var opponentElo = players[j].rating;
        var S;
        if (currentPlace < opponentPlace) {
          S = 1.0;
        } else if (currentPlace === opponentPlace) {
          S = 0.5;
        } else {
          S = 0.0;
        }
        var EA = 1 / (1.0 + Math.pow(10.0, (opponentElo - currentElo) / 400.0));
        players[i].ratingChange += Math.round(K * (S - EA));
      }
    }
    players[i].rating += players[i].ratingChange;

    var userToUpdate = players[i];
    addEloChange(userToUpdate.userId,
      userToUpdate.rating,
      userToUpdate.ratingChange,
      function (err) {
        if (err) {
          console.log(err)
        }
      });
  }
}

function compare(a, b) {
  // Use toUpperCase() to ignore character casing
  const cardsA = a.cards.length;
  const cardsB = b.cards.length;

  let comparison = 0;
  if (cardsA > cardsB) {
    comparison = 1;
  } else if (cardsA < cardsB) {
    comparison = -1;
  }
  return comparison;
}



module.exports = calculateElo;

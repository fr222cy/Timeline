let addEloChange = require('./../dbProcs/addEloChange.js');
let getPlayerElo = require('./../dbProcs/getPlayerElo.js');

class EloHandler {

  constructor(players) {
    this.players = players.slice();
  }

  addPlaceToPlayer(userId, place) {
    console.log(userId);
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].userId == userId) {
        console.log("ELOHANDLER: Added Place " + place +" to "+ this.players[i]);
        this.players[i].place = place;
      }
    }
  }

  getPlayersRatings(next) {
    let updatedPlayers = 0;
    this.players.forEach((player) => {
      getPlayerElo(player.userId, (err, elo) => {
        player.rating = elo;
        player.ratingChange = 0;
        updatedPlayers++;
        if (updatedPlayers == this.players.length) {
          next(this.players);
        }
      });
    });
  }

  calculateElo() {
    this.getPlayersRatings((playersWithElo) => {
      this.calculateAndUpdateDb(playersWithElo);
    });
  }

  //https://github.com/FigBug/Multiplayer-ELO/blob/master/java/elo.java
  //translated from java to js
  calculateAndUpdateDb(players) {
    let n = players.length;
    let K = 32 / (n - 1);
    console.log("N =" + n);
    console.log("K =" + K);
    for (let i = 0; i < n; i++) {
      let currentPlace = players[i].place;
      console.log(players[i].name + "Currentplace =" + currentPlace);
      let currentElo = players[i].rating;


      for (let j = 0; j < n; j++) {
        if (i !== j) {
          let opponentPlace = players[j].place
          console.log(players[i].name + "has opponent " + players[j].name);

          let opponentElo = players[j].rating;
          let S;
          if (currentPlace < opponentPlace) {
            S = 1.0;
          } else if (currentPlace === opponentPlace) {
            S = 0.5;
          } else {
            S = 0.0;
          }
          let EA = 1 / (1.0 + Math.pow(10.0, (opponentElo - currentElo) / 400.0));
          players[i].ratingChange += Math.round(K * (S - EA));
        }
      }
      players[i].rating += players[i].ratingChange;

      let userToUpdate = players[i];

      addEloChange(userToUpdate.userId,
        userToUpdate.rating,
        userToUpdate.ratingChange,
        (err) => {
          if (err) {
            console.log(err)
          }
        });
    }
  }
}







module.exports = EloHandler;

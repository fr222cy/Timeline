var express = require('express');
var app = express();
var http = require('http').Server(app);
var mongoose = require('mongoose');
var cardSchema = require('./app/model/cardSchema.js');
var configDB = require('./config/database.js');
mongoose.connect(configDB.url);
var fs = require('fs');


fs.readFile('./cards.json', 'utf8', function (err, data) {
    if (err) throw err; 
    load(data);
});

function load(data) {
    var objs = JSON.parse(data);
    this.count = 0;
    objs.forEach(function(card) {
      var newCard = new cardSchema();   
      newCard.description = card.description;
      newCard.year = card.year;
      newCard.save(function(err){
          if(err){
              console.log("Failed to save card to db");
          }
      });   
    });
}
   
http.listen(8081, function(){
  console.log("Scraper on!");
  //http.close();
});
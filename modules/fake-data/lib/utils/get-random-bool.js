var getRandomInt = require('./get-random-int');

module.exports = function getRandomBool(){
  return getRandomInt(0, 10) % 2;
};

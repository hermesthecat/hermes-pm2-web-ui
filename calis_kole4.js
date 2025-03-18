// miner01.js
setInterval(() => {
  console.log('Calisiyorum lan! 4');
}, 1000);// miner02.js
setInterval(function () {
  console.log("Daha cok calisiyorum lan! 4");
  for (var i = 0; i < 9999; i++) {
    Math.random();
  }
  console.log("Rastgele 4: " + Math.random());
}, 2000);
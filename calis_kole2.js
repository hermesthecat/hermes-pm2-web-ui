// miner01.js
setInterval(() => {
  console.log('Calisiyorum lan! 2');
}, 1000);// miner02.js
setInterval(function () {
  console.log("Daha cok calisiyorum lan! 2");
  for (var i = 0; i < 9999; i++) {
    Math.random();
  }
  console.log("Rastgele 2: " + Math.random());
}, 2000);
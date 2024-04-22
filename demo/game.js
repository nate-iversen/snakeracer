(async()=>{
  // make sure the game is initialized
  await initGCGame();

  // set game variables
  const canvas = document.getElementById('game');
  const context = canvas.getContext('2d');
  const grid = 15;
  const paddleWidth = grid * 5; // 80
  const maxPaddleX = canvas.width - grid - paddleWidth;
  var game1Timer = 10;

  var paddleSpeed = 6;
  var ballSpeed = 5;
  let score = 0;
  let otherScore = 0;
  let extraBalls = [];
  let creatingExtraBall = false;
  let gettingTap = false;
  let lastSipCount = 0;
  
  // finish the game after 30 seconds
  let gameOverTimer = setInterval(()=>{
    game1Timer--;
    if (game1Timer <= 0) {
      // finish the game and indicated whether the current player is the winner
      finishGCGame(score > otherScore);
    }
  },3000);
  
  const topPaddle = {
    // start in the middle of the game on the left side
    y: grid * 2,
    x: canvas.width / 2 - paddleWidth / 2,
    width: paddleWidth,
    height: grid,

    // paddle velocity
    dx: 0
  };
  const bottomPaddle = {
    // start in the middle of the game on the right side
    y: canvas.height - grid * 3,
    x: canvas.width / 2 - paddleWidth / 2,
    width: paddleWidth,
    height: grid,

    // paddle velocity
    dx: 0
  };
  let ball = {
    // start in the middle of the game
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: grid,
    height: grid,

    // keep track of when need to reset the ball position
    resetting: false,

    // ball velocity (start going to the top-right corner)
    dx: ballSpeed,
    dy: -ballSpeed
  };

  // check for collision between two objects using axis-aligned bounding box (AABB)
  // @see https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
  function collides(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
  }

  // start getting GC coords
  GetMove();
  
  // game loop
  function loop() {
    if (!gameOver) {
     
      requestAnimationFrame(loop);
      checkGameData();
      context.clearRect(0,0,canvas.width,canvas.height);

      // move paddles by their velocity
      topPaddle.x += topPaddle.dx;
      bottomPaddle.x += bottomPaddle.dx;

      // prevent paddles from going through walls
      if (topPaddle.x < grid) {
        topPaddle.x = grid;
      }
      else if (topPaddle.x > maxPaddleX) {
        topPaddle.x = maxPaddleX;
      }

      if (bottomPaddle.x < grid) {
        bottomPaddle.x = grid;
      }
      else if (bottomPaddle.x > maxPaddleX) {
        bottomPaddle.x = maxPaddleX;
      }

      // draw paddles
      context.fillStyle = 'white';
      context.fillRect(topPaddle.x, topPaddle.y, topPaddle.width, topPaddle.height);
      context.fillRect(bottomPaddle.x, bottomPaddle.y, bottomPaddle.width, bottomPaddle.height);

      // the host handles the ball logic and sends paddle and ball coordinates to the guest
      if (isHost) {
        
        moveBall(ball);
        moveExtraBalls();
        
        // reset ball if it goes past paddle (but only if we haven't already done so)
        if ( (ball.y < 0 || ball.y > canvas.height) && !ball.resetting) {
          ball.resetting = true;
          
          if (ball.y < 0) {
            // vibrate the GameCozy and change the LED color to green for one second
            vibMotPulse(1);
            setLEDinterval(0x00ff00, 0x000000, 1000, 2)
            score++;
          }
          else if (ball.y > canvas.height) {
            // vibrate the GameCozy and change the LED color to red for one second
            vibMotPulse(1);
            setLEDinterval(0xff0000, 0x000000, 1000, 2)
            otherScore++;
          }
          
          // give some time for the player to recover before launching the ball again
          setTimeout(() => {
            ball.resetting = false;
            ball.x = canvas.width / 2;
            ball.y = canvas.height / 2;
          }, 400);
        }

        // check to see if ball collides with paddle. if they do change x velocity
        if (collides(ball, topPaddle)) {
          ball.dy *= -1;

          // move ball next to the paddle otherwise the collision will happen again
          // in the next frame
          ball.y = topPaddle.y + ball.height;
        }
        else if (collides(ball, bottomPaddle)) {
          ball.dy *= -1;

          // move ball next to the paddle otherwise the collision will happen again
          // in the next frame
          ball.y = bottomPaddle.y - ball.height;
        }
        
        // use coords to move bottom host paddle
        if (coords[1] < -.5) {
          bottomPaddle.dx = -paddleSpeed;
        }
        else if (coords[1] > .5) {
          bottomPaddle.dx = paddleSpeed;        
        }
        else {
          bottomPaddle.dx = 0;
        }
                          
        // create a distraction ball on button press every five seconds
        if (btnPress == true && !creatingExtraBall) {
          createExtraBall();
        }        

        // increase the ball speed on tap
        if (!gettingTap) {
          gettingTap = true;
          GetTap(3000)
          setTimeout(() => {
            gettingTap = false;
          }, 3500);            
        }

        if (taps > 0) {
          taps = 0;
          ballSpeed += 1;
          ball.dx = ball.dx > 0 ? ballSpeed : -ballSpeed;
          ball.dy = ball.dy > 0 ? ballSpeed : -ballSpeed;
        }
        
        // reset the distraction balls and ball speed on sip
        if (lastSipCount != sips) {
          resetBalls();
          lastSipCount = sips;
        }         
        
        // send player data to the guest
        sendPlayerData(JSON.stringify({ball: { x: ball.x, y: ball.y }, extraBalls: extraBalls, bottomPaddle: bottomPaddle, score: score, guestScore: otherScore}));
        
      }
      
      // the guest receives the data and moves the top paddle
      else {
            
      // move top guest paddle
      if (coords[1] < -.5) {
        topPaddle.dx = -paddleSpeed;
      }
      else if (coords[1] > .5) {
        topPaddle.dx = paddleSpeed;
      }
      else {
        topPaddle.dx = 0;
      }
        
      // send player data to the host
      sendPlayerData(JSON.stringify({ topPaddle: topPaddle, score: score }));       

      // draw ball
      context.fillRect(ball.x, ball.y, ball.width, ball.height);

      // draw extra balls
        for (let i = 0; i < extraBalls.length; i++) {
          let extraBall = extraBalls[i];
          context.fillStyle = 'yellow';          
          context.fillRect(extraBall.x, extraBall.y, extraBall.width, extraBall.height);
        }        

    }           
      
      // draw walls
      context.fillStyle = 'lightgrey';
      context.fillRect(0, 0, grid, canvas.height);
      context.fillRect(canvas.width - grid, 0, canvas.height - grid, canvas.height);

      // draw dotted line down the middle
      for (let i = grid; i < canvas.height - grid; i += grid * 2) {
        context.fillRect(canvas.width / 2 - grid / 2, i, grid, grid);
      }
    }
      
  }
  
  // crete an extra ball
  function createExtraBall() {
    creatingExtraBall = true;
    newBall = structuredClone(ball);
    newBall.x = canvas.width / 2;
    newBall.y = canvas.height / 2;
    newBall.resetting = false;
    extraBalls.push(newBall);
    setTimeout(() => {
      creatingExtraBall = false;
    }, 5000);
  }  
  
  // remove distraction balls and reset ball speed
  function resetBalls() {
    extraBalls = [];
    ballSpeed = 5;
    ball.dx = ball.dx > 0 ? 5 : -5;
    ball.dy = ball.dy > 0 ? 5 : -5;
  }
    
  // move a ball
  function moveBall(singleBall, extraBoundary) {
    // move ball by its velocity
    singleBall.x += singleBall.dx;
    singleBall.y += singleBall.dy;

    // prevent ball from going through walls by changing its velocity
    if (singleBall.x < grid) {
      singleBall.x = grid;
      singleBall.dx *= -1;
    }
    else if (singleBall.x + grid > canvas.width - grid) {
      singleBall.x = canvas.width - grid * 2;
      singleBall.dx *= -1;
    }
    else if (extraBoundary && (singleBall.y < 0)) {
      singleBall.y = singleBall.height;
      singleBall.dy *= -1;
    }
    else if(extraBoundary && singleBall.y > canvas.height){
      singleBall.y = canvas.height - singleBall.height;
      singleBall.dy *= -1;      
    }
    
    // draw ball
    if (extraBoundary) {
      context.fillStyle = 'yellow';
    }

    context.fillRect(singleBall.x, singleBall.y, singleBall.width, singleBall.height);
    
  }    
  
  // iterate through extra balls and move them
  function moveExtraBalls() {
    
    for (let i = 0; i < extraBalls.length; i++) {
      let extraBall = extraBalls[i];
      moveBall(extraBall, true);
    }
  
  }
  
  // check the window.gameData object for the other player's data and update the game
  window.checkGameData = function(){
    let firstNonMeKey = Object.keys(window.gameData).find(key => key !== "me");
    if (window.gameData[firstNonMeKey] && window.gameData[firstNonMeKey].hasOwnProperty("topPaddle")) {
      topPaddle.dx = window.gameData[firstNonMeKey]["topPaddle"].dx;
    }
    else if (window.gameData[firstNonMeKey]) {
      thisBall = window.gameData[firstNonMeKey]["ball"];
      ball.x = thisBall.x;
      ball.y = thisBall.y;
      bottomPaddle.dx = window.gameData[firstNonMeKey]["bottomPaddle"].dx;
      extraBalls = window.gameData[firstNonMeKey]["extraBalls"];
      if (window.gameData[firstNonMeKey]["score"] != otherScore) {
        otherScore = window.gameData[firstNonMeKey]["score"];        
        vibMotPulse(1);
        setLEDinterval(0xff0000, 0x000000, 1000, 2)
      }
      if (window.gameData[firstNonMeKey]["guestScore"] != score) {
        score = window.gameData[firstNonMeKey]["guestScore"];
        vibMotPulse(1);
        setLEDinterval(0x00ff00, 0x000000, 1000, 2)
      }
    }
  }
 
  // start the game
  requestAnimationFrame(loop);
  
})();
let socket = io();
let GameXframe = document.getElementById("GameXframe");
let startBtn = document.getElementById("start_btn");
let hostIndicator = document.getElementById("host_indicator");
let guestIndicator = document.getElementById("guest_indicator");
let playerNameElements = document.getElementsByClassName("player_name");
let gameOutcomeContainer = document.getElementById("gameOutcomeContainer");
let scoresLoaded = false;
window.isHost = false;
let gameStarted = false;

startBtn.addEventListener("click", () => {
    if (!gameStarted) {
        socket.emit("startGame");
        gameStarted = true;
        startBtn.textContent = "RESET"
        startBtn.classList.add("reset");
    }
    else {
        gameStarted = false;
        socket.emit("resetGame");
        resetGameWindow();
        startBtn.textContent = "PLAY"
        startBtn.classList.remove("reset");
    }
});

window.scid = Math.random().toString(36).split('.')[1];
for (var i = 0; i < playerNameElements.length; i++) {
    playerNameElements[i].textContent = window.scid;
 }

socket.on("connect", () => {
    console.log("connected!");
});

socket.on("setAsHost", ()=>{
    window.isHost = true;
    postBroadcast('setHost', true);
    startBtn.style.display = "block";
    guestIndicator.style.display = "none";
    hostIndicator.style.display = "block";
});

socket.on("setAsGuest", ()=>{
    hostIndicator.style.display = "none";
    guestIndicator.style.display = "block";
});

socket.on("allJoined", (status)=>{
    postBroadcast('allJoined',true);
});

socket.on("playerData", (data) => {
    HandlePlayerData(data);
});

socket.on("resetGame", (status)=>{
    resetGameWindow();
});

function SendPlayerData(data) {
    socket.emit('PlayerData', window.scid, data);
 }

 function HandlePlayerData(data) {
    postBroadcast('gameData', data);
}

function GameOver(winner) {
    console.log("GAME OVER");
    socket.emit('GameOver', window.scid, winner);
    getGameEndData();
    let statusText = document.getElementById("statusText");
    let status = "Congratulations, you are the winner!"
    if (winner != "true"){
        status = "We're sorry, but you lost."
    }
    statusText.innerText = status;
    showGameEnd();
}

function resetGameWindow() {
    gameOver = false;
    scoresLoaded = false;
    document.getElementById("playerBoard").style.opacity = 0;
    
    GameXframe.contentWindow.location.reload();
    document.getElementById("mvpContainer").style.display = "none";
}

function getGameEndData(){
    fetch("../game/GameConfig.json")
    .then((response) => {
        return response.json();
    })
    .then((data) => {
        gameConfig = data;
        initGameEndData();
        setTimeout(function () {
            initGameEndData();
        }, 5000);
    })
}

function initGameEndData(){

    let playerDataArray = Object.values(GameXframe.contentWindow.gameData);

    playerDataArray.sort((a, b) => {
        if (gameConfig["RankOrder"] === 'asc') {
            return a[gameConfig["RankBy"]] - b[gameConfig["RankBy"]];
        } else if (gameConfig["RankOrder"] === 'desc') {
            return b[gameConfig["RankBy"]] - a[gameConfig["RankBy"]];
        }
    });

    let players = [];
    let tempDiv = document.getElementById("playerBoard").cloneNode();
    tempDiv.innerHTML = ""

    for(let i=0; i<playerDataArray.length; i++){
        if (i > 2){
            return
        }
        if (i == 0 ){
            image = "goldMedal.png"
        }
        else if (i == 1){
            image = "silverMedal.png"
        }
        else {  
            image = "bronzeMedal.png"
        }
        let div = document.createElement('div');
        div.classList.add("player");
        div.innerHTML = `<div class='playerMedal' style='float:left;'></div><div class='playerNickname'>${playerDataArray[i].nickname} - ${unescape(playerDataArray[i].score)}</div>`;
        players.push(div);
        tempDiv.appendChild(div);
    }
       
    if (!scoresLoaded){

        setTimeout(function(){

            let opacity = 0;
            let intervalID = setInterval(function() { 
                  
                if (opacity < 1) { 
                    opacity = opacity + 0.1 
                    document.getElementById("playerBoard").style.opacity = opacity; 
                } else { 
                    clearInterval(intervalID); 
                    scoresLoaded = true;
                } 
            }, 100);    
           
        }, 2000)
    }
    
    document.getElementById("mvpContainer").replaceChild(tempDiv, document.getElementById("playerBoard"));
    
}

/*******************************************************************/
let postBroadcast;
let gameOver = false;

window.addEventListener("message", function(e){
    key = Object.keys(e.data)[0];
    handle_storage({key: key, newValue: e.data[key]});
}, false);


async function handle_storage(e){

    if(e.newValue){
        let seshID = JSON.parse(e.newValue)["seshID"];
        let seshIDexist = true;
        let sameSeshID = false;
        let newValue = e.newValue;
        try{
            JSON.parse(e.newValue);
        }catch{
            seshIDexist = false;
        }
    
        if(seshIDexist){
            if(seshID==JSON.parse(e.newValue).seshID){
                sameSeshID = true;
                if (JSON.parse(e.newValue).value){
                    newValue = JSON.parse(e.newValue).value.toString();
                }
            }
        }
    
        if (!seshIDexist || sameSeshID) {

            if (e.key === 'SendPlayerData') {
                SendPlayerData(newValue);
            }
            
            else if (e.key === 'GameOver' && !gameOver) {
                gameOver = true;
                GameOver(newValue);
            }
            
            else if (e.key == 'GetMove') {
                await GetMove();
            }

            else if (e.key == 'GetTap') {
                await GetTap(parseInt(newValue));
            }                
                
            else if (e.key === 'SetVib') {
                if (newValue) {
                    await SetVib(JSON.parse(newValue));
                }
            }
            else if (e.key === 'vibMotPulse') {
                if (newValue) {
                    await vibMotPulse(parseInt(newValue));
                }
            }
            else if (e.key === 'SetLED') {
                if (newValue) {
                    let tempArray = newValue.split(',');
                    await SetLED(parseInt(tempArray[0]), parseInt(tempArray[1]), parseInt(tempArray[2]));
                }
            }
            else if (e.key === 'setLEDs') {
                if (newValue) {
                    let tempArray = newValue.split(',');
                    await setLEDs(parseInt(tempArray[0]), parseInt(tempArray[1]));
                }
            }
            else if (e.key === 'setLEDinterval') {
                if (newValue) {
                    let tempArray = newValue.split(',');
                    await setLEDinterval(parseInt(tempArray[0]), parseInt(tempArray[1]), parseInt(tempArray[2]), parseInt(tempArray[3]));
                }
            }
            else if (e.key == 'GetTimeSinceLastDrink') {
                await GetTimeSinceLastDrink();
            }            
            else if (e.key == 'GetSessionSips') {
                await GetSessionSips();
            }            

        }
    }
}

function showGameEnd() {
    mvpContainer.style.display = "block";
}


postBroadcast = (key, value = "", gameXframe = true) => {
    if (gameXframe) {
        var win = GameXframe.contentWindow;        
    }
    else {
        var win = window.parent;
    }
    if (win) {
        data = {}
        data[key] = JSON.stringify({ seshID: sessionStorage.getItem('seshID'), value: value });
        win.postMessage(data, "*");       
    }
}
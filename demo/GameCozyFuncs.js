/*GameCozy global variables and high level functions*/
let waitB4Read = 0;            //time to wait before reading BLE value set by ESP32, in milliseconds
let waitB4Return = 550;        //time to wait before returning parsed BLE value, in milliseconds
let coords = new Array(3);      //will hold the acceleration values of x,y,z axis', respectively
let tiltDirection;     //will hold tilt direction in degrees
let tiltAngle;        // will hold angle of drink
let sips = 0;
let sessionSips = 0;
let timeSinceLastDrink;
let taps = 0;
let volumeLevel = 0;
let btnPress = false;
var scannedMACs = new Array(25);    //holds up to 25 scanned MAC addresses nearby
var scannedMACsRSSI = new Array(25);    //holds up to 25 RSSI value for the scanned MAC addresses nearby
window.gameData = {};
var isHost = window.parent.isHost;
let players = window.parent.players;

let SCGwaiting = true;

let gameOver = false;

async function initGCGame(){
    postBroadcast('GameLoaded', Date.now(), true);
    await delay();
}

function finishGCGame(winner = false){
    if(!gameOver){
        gameOver = true;
        postBroadcast('GameOver', winner, true);
    }
}

async function SetVib(state = true){
    postBroadcast('SetVib', state);
}

function vibMotPulse(times=0){
    postBroadcast('vibMotPulse', times);
}

async function SetLED(position, color, intensity){
    postBroadcast('SetLED', [position,color,intensity]);
}

async function setLEDs(color, intensity){
    postBroadcast('setLEDs', [color,intensity]);
}

function setLEDinterval(clr1, clr2, milliseconds, times){
    postBroadcast('setLEDinterval', [clr1, clr2, milliseconds, times]);
}

function sendPlayerData(data) {
    postBroadcast('SendPlayerData', data, true);
}

async function GetTap(duration) {
    taps = 0;

    postBroadcast('GetTap', duration);

    await afterXs(duration+waitB4Read);
    await afterXs(waitB4Return);            //wait milliseconds "propagation delay"

    return taps;
}

async function GetMove(){
    postBroadcast('GetMove', true);

    await afterXs(waitB4Return);     //wait milliseconds "propagation delay"
    return coords;
}

async function stopMove(){
    postBroadcast('stopMove', true);

    coords[0] = 0.0;
    coords[1] = 0.0;
    coords[2] = 0.0;
    tiltDirection = 0.0;
    tiltAngle = 0.0;
    sips = 0;
    btnPress = false;
}

async function GetTimeSinceLastDrink(){
    postBroadcast('GetTimeSinceLastDrink', true);
    await afterXs(waitB4Return);     //wait milliseconds "propagation delay"
    return timeSinceLastDrink;
}

async function GetSessionSips(){
    postBroadcast('GetSessionSips', true);
    await afterXs(waitB4Return);     //wait milliseconds "propagation delay"
    return sessionSips;
}

async function GetMAC(threshold_RSSI, duration){
    postBroadcast('GetMAC', [threshold_RSSI,duration]);

    await afterXs((duration*1000)+waitB4Read);
    await afterXs(waitB4Return);     //wait milliseconds "propagation delay"

    return scannedMACs;
}

/*can be used to let the script stall for amount of 'X' milliseconds*/
function afterXs(X) {
    return new Promise(resolve => {
        setTimeout(function() {
            resolve();
        }, X)
    })
}

function delay(){
    return new Promise((resolve, reject) =>{
        let tempInterval = setInterval(()=>{
            if(!SCGwaiting){
                clearInterval(tempInterval);
                resolve();
            }
            else{
                
            }
        }, 500);
    })
}

/**********************************************************/

let postBroadcast;

window.addEventListener("message", function(e){

    key = Object.keys(e.data)[0];
    handle_storage({key: key, newValue: e.data[key]});
}, false);

function handle_storage(e){
    
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
            if(seshID==JSON.parse(e.newValue)["seshID"]){
                sameSeshID = true;
                if (JSON.parse(e.newValue)["value"]) {
                    newValue = JSON.parse(e.newValue)["value"].toString();
                }
            }
        }
    
        if(!seshIDexist || sameSeshID){
            
            if (e.key === 'allJoined') {
                SCGwaiting = false;
            }
            else if (e.key === 'taps') {
                taps = parseInt(newValue);
            }
            else if(e.key === 'coords'){
                let tempArray = newValue.split(',');
                coords = [parseFloat(tempArray[0]),parseFloat(tempArray[1]),parseFloat(tempArray[2])];
            }
            else if (e.key === 'GetTilt') {
                let tempArray = newValue.split(',');
                tiltDirection = parseFloat(tempArray[0]);
                tiltAngle = parseFloat(tempArray[1]);
            }
            else if(e.key === 'sips'){
                sips += parseInt(newValue);
            }
            else if (e.key === 'timeSinceLastDrink') {
                timeSinceLastDrink = parseInt(newValue);
            }
            else if(e.key === 'sessionSips'){
                sessionSips = parseInt(newValue);
            }
            else if (e.key === 'buttonPress') {
                btnPress = newValue === "true";
            }
            else if (e.key === 'gameData') {
                window.gameData = { ...window.gameData, ...JSON.parse(newValue) };
            }
            else if(e.key === 'scannedMACs'){
                let tempArray = newValue.split("SPLIT");
                scannedMACs = tempArray[0].split(",");
                scannedMACsRSSI = tempArray[1].split(",");
            }
            else if(e.key === 'setHost'){
                isHost = true;
            }        
        }
    }
}

postBroadcast = (key, value = "", firstParent = false) => {
    if (firstParent) { 
        var win = window.parent;
    }
    else {
        var win = window.parent.parent;
    }
    data = {}
    data[key] = JSON.stringify({ seshID: sessionStorage.getItem('seshID'), value: value });
    win.postMessage(data, "*");
}
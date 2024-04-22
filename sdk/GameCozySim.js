let coords = [0, 0, 0];
let tiltDirection = 0;
let tiltAngle = 0;
let buttonPress = false;
let buttonPressIndicator = document.getElementById("button_press");
let vibration = false;
let vibrationIndicator = document.getElementById("vibration");
let tapIndicator = document.getElementById("tap");
let sipIndicator = document.getElementById("sip");
let sipCount = 0;
let sessionSipCount = 0;
let lastSipTime;
let timeSinceLastDrink = 0;
let sipping = false;
let gettingTaps = false;
let tapCount = 0;
let LEDs = {};
let aPressed = false;
let dPressed = false;
let wPressed = false;
let sPressed = false;

// map keyboard keys to Cozy functions
document.addEventListener('keydown', function (e) {
    // a key
    if (e.keyCode === 65) {
        e.preventDefault();
        if (!dPressed) {
            aPressed = true;
            coords[1] = -1;
            coords[2] = -1.75;
            if (wPressed) {
                tiltDirection = 135;
            }
            else if (sPressed) {
                tiltDirection = 45;
            }
            else {
                tiltDirection = 90;
            }
            tiltAngle = 33;
            document.getElementById("a").classList.add("active");                
        }
    }
    // d key
    if (e.keyCode === 68) {
        e.preventDefault();
        if (!aPressed) {
            dPressed = true;
            coords[1] = 1;
            coords[2] = -1.75;
            if (wPressed) {
                tiltDirection = 225;
            }
            else if (sPressed) {
                tiltDirection = 315;
            }
            else {
                tiltDirection = 270;
            }
            tiltAngle = 33;
            document.getElementById("d").classList.add("active");
        }
    }
    // w key
    if (e.keyCode === 87) {
        e.preventDefault();
        if (!sPressed) {
            wPressed = true;
            coords[0] = 1;
            coords[2] = -1.75;
            if (aPressed) {
                tiltDirection = 135;
            }
            else if (dPressed) {
                tiltDirection = 225;
            }
            else {
                tiltDirection = 180;
            }

            tiltAngle = 33;
            document.getElementById("w").classList.add("active");          
        }
    }
    // s key
    if (e.keyCode === 83) {
        if (!wPressed) {
            e.preventDefault();
            sPressed = true;
            coords[0] = -1;
            coords[2] = -1.75;
            if (aPressed) {
                tiltDirection = 45;
            }
            else if (dPressed) {
                tiltDirection = 315;
            }
            else {
                tiltDirection = 0;
            }
            tiltAngle = 33;
            document.getElementById("s").classList.add("active");
        }
    }
    // spacebar for button presss
    if (e.keyCode === 32) {
        e.preventDefault();
        buttonPress = true;
        buttonPressIndicator.classList.add("active");
    }

    // shift for tap
    if (e.keyCode === 16) {
        e.preventDefault();
        tapIndicator.classList.add("active");
        window.setTimeout(() => {
            tapIndicator.classList.remove("active");
            if (gettingTaps) {
                tapCount++;
            }    
        }, 300);
    }   

    // ctrl for sip
    if (e.keyCode === 17) {
        e.preventDefault();
        if (sipping) {
            return;
        }
        else {
            sipping = true;
            sipIndicator.classList.add("active");
            window.setTimeout(() => {
                sipIndicator.classList.remove("active");
                postBroadcast("sips", 1);
                sipCount++;
                sessionSipCount++;
                postBroadcast("sessionSips", sessionSipCount);
                document.getElementById("sip_data").innerText = sipCount;
                document.getElementById("session_sip_data").innerText = sipCount;  
                timeSinceLastDrink = parseInt((new Date() - lastSipTime) / 1000) || 0;
                document.getElementById("last_drink_time_data").innerText = timeSinceLastDrink;            
                lastSipTime = new Date();
                sipping = false;
            }, 2000);                
        }
    }      
});

// map keyboard keys to Cozy functions
document.addEventListener('keyup', function (e) {

    // a key
    if (e.keyCode === 65) {
        aPressed = false;
        coords[1] = 0;
        coords[2] = -2;
        if (sPressed) {
            tiltDirection = 0;
        }
        else if(wPressed) {
            tiltDirection = 180;
        }
        else {
            tiltDirection = 0;
        }
        tiltAngle = 0;
        document.getElementById("a").classList.remove("active");
    }

    // d key
    if (e.keyCode === 68) {
        dPressed = false;
        coords[1] = 0;
        coords[2] = -2;  
        if (sPressed) {
            tiltDirection = 0;
        }
        else if (wPressed) {
            tiltDirection = 180;
        }
        else {
            tiltDirection = 0;
        }
        tiltAngle = 0;
        document.getElementById("d").classList.remove("active");
    }
      
    // w key
    if (e.keyCode === 87) {
        wPressed = false;
        coords[0] = 0;
        coords[2] = -2;
        if (aPressed) {
            tiltDirection = 90;
        }
        else if (dPressed) {
            tiltDirection = 270;
        }
        else {
            tiltDirection = 0;
        }
        tiltAngle = 0;
        document.getElementById("w").classList.remove("active");        
    }

    // s key
    if (e.keyCode === 83) {
        sPressed = false;
        coords[0] = 0;
        coords[2] = -2;
        if (aPressed) {
            tiltDirection = 90;
        }
        else if (dPressed) {
            tiltDirection = 270;
        }
        else {
            tiltDirection = 0;
        }
        tiltAngle = 0;
        document.getElementById("s").classList.remove("active");        
    }
    
    // spacebar for button press
    if (e.keyCode === 32) {
        buttonPress = false;
        tiltDirection = 0;
        tiltAngle = 0;
        buttonPressIndicator.classList.remove("active");
    }    
});

// handle vibration
async function SetVib(state = false) {
    if (state === true) {
        vibration = true;
        vibrationIndicator.classList.add("active");
        vibrationIndicator.textContent = "ON";
        return vibration;
    }
    else {        
        vibration = false;
        vibrationIndicator.classList.remove("active");
        vibrationIndicator.textContent = "OFF";
        return vibration;
    }
}

/*Makes the Vibration motor pulse amount of 'times'*/
async function vibMotPulse(times=0){
    if(times>0){                                   //if pulse_status==1
        await SetVib(true);                                   //set the value of the Vib Motor
        setTimeout(async function(){ await SetVib(false);},550);     //set motor off after 500ms
        times--;
        setTimeout(async function(){ await vibMotPulse(times)},1550);                   //call vibMotPulse() again after 1s
    }
}

// handle LED
async function SetLED(position,color,intensity) {

    if(position<0){position=0;}             //adjust if position invalid
    if(position>=28){position=28;}          //adjust if position invalid
    if(color>0xffffff){color = 0xffffff}    //adjust if color invalid
    if(intensity<0){intensity=0}            //adjust if intensity invalid
    if(intensity>9){intensity=9}            //adjust if intensity invalid

    let temp = "";                         //add letter 'L' to start of string 'temp'

    if(color.toString(16).length<6){        //adjust if color invalid
        for(let i=0; i<(6-color.toString(16).length);i++){
            temp = temp.concat("0");
        }
    }

    temp = temp.concat(color.toString(16));         //add 'color' to string 'temp'
    if (temp == "000000") {
        temp = "FFF"
    }  
    LEDs[position] = `#${temp}`;
    resetLEDChart();
}

async function setLEDs(clr, intensity) {
    if (clr < 0x0) { clr = 0x0 }
    if (clr > 0xffffff) { clr = 0xffffff }    //adjust if color invalid
    if (intensity < 0) { intensity = 0 }            //adjust if intensity invalid
    if (intensity > 9) { intensity = 9 }            //adjust if intensity invalid

    let temp = "#";                         //add '#' to start of string 'temp'

    if (clr.toString(16).length < 6) {        //adjust if color invalid
        for (let i = 0; i < (6 - clr.toString(16).length); i++) {
            temp = temp.concat("0");
        }
    }

    temp = temp.concat(clr.toString(16));         //add 'color' to string 'temp'
    if (temp == "#000000") {
        temp = "#FFF"
    }    
    for (let i = 1; i < 25; i++) {
        LEDs[i] = `${temp}`;
    };
    resetLEDChart();
}

async function setLEDinterval(clr1, clr2, milliseconds, times){
    milliseconds = parseInt(milliseconds);
    times = parseInt(times);
    let i, delay = 0, intensity = 9;
    if(milliseconds<120){
        milliseconds = 120;
    }
    for(i = 0; i<times; i++){
        if(i%2==0){
            setTimeout(async function(){await setLEDs(clr1,intensity)},delay);
        }
        else{
            setTimeout(async function(){await setLEDs(clr2,intensity)},delay);
        }
        
        delay += milliseconds;

        if(i==(times-1)){
            setTimeout(async function(){await setLEDs("0x000000",0)},delay);
            setTimeout(async function(){
                await setLEDs("0x000000",0);
            },delay+30);
        }
    }
}

// handle move / button press
async function GetMove() {
    window.setTimeout(() => {
        postBroadcast("coords", coords);
        postBroadcast("GetTilt", `${tiltDirection},${tiltAngle}`); 
        document.getElementById("x_direction_data").innerText = coords[0];
        document.getElementById("y_direction_data").innerText = coords[1];
        document.getElementById("z_direction_data").innerText = coords[2];
        document.getElementById("tilt_angle_data").innerText = tiltAngle;
        document.getElementById("tilt_direction_data").innerText = tiltDirection;
        if (buttonPress) {
            postBroadcast("buttonPress", "true");
        }
        else {
            postBroadcast("buttonPress", "false");            
        }
        GetMove();
    }, 1);
};

async function GetTap(duration) {
    tapCount = 0;
    gettingTaps = true;
    window.setTimeout(() => {
        gettingTaps = false;
        postBroadcast("taps", tapCount.toString());
        document.getElementById("tap_data").innerText = tapCount;
        return tapCount;
    }, duration);
};

async function GetTimeSinceLastDrink() {
    timeSinceLastDrink = parseInt((new Date() - lastSipTime) / 1000) || 0;
    document.getElementById("last_drink_time_data").innerText = timeSinceLastDrink;
    postBroadcast("timeSinceLastDrink", timeSinceLastDrink);
    return timeSinceLastDrink;
};

async function GetSessionSips() {
    postBroadcast("sessionSips", sessionSipCount);
    return sessionSipCount;
};


function resetLEDChart() {
    conicString= "";
    lastPosition = 0;
    
    for (let i = 0; i < 24; i++) {
        color = LEDs[i + 1] || "#FFF";
        conicString += `${color} ${lastPosition}% ${lastPosition + 3.2}%,`;
        conicString += `#333 ${lastPosition + 3.2}% ${lastPosition + 4.17}%`;
        if (i < 23) {
            conicString += ",";
        }
        lastPosition += 4.17;
    }
    
    document.getElementById("led_pie").style.background = `conic-gradient(${conicString})`;
    
}

resetLEDChart();
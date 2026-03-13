const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Raquetler ve Top
const raquetteWidth = 10;
const raquetteHeight = 100;
let raquetteLeftY = (canvas.height - raquetteHeight) / 2;
let raquetteRightY = (canvas.height - raquetteHeight) / 2;

const ballRadius = 10;
let ballX = canvas.width / 2;
let ballY = canvas.height / 2;
let dx = 2;
let dy = 2;

// Kontrol etmek için değişkenler
let upPressedRight = false, downPressedRight = false,
    upPressedLeft = false, downPressedLeft = false;

document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);

function keyDownHandler(e) {
    if(e.key == "ArrowDown" && raquetteRightY < canvas.height - raquetteHeight)
        upPressedRight = true;
    else if(e.key == "ArrowUp" && raquetteRightY > 0)
        downPressedRight = true;

    if(e.key == "s" && raquetteLeftY < canvas.height - raquetteHeight)
        upPressedLeft = true;
    else if(e.key == "w" && raquetteLeftY > 0)
        downPressedLeft = true;
}

function keyUpHandler(e) {
    if(e.key == "ArrowDown")
        upPressedRight = false;
    else if(e.key == "ArrowUp")
        downPressedRight = false;

    if(e.key == "s")
        upPressedLeft = false;
    else if(e.key == "w")
        downPressedLeft = false;
}

function drawRaquette(x, y) {
    ctx.beginPath();
    ctx.rect(x, y, raquetteWidth, raquetteHeight);
    ctx.fillStyle = "#0095DD";
    ctx.fill();
    ctx.closePath();
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI*2);
    ctx.fillStyle = "#0095DD";
    ctx.fill();
    ctx.closePath();
}

function drawScore(leftScore, rightScore) {
    ctx.font = "70px Arial";
    ctx.fillStyle = "#0095DD";
    ctx.fillText(rightScore, canvas.width/2 + 30, 50);
    ctx.fillText(leftScore, canvas.width/2 - 80, 50);
}

let leftScore = 0, rightScore = 0;

function collisionDetection() {
    if (ballY + dy < ballRadius || ballY + dy > canvas.height-ballRadius) {
        dy = -dy;
    }
    if ((ballX - dx < raquetteLeftX + raquetteWidth && 
         ballY - dy > raquetteLeftY &&
         ballY - dy < raquetteLeftY + raquetteHeight) ||
       (ballX + dx > canvas.width - raquetteRightX - raquetteWidth &&
        ballY - dy > raquetteRightY &&
        ballY - dy < raquetteRightY + raquetteHeight)) {
        dx = -dx;
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if(upPressedLeft && raquetteLeftY > 0) 
        raquetteLeftY -= 7;
    else if(downPressedLeft && raquetteLeftY < canvas.height - raquetteHeight)
        raquetteLeftY += 7;

    if(upPressedRight && raquetteRightY > 0) 
        raquetteRightY -= 7;
    else if(downPressedRight && raquetteRightY < canvas.height - raquetteHeight)
        raquetteRightY += 7;

    ballX += dx;
    ballY += dy;

    collisionDetection();

    if(ballX + dx < ballRadius || ballX + dx > canvas.width-ballRadius) {
        if (ballX + dx < ballRadius)
            rightScore++;
        else
            leftScore++;

        ballX = canvas.width / 2;
        ballY = canvas.height / 2;
        dx = -dx;
        dy = -dy;
    }

    drawRaquette(raquetteLeftX, raquetteLeftY);
    drawRaquette(canvas.width - raquetteRightWidth - raquetteRightX, raquetteRightY);
    drawBall();
    drawScore(leftScore, rightScore);

    requestAnimationFrame(gameLoop);
}

let raquetteLeftX = 0;
let raquetteRightWidth = canvas.width;

gameLoop();

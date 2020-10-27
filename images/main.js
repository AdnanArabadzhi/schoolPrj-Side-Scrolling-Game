; (function game() {

    const gameStart = document.getElementById('game-start');
    const gameScoreValue = document.getElementById('score-value');
    const gameArea = document.getElementById('game-area');
    const gameOverEl = document.getElementById('game-over');
    const wizard = document.getElementById('wizard');
    const pressedKeys = new Set();


    const config = {
        speed: 2,
        wizardMovingMultiplier: 4,
        fireballMovingMultiplier: 5,
        fireInterval: 1000,
        cloudSpanInterval: 3000,
        bugSpanInterval: 1000,
        bugKillScore: 2000
    };

    const lastFireballTimeStamp = 0;


    const utils = {
        pxToNumber(val) {
            return +val.replace('px', ''); 
        },
        numberToPx(val) {
            return `${val}px`;
        },
        randomNumberBetween(min, max) {
            return Math.floor(Math.random() * max) + min;
        },
        hasCollision(el1, el2) {
            const el1Rect = el1.getBoundingClientRect();
            const el2Rect = el2.getBoundingClientRect();

            return !(
                el1Rect.top > el2Rect.bottom ||
                el1Rect.bottom < el2Rect.top ||
                el1Rect.right < el2Rect.left ||
                el1Rect.left > el2Rect.right
            );
        }
    }
    

    const scene = {
        get fireBalls() {
            return Array.from(document.querySelectorAll('.fire-ball'));
        },
        get clouds() {
            return Array.from(document.querySelectorAll('.cloud'));
        },
        get bugs() {
            return Array.from(document.querySelectorAll('.bug'));
        }
    }


    const wizardCoordinates = {
        wizard,
        set x(newX){
            if(newX < 0){
                newX = 0;
            }else if(wizardCoordinates.x + wizard.offsetWidth > gameArea.offsetWidth){
                newX = gameArea.offsetWidth - wizard.offsetWidth;
            }
            this.wizard.style.left = utils.numberToPx(newX);
        },
        get x() {
            return utils.pxToNumber(this.wizard.style.left);
        },
        set y(newY){
            if(newY < 0){
                newY = 0;
            }else if(newY + wizard.offsetHeight > gameArea.offsetHeight){
                newY = gameArea.offsetHeight - wizard.offsetHeight;
            }
            this.wizard.style.top = utils.numberToPx(newY);
        },
        get y(){
            return utils.pxToNumber(this.wizard.style.top);
        }
    }

    function createGamePlay() {
        return{
            loopId: null,
            nextRenderQueue: [],
            lastFireballTimeStamp: 0,
            lastCloundTimespan: 0,
            lastBugTimestamp: 0
        };
    }
    let gameplay;


    function init() {
        gameplay = createGamePlay();
        gameScoreValue.innerText = 0;
        wizard.style.left = utils.numberToPx(200);
        wizard.style.top = utils.numberToPx(200);
        wizard.classList.remove('hidden');

        gameLoop(0);
    }

    function gameOver() {
        window.cancelAnimationFrame(gameplay.loopId);
        gameOverEl.classList.remove('hidden');
        alert('Game Over!');
    }

    function addGameElementFactory(className) {
        return function addElement(x, y) {
        const fbe = document.createElement('div');
        fbe.classList.add(className);
        fbe.style.left = utils.numberToPx(x);
        fbe.style.top = utils.numberToPx(y);
        gameArea.appendChild(fbe);
        };
    }

    const addFireBall = addGameElementFactory('fire-ball');
    const addCloud = addGameElementFactory('cloud');
    const addBug = addGameElementFactory('bug');

    const pressedKeyActionMap = {
        ArrowUp() {
            wizardCoordinates.y -= config.speed * config.wizardMovingMultiplier;
        },
        ArrowDown() {
            wizardCoordinates.y += config.speed * config.wizardMovingMultiplier;
        },
        ArrowLeft() {
            wizardCoordinates.x -= config.speed * config.wizardMovingMultiplier;
        },
        ArrowRight() {
            wizardCoordinates.x += config.speed * config.wizardMovingMultiplier;
        },
        Space(timestamp) {
            if(wizard.classList.contains('wizard-fire') || timestamp - gameplay.lastFireballTimeStamp < config.fireInterval) {return;}
            addFireBall(wizardCoordinates.x + 80, wizardCoordinates.y);
            gameplay.lastFireballTimeStamp = timestamp;
            wizard.classList.add('wizard-fire');
            gameplay.nextRenderQueue = gameplay.nextRenderQueue.concat(function clearWizardFire(){
                if(pressedKeys.has('Space')) {return false; }
                wizard.classList.remove('wizard-fire');
                return true;
            });
        }
    };

    function processFireBalls() {
        scene.fireBalls.forEach(fbe => {
            const newX = (config.speed * config.fireballMovingMultiplier) + utils.pxToNumber(fbe.style.left);
            if(newX + fbe.offsetWidth >= gameArea.offsetWidth){
                fbe.remove();
                return;
            }
            fbe.style.left = utils.numberToPx(newX);
        });
    }

    function processNextRenderQueue() {
        gameplay.nextRenderQueue = gameplay.nextRenderQueue.reduce((acc, currFn) => {
            if(currFn()) {return acc; }
            return acc.concat(currFn);
        }, []);
    }

    function processPressedKeys(timestamp) {
        pressedKeys.forEach(pressedKey => {
            const handler = pressedKeyActionMap[pressedKey];
            if  (handler) { handler(timestamp); }
        });
    }

    // function processClouds(timestamp) {
    //     if(timestamp - gameplay.lastCloundTimespan > config.cloudSpanInterval + 2000 * Math.random()){
    //         const x = gameArea.offsetWidth + 200;
    //         const y = utils.randomNumberBetween(0, gameArea.offsetHeight - 200);
    //         addCloud(x, y);
    //         gameplay.lastCloundTimespan = timestamp;
    //     }
    //     scene.clouds.forEach(ce => {
    //         const newX = utils.pxToNumber(ce.style.left) - config.speed;
    //         if(newX + 200 < 0){ce.remove(); }
    //         ce.style.left = utils.numberToPx(newX);
    //     });
    // }

    function processGameElementFactory(
        addFn, 
        elementWidth, 
        gameplayTimestampName, 
        sceneName, 
        configName, 
        additionalElementProcessor
        ) {
        return function (timestamp) {
            if(timestamp - gameplay[gameplayTimestampName] > configName){
                const x = gameArea.offsetWidth + elementWidth;
                const y = utils.randomNumberBetween(0, gameArea.offsetHeight - elementWidth);
                addFn(x, y);
                gameplay[gameplayTimestampName] = timestamp;
            }
            scene[sceneName].forEach(ce => {
                const newX = utils.pxToNumber(ce.style.left) - config.speed;
                if(additionalElementProcessor && additionalElementProcessor(ce)) { return; }
                if(newX + 200 < 0){ ce.remove(); }
                ce.style.left = utils.numberToPx(newX);
            });
        }
    }

    const processClouds = processGameElementFactory(addCloud, 200, 'lastCloundTimespan', 'clouds', 'cloudSpanInterval');

    function bugElementProcessor(bugEl) {
        const fireball = scene.fireBalls.find(fe => utils.hasCollision(fe, bugEl));
        if(fireball) { fireball.remove(); bugEl.remove(); gameScoreValue.innerText = config.bugKillScore + +gameScoreValue.innerText; return true; }
        if (utils.hasCollision(bugEl, wizardEl)) { gameOver(); return true;}
        return false;
    }

    const processBugs = processGameElementFactory(addBug, 60, 'lastBugTimestamp', 'bugs', 1000, bugElementProcessor);


    function applyGravity() {
        const isInAir = wizardCoordinates.y !==gameArea.offsetHeight;
        if(isInAir) {wizardCoordinates.y += config.speed; }
    };


    function gameLoop(timestamp) {
        gameplay.loopId = window.requestAnimationFrame(gameLoop);
        processPressedKeys(timestamp);
        applyGravity(timestamp);
        processNextRenderQueue(timestamp);
        processFireBalls(timestamp);
        processClouds(timestamp);
        processBugs(timestamp);

        gameScoreValue.innerText++;
    };
    
    gameStart.addEventListener('click', function gameStartHandler() {
        gameStart.classList.add('hidden');
        init();
    });


    document.addEventListener('keydown', function keydownHandler(e) { pressedKeys.add(e.code); });
    document.addEventListener('keyup', function keyupHandler(e) { pressedKeys.delete(e.code); });


}());
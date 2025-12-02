// =================================================================
// 1. الإعداد الأساسي والمتغيرات (Globals)
// =================================================================
document.addEventListener('contextmenu', event => event.preventDefault()); 
document.addEventListener('dragstart', event => event.preventDefault());   
document.addEventListener('selectstart', event => event.preventDefault()); 

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

const container = document.getElementById('game-container');
container.appendChild(renderer.domElement);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// متغيرات حالة اللعبة
let gameStarted = false; 
let isPaused = false; 
let currentLevel = 1;
// تمت زيادة الحد الأقصى للمستويات إلى 9 لاستيعاب المستوى الجديد
const MAX_LEVELS = 10; 

let player, playerMixer, actions = {}, activeAction, previousAction; 
let levelObjects = []; 
let obstacles = []; 
let enemies = [];
let collectibles = [];
let particles = []; 
let gateMesh, gateActive = false, gameOver = false;
let isTransitioning = false; 
let gameTime = 180, countdownInterval; 

const score = { value: 0, target: 10 }; 
const PLAYER_START_POS = { x: 0, z: 40 };
const GATE_POS = { x: 0, z: -40 };
const SAFE_RADIUS = 15;

// عناصر الواجهة (UI elements)
const uiContainer = document.getElementById('game-ui');
const uiLevel = document.getElementById('level-display');
const uiScore = document.getElementById('score-display');
const uiTimer = document.getElementById('timer-display');
const uiStory = document.getElementById('story-text');
const uiMessage = document.getElementById('game-message');

// عناصر التحميل
const loadingScreen = document.getElementById('loading-screen');
const progressStatus = document.getElementById('progress-status'); 
const progressBar = document.getElementById('progress-bar'); 
const loadingText = document.getElementById('loading-text'); 

// مدير التحميل والمُحملات (Loaders)
const loadingManager = new THREE.LoadingManager();

loadingManager.onProgress = function(itemUrl, itemsLoaded, itemsTotal) {
    const progress = Math.round((itemsLoaded / itemsTotal) * 100);
    progressBar.style.width = `${progress}%`;
    loadingText.innerText = `Loading: ${progress}%`;
};

loadingManager.onLoad = function() {
    progressStatus.style.opacity = '0'; 
    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500); 
    }, 3000); 
};

// الصوت
const audioListener = new THREE.AudioListener();
camera.add(audioListener);
const soundLoader = new THREE.AudioLoader(loadingManager);
const gltfLoader = new THREE.GLTFLoader(loadingManager);

const collectSound = new THREE.Audio(audioListener);
const winSound = new THREE.Audio(audioListener);

soundLoader.load('collect.mp3', (b) => { collectSound.setBuffer(b); collectSound.setVolume(0.4); }, undefined, () => {});
soundLoader.load('gameover.mp3', (b) => { winSound.setBuffer(b); winSound.setVolume(0.6); }, undefined, () => {});


// =================================================================
// 2. المؤثرات البصرية (Visual Effects)
// =================================================================

function createCrystalExplosion(position, color) {
    const particleCount = 15; 
    const geometry = new THREE.TetrahedronGeometry(0.2, 0); 
    
    for (let i = 0; i < particleCount; i++) {
        const material = new THREE.MeshBasicMaterial({ 
            color: color, 
            transparent: true, 
            opacity: 1.0 
        });
        
        const particle = new THREE.Mesh(geometry, material);
        particle.position.copy(position);
        
        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 8, 
            (Math.random() - 0.5) * 8, 
            (Math.random() - 0.5) * 8  
        );
        
        particle.userData.rotSpeed = {
            x: (Math.random() - 0.5) * 10,
            y: (Math.random() - 0.5) * 10
        };

        scene.add(particle);
        particles.push(particle);
    }
}

function updateParticles(delta) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        p.position.addScaledVector(p.userData.velocity, delta);
        p.rotation.x += p.userData.rotSpeed.x * delta;
        p.rotation.y += p.userData.rotSpeed.y * delta;
        
        p.material.opacity -= 1.5 * delta; 
        
        if (p.material.opacity <= 0) {
            scene.remove(p);
            p.geometry.dispose();
            p.material.dispose();
            particles.splice(i, 1);
        }
    }
}

// =================================================================
// 3. منطق اللعبة والبداية (Game Logic)
// =================================================================

const moveSpeedPerSecond = 12.0;      
const rotateSpeedPerSecond = 2.4;     
const enemySpeedPerSecond = 4.2;      
const crystalRotationSpeedPerSecond = 3.0; 
const cameraLerpSpeed = 12.0;         

window.startGame = function() {
    const startScreen = document.getElementById('start-screen');
    startScreen.style.transition = "opacity 0.5s";
    startScreen.style.opacity = "0";
    
    if (audioListener.context.state === 'suspended') {
        audioListener.context.resume();
    }

    setTimeout(() => {
        startScreen.style.display = 'none';
        gameStarted = true;
        uiContainer.style.display = 'block'; 
        startTimer(); 
        
        if(player) {
            player.position.set(PLAYER_START_POS.x, 0, PLAYER_START_POS.z);
            player.rotation.set(0, 0, 0);
        } else {
            initPlayer(); 
        }
        
        const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
        const joyZone = document.getElementById('joystick-zone');
        const wasdUi = document.getElementById('wasd-ui');

        if (isTouchDevice) {
            joyZone.style.display = 'block';
            joyZone.style.pointerEvents = 'all'; 
            wasdUi.style.display = 'none'; 
        } else {
            wasdUi.style.display = 'flex';
            wasdUi.style.pointerEvents = 'all'; 
            joyZone.style.display = 'none'; 
        }

    }, 500);
}

window.restartGame = function() {
    currentLevel = 1;
    score.value = 0;
    gameTime = 180;
    gameOver = false;
    gateActive = false;
    isTransitioning = false;
    isPaused = false; 
    
    particles.forEach(p => { scene.remove(p); p.geometry.dispose(); p.material.dispose(); });
    particles = [];

    uiMessage.style.display = 'none';
    uiScore.innerText = `Crystals: 0 / ${score.target}`;
    uiLevel.innerText = "LEVEL 1: The Forest"; 
    uiLevel.style.color = "#00ff00";

    initLevel(); 
    startTimer();
    
    if(winSound.isPlaying) winSound.stop();
};

function initLevel() {
    gameOver = false; uiMessage.style.display = 'none'; isTransitioning = false;
    clearLevel(); 
    
    particles.forEach(p => { scene.remove(p); });
    particles = [];

    initPlayer(); 
    
    score.value = 0; gateActive = false; uiScore.innerText = `Crystals: 0 / ${score.target}`; 
    
        // --- ترتيب المستويات الجديد ---
    if(currentLevel === 1) { 
        setupForestEnvironment(); 
        uiStory.innerText = "Level 1: Collect Crystals to find the Portal!"; 
    }
    else if(currentLevel === 2) { 
        // === المستوى الجديد: مكة القديمة ===
        setupAncientMeccaEnvironment();
        uiStory.innerText = "Level 2: Ancient Mecca - The Age of Idols";
        uiStory.style.color = "#FFD700"; // لون ذهبي صحراوي
    }
    else if(currentLevel === 3) { 
        // تم إزاحة المدينة الحديثة هنا
        setupModernCityEnvironment();
        uiStory.innerText = "Level 3: Explore the Metropolis!";
        uiStory.style.color = "#00BFFF";
    }
    else if(currentLevel === 4) { 
        // كان سابقاً المستوى 2
        setupCyberpunkEnvironment();
        uiStory.innerText = "Level 4: Navigate the Mega Neon City!";
        uiStory.style.color = "#00ffff";
    }
    else if(currentLevel === 5) { 
        // كان سابقاً المستوى 3
        setupRuinedCityEnvironment(); 
        uiStory.innerText = "Level 5: Search the Ruins for ancient Crystals!"; 
        uiStory.style.color = "#aaaaaa";
    }
    else if(currentLevel === 6) { 
        // كان سابقاً المستوى 4
        setupMedievalForestEnvironment(); 
        uiStory.innerText = "Level 6: Enter the Royal Woods!"; 
        uiStory.style.color = "#FFD700";
    }
    else if(currentLevel === 7) { 
        // كان سابقاً المستوى 5
        setupCandyLandEnvironment(); 
        uiStory.innerText = "Level 7: Cross the Candy Land!"; 
        uiStory.style.color = "#ff44aa"; 
    }
    else if(currentLevel === 8) { 
        // كان سابقاً المستوى 6
        setupVolcanoEnvironment(); 
        uiStory.innerText = "Level 8: Survive the Core Heat!"; 
        uiStory.style.color = "#ff3300";
    }
    else if(currentLevel === 9) { 
        // كان سابقاً المستوى 7
        setupDesertEnvironment(); 
        uiStory.innerText = "Level 9: Collect Relics in the Desert!"; 
        uiStory.style.color = "#ffaa00"; 
    }
    else if(currentLevel === 10) { 
        // كان سابقاً المستوى 8
        setupSnowEnvironment(); 
        uiStory.innerText = "Level 10: Find Shards to Escape the Ice!"; 
        uiStory.style.color = "#00ffff";
    }

    spawnGate(); 
    spawnCrystals(); 

    if(gameStarted) {
        startTimer();
    }
}

function updateGame(delta) { 
    if(!gameStarted || gameOver || !player || isPaused) return;

    updateParticles(delta);

    let moveF = 0, turn = 0;
    if(keys['w']) moveF = 1; if(keys['s']) moveF = -1;
    if(keys['a']) turn = 1; if(keys['d']) turn = -1;
    
    if(joystick.active) {
        if(Math.abs(joystick.x) > 0.1) turn = -joystick.x;
        if(joystick.y < -0.1) moveF = 1; if(joystick.y > 0.1) moveF = -1;
    }
    
    if(turn !== 0) player.rotation.y += turn * rotateSpeedPerSecond * delta;
    
    let isMoving = false;
    const oldPos = player.position.clone();
    if(moveF !== 0) {
        const dir = new THREE.Vector3(0,0,-1).applyQuaternion(player.quaternion);
        player.position.addScaledVector(dir, moveF * moveSpeedPerSecond * delta);
        isMoving = true;
    }

    const pBox = getPlayerHitbox(); 
    obstacles.forEach(o => o.updateMatrixWorld());
    for(let obs of obstacles) {
        const obsBox = new THREE.Box3().setFromObject(obs);
        if(pBox.intersectsBox(obsBox)) player.position.copy(oldPos); 
    }

    const camOff = new THREE.Vector3(0, 6, 9).applyQuaternion(player.quaternion);
    const lerpFactor = Math.min(cameraLerpSpeed * delta, 1.0); 
    camera.position.lerp(player.position.clone().add(camOff), lerpFactor);
    camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 2, 0)));

    if(playerMixer && actions['Walk'] && actions['Idle']) {
        const target = isMoving ? actions['Walk'] : actions['Idle'];
        if(activeAction !== target) {
            previousAction = activeAction; activeAction = target;
            previousAction.fadeOut(0.2); activeAction.reset().fadeIn(0.2).play();
        }
    }

    for(let i=collectibles.length-1; i>=0; i--) {
        const c = collectibles[i];
        c.rotation.y += crystalRotationSpeedPerSecond * delta;
        c.position.y = 1.5 + Math.sin(Date.now()*0.003)*0.3; 
        if(pBox.intersectsBox(new THREE.Box3().setFromObject(c))) {
            createCrystalExplosion(c.position, c.material.color);
            scene.remove(c); collectibles.splice(i, 1);
            score.value++; uiScore.innerText = `Crystals: ${score.value} / ${score.target}`;
            if(collectSound.buffer) { collectSound.isPlaying = false; collectSound.play(); }
        }
    }

    // منطق فتح البوابة مع الترتيب الجديد
    if(collectibles.length === 0 && !gateActive && !isTransitioning) {
        gateActive = true;
        let gateColor = 0xffffff;
        
        if (currentLevel === 1) { 
            gateColor = 0xFFD700; // ذهبي لمكة
            uiStory.innerText = "GATE OPEN! To the Ancient Sands!"; 
            uiStory.style.color = "#FFD700"; 
        } 
        else if (currentLevel === 2) { 
            gateColor = 0x00BFFF; // أزرق للمدينة
            uiStory.innerText = "GATE OPEN! To the Future!"; 
            uiStory.style.color = "#00BFFF"; 
        }
        else if (currentLevel === 3) { 
            gateColor = 0x00ffff; // سماوي للنيون
            uiStory.innerText = "GATE OPEN! To the Neon City!"; 
            uiStory.style.color = "#00ffff"; 
        }
        else if (currentLevel === 4) { 
            gateColor = 0x888888; // رمادي للآثار
            uiStory.innerText = "GATE OPEN! To the Fallen City!"; 
            uiStory.style.color = "#aaaaaa"; 
        }
        else if (currentLevel === 5) { 
            gateColor = 0xFFD700; // ذهبي للغابة الملكية
            uiStory.innerText = "GATE OPEN! To the Royal Woods!"; 
            uiStory.style.color = "#FFD700"; 
        }
        else if (currentLevel === 6) { 
            gateColor = 0xff44aa; // وردي للكاندي
            uiStory.innerText = "GATE OPEN! To Candy Land!"; 
            uiStory.style.color = "#ff44aa"; 
        }
        else if (currentLevel === 7) { 
            gateColor = 0xff3300; // أحمر للبركان
            uiStory.innerText = "GATE OPEN! To the Core!"; 
            uiStory.style.color = "#ff3300"; 
        } 
        else if (currentLevel === 8) { 
            gateColor = 0xffaa00; // برتقالي للصحراء
            uiStory.innerText = "GATE OPEN! To the Desert!"; 
            uiStory.style.color = "#ffaa00"; 
        }
        else if (currentLevel === 9) { 
            gateColor = 0x00ffff; // ثلجي
            uiStory.innerText = "GATE OPEN! To the Frozen Peaks!"; 
            uiStory.style.color = "#00ffff"; 
        }
        else { 
            gateColor = 0xffffff; 
            uiStory.innerText = "FINAL GATE OPEN! ESCAPE!"; 
            uiStory.style.color = "#ffffff"; 
        }
        gateMesh.material.color.setHex(gateColor);
    }

    if(gateActive && !isTransitioning && pBox.intersectsBox(new THREE.Box3().setFromObject(gateMesh))) {
        if(currentLevel < MAX_LEVELS) {
            isTransitioning = true; currentLevel++; uiStory.innerText = `Teleporting...`;
            gateMesh.material.color.setHex(0xffffff); gateActive = false; setTimeout(initLevel, 1000); 
        } else { endGame("YOU CONQUERED THE MULTIVERSE!"); }
    }

    enemies.forEach(e => {
        const dir = new THREE.Vector3().subVectors(player.position, e.position).normalize();
        e.position.addScaledVector(dir, enemySpeedPerSecond * delta);
        e.lookAt(player.position);
        const eBox = new THREE.Box3().setFromCenterAndSize(e.position, new THREE.Vector3(1,2,1));
        if(pBox.intersectsBox(eBox)) endGame("CAUGHT BY THE GUARDIANS!");
    });
}

function startTimer() {
    clearInterval(countdownInterval); 
    gameTime = 180; 
    uiTimer.innerText = `Time: ${gameTime}`;
    countdownInterval = setInterval(() => {
        if(!gameStarted || gameOver) {
            clearInterval(countdownInterval);
        } else if (!isPaused) { 
            gameTime--; 
            uiTimer.innerText = `Time: ${gameTime}`; 
            if(gameTime <= 0) endGame("TIME'S UP!"); 
        }
    }, 1000);
}

function endGame(msg) {
    if (gameOver) return;
    gameOver = true; uiMessage.style.display = 'flex';
    uiMessage.innerHTML = `<h1>${msg}</h1><button onclick="window.restartGame()">Restart Game</button>`;
    if(msg.includes("CAUGHT") || msg.includes("TIME")) { 
        if(winSound.buffer) {
             if(winSound.isPlaying) winSound.stop();
             winSound.play(); 
        }
    }
}

// =================================================================
// 4. دوال قائمة التوقيف (Pause Menu Functions)
// =================================================================

window.pauseGame = function() {
    if (!gameStarted || gameOver) return;
    isPaused = true;
    document.getElementById('pause-menu').style.display = 'flex';
    document.getElementById('joystick-zone').style.pointerEvents = 'none';
};

window.resumeGame = function() {
    isPaused = false;
    document.getElementById('pause-menu').style.display = 'none';
    document.getElementById('joystick-zone').style.pointerEvents = 'all';
};

window.quitToMenu = function() {
    isPaused = false;
    gameStarted = false;
    gameOver = false;
    clearInterval(countdownInterval); 
    
    document.getElementById('pause-menu').style.display = 'none';
    document.getElementById('game-ui').style.display = 'none';
    document.getElementById('game-message').style.display = 'none';
    
    const joyZone = document.getElementById('joystick-zone');
    const wasdUi = document.getElementById('wasd-ui');

    joyZone.style.display = 'none';
    joyZone.style.pointerEvents = 'all'; 

    wasdUi.style.display = 'none';
    wasdUi.style.pointerEvents = 'all'; 
    
    ['w', 'a', 's', 'd'].forEach(key => {
        if(keys[key]) keys[key] = false;
        const btn = document.getElementById(`btn-${key}`);
        if(btn) btn.classList.remove('active');
    });

    const startScreen = document.getElementById('start-screen');
    startScreen.style.display = 'flex';
    setTimeout(() => { startScreen.style.opacity = "1"; }, 50);

    if(player) {
        player.position.set(PLAYER_START_POS.x, 0, PLAYER_START_POS.z);
        player.rotation.set(0, 0, 0); 
    }
};

const clock = new THREE.Clock();
function onWindowResize() {
    const w = window.innerWidth; const h = window.innerHeight;
    const isPortrait = h > w;
    const targetW = isPortrait ? h : w; const targetH = isPortrait ? w : h;
    
    container.style.width = targetW + 'px'; container.style.height = targetH + 'px';
    if (isPortrait) {
        container.style.transform = `rotate(90deg) translateY(-${targetH}px)`; container.style.transformOrigin = 'top left';
    } else {
        container.style.transform = 'none'; container.style.transformOrigin = 'center';
    }
    
    camera.aspect = targetW / targetH; camera.updateProjectionMatrix(); renderer.setSize(targetW, targetH);
}

window.addEventListener('resize', onWindowResize);
onWindowResize();

initLevel(); 

function updateShowcaseCamera() {
    if (!player) return;
    const time = Date.now() * 0.0005; 
    const radius = 6;
    const camX = player.position.x + Math.sin(time) * radius;
    const camZ = player.position.z + Math.cos(time) * radius;
    camera.position.set(camX, 2.5, camZ);
    camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta(); 
    if(playerMixer) playerMixer.update(delta);
    
    if(gameStarted && !gameOver && !isPaused) updateGame(delta); 
    else if (!gameStarted) {
        updateShowcaseCamera();
    }
    
    renderer.render(scene, camera);
}
animate();
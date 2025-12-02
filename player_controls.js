// يعتمد هذا الملف على المتغيرات العامة scene, player, gltfLoader, playerMixer, actions, keys, joystick 
// التي تم تعريفها في game_core.js

// =================================================================
// 2. التحكم (WASD + Joystick)
// =================================================================
const keys = {};
const joystick = { x: 0, y: 0, active: false };

document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    updateVisualKeys(e.key.toLowerCase(), true); 
});
document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    updateVisualKeys(e.key.toLowerCase(), false);
});

function setupVirtualKey(id, keyName) {
    const btn = document.getElementById(id);
    if(!btn) return;
    const startAction = (e) => { e.preventDefault(); keys[keyName] = true; btn.classList.add('active'); };
    const endAction = (e) => { e.preventDefault(); keys[keyName] = false; btn.classList.remove('active'); };
    btn.addEventListener('mousedown', startAction);
    btn.addEventListener('touchstart', startAction, {passive: false});
    btn.addEventListener('mouseup', endAction);
    btn.addEventListener('mouseleave', endAction);
    btn.addEventListener('touchend', endAction);
}

setupVirtualKey('btn-w', 'w'); setupVirtualKey('btn-a', 'a');
setupVirtualKey('btn-s', 's'); setupVirtualKey('btn-d', 'd');

function updateVisualKeys(key, isActive) {
    const map = { 'w': 'btn-w', 'a': 'btn-a', 's': 'btn-s', 'd': 'btn-d' };
    if(map[key]) {
        const el = document.getElementById(map[key]);
        if(el) isActive ? el.classList.add('active') : el.classList.remove('active');
    }
}

const joyZone = document.getElementById('joystick-zone');
const joyKnob = document.getElementById('joystick-knob');
let joyStart = { x: 0, y: 0 };

if(joyZone) {
    joyZone.addEventListener('touchstart', (e) => {
        if(!gameStarted) return; 
        e.preventDefault();
        const touch = e.changedTouches[0];
        joyStart.x = touch.clientX; joyStart.y = touch.clientY;
        joystick.active = true; joyKnob.style.transition = 'none';
    }, { passive: false });

    joyZone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if(!joystick.active) return;
        const touch = e.changedTouches[0];
        const isPortrait = window.innerHeight > window.innerWidth;
        let rawDx = touch.clientX - joyStart.x;
        let rawDy = touch.clientY - joyStart.y;
        let dx, dy;
        // تعديل الإحداثيات عند الوضع الرأسي 
        if (isPortrait) { dx = rawDy; dy = -rawDx; } else { dx = rawDx; dy = rawDy; }
        const dist = Math.sqrt(dx*dx + dy*dy);
        const maxDist = 50;
        if(dist > maxDist) { const ratio = maxDist / dist; dx *= ratio; dy *= ratio; }
        joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        joystick.x = dx / maxDist; joystick.y = dy / maxDist; 
    }, { passive: false });

    const resetJoy = () => {
        joystick.active = false; joystick.x = 0; joystick.y = 0;
        joyKnob.style.transition = '0.2s';
        joyKnob.style.transform = `translate(-50%, -50%)`;
    };
    joyZone.addEventListener('touchend', resetJoy);
    joyZone.addEventListener('touchcancel', resetJoy);
}

// =================================================================
// 4. اللاعب (Player)
// =================================================================

function initPlayer() {
    if(player) { 
        scene.add(player); player.position.set(PLAYER_START_POS.x, 0, PLAYER_START_POS.z); player.rotation.set(0, 0, 0); return; 
    }
    player = new THREE.Group();
    gltfLoader.load('player_character.glb', (gltf) => {
        const model = gltf.scene; model.scale.set(3, 3, 3); model.rotation.y = Math.PI;
        model.traverse(n => { if(n.isMesh) { n.castShadow = true; n.receiveShadow = true; }});
        player.add(model);
        if(gltf.animations.length > 0) {
            playerMixer = new THREE.AnimationMixer(model);
            const idle = gltf.animations.find(a=>a.name.toLowerCase().includes('idle')) || gltf.animations[0];
            const walk = gltf.animations.find(a=>a.name.toLowerCase().includes('walk')) || gltf.animations[1];
            if(idle) { actions['Idle'] = playerMixer.clipAction(idle); actions['Idle'].play(); activeAction = actions['Idle']; }
            if(walk) { actions['Walk'] = playerMixer.clipAction(walk); actions['Walk'].timeScale = 3.0; }
        }
    }, undefined, () => {
        const cube = new THREE.Mesh(new THREE.BoxGeometry(1,3,1), new THREE.MeshStandardMaterial({color:0xff0000}));
        cube.position.y = 1.5; player.add(cube);
    });
    scene.add(player); player.position.set(PLAYER_START_POS.x, 0, PLAYER_START_POS.z);
}

function getPlayerHitbox() {
    if(!player) return new THREE.Box3();
    const c = player.position.clone(); c.y += 1.5;
    return new THREE.Box3().setFromCenterAndSize(c, new THREE.Vector3(1.2, 3, 1.2));
}
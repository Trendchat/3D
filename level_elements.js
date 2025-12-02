// =================================================================
// أدوات توليد الخامات (Procedural Textures)
// =================================================================

function createAsphaltTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // لون الأسفلت الأساسي
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 512, 512);
    
    // إضافة "ضجيج" (Noise) لتبدو خشنة
    for(let i=0; i<40000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#222222' : '#111111';
        ctx.fillRect(Math.random()*512, Math.random()*512, 2, 2);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(40, 40); // تكرار الخامة على مساحة كبيرة
    return texture;
}

function createWindowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // خلفية المبنى (خرسانة/زجاج غامق)
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, 64, 64);
    
    // رسم النوافذ
    ctx.fillStyle = '#223355'; // لون زجاجي مزرق
    if(Math.random() > 0.5) ctx.fillStyle = '#112233'; // تنويع
    
    // رسم مستطيلين كنوافذ
    ctx.fillRect(4, 4, 26, 56);
    ctx.fillRect(34, 4, 26, 56);
    
    // إضافة بعض النوافذ المضاءة عشوائياً
    if(Math.random() > 0.7) {
        ctx.fillStyle = '#ffffee'; // ضوء أصفر
        ctx.fillRect(4, 20, 26, 10);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    // التكرار سيتم ضبطه لاحقاً حسب حجم المبنى
    return texture;
}
// =================================================================
// 3. البيئات وبناء المستويات (Environment & Spawning)
// =================================================================
// في ملف level_elements.js داخل دالة clearLevel()

function clearLevel() {
    levelObjects.forEach(obj => scene.remove(obj)); levelObjects = [];
    obstacles.forEach(obs => scene.remove(obs)); obstacles = [];
    collectibles.forEach(c => scene.remove(c)); collectibles = [];
    enemies.forEach(e => scene.remove(e)); enemies = [];
    
    // --- الإضافة الجديدة ---
    // حذف أي جسيمات متطايرة متبقية
    if (typeof particles !== 'undefined') {
        particles.forEach(p => { scene.remove(p); p.geometry.dispose(); p.material.dispose(); });
        particles = [];
    }
    // ---------------------

    if(gateMesh) { scene.remove(gateMesh); gateMesh = null; }
    scene.children.filter(c => c.isLight).forEach(l => scene.remove(l));
}

function isPositionSafe(x, z) {
    const distPlayer = Math.sqrt((x - PLAYER_START_POS.x)**2 + (z - PLAYER_START_POS.z)**2);
    const distGate = Math.sqrt((x - GATE_POS.x)**2 + (z - GATE_POS.z)**2);
    return (distPlayer > SAFE_RADIUS && distGate > SAFE_RADIUS);
}

function isFarFromObstacles(x, z, minDistance) {
    for (let obs of obstacles) {
        const dx = x - obs.position.x; const dz = z - obs.position.z;
        if (Math.sqrt(dx*dx + dz*dz) < minDistance) return false; 
    }
    return true; 
}

// -------------------------------------------------------------
// Level 1: Forest Environment
// -------------------------------------------------------------
function setupForestEnvironment() {
    scene.background = new THREE.Color(0x111122); 
    scene.fog = new THREE.Fog(0x111122, 10, 60); 
    const ambi = new THREE.AmbientLight(0xaaaaaa, 1.2); scene.add(ambi);
    const moonLight = new THREE.DirectionalLight(0xaaccff, 0.8);
    moonLight.position.set(40, 60, 40); moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 2048; moonLight.shadow.mapSize.height = 2048;
    moonLight.shadow.camera.left = -100; moonLight.shadow.camera.right = 100;
    moonLight.shadow.camera.top = 100; moonLight.shadow.camera.bottom = -100;
    scene.add(moonLight);
    
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x225522 }));
    ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground); levelObjects.push(ground);
    uiLevel.innerText = "LEVEL 1: The Forest"; uiLevel.style.color = "#00ff00";

    for(let i=0; i<7; i++) {
        const x = Math.random()*150-75; const z = Math.random()*150-75;
        if(!isPositionSafe(x, z) || !isFarFromObstacles(x, z, 20)) continue; 
        createMountain(x, z);
    }
    for(let i=0; i<60; i++) { 
        const x = Math.random()*200-100; const z = Math.random()*200-100;
        if(!isPositionSafe(x, z) || !isFarFromObstacles(x, z, 5)) continue; 
        createTree(x, z);
    }
    for(let i=0; i<20; i++) {
        const x = Math.random()*200-100; const z = Math.random()*200-100;
        if(!isPositionSafe(x, z) || !isFarFromObstacles(x, z, 3)) continue;
        createRock(x, z);
    }
    for(let i=0; i<30; i++) {
        const x = Math.random()*200-100; const z = Math.random()*200-100;
        if(!isPositionSafe(x, z)) continue;
        createMushroom(x, z);
    }
    for(let i=0; i<10; i++) {
        const x = Math.random()*200-100; const z = Math.random()*200-100;
        if(!isPositionSafe(x, z) || !isFarFromObstacles(x, z, 6)) continue;
        createLog(x, z);
    }

    spawnEnemies(5);
}

// =================================================================
//Level 2: Ancient Mecca 
// =================================================================
function setupAncientMeccaEnvironment() {
    // 1. الجو والإضاءة (نهار مشمس ساطع وحار)
    scene.background = new THREE.Color(0x87CEEB); // سماء زرقاء صافية
    scene.fog = new THREE.Fog(0x87CEEB, 40, 300); // ضباب بعيد ليوحي بالاتساع

    // إضاءة الشمس القوية
    const sunLight = new THREE.DirectionalLight(0xffffee, 1.3);
    sunLight.position.set(100, 200, 100);
    sunLight.castShadow = true;
    // توسيع نطاق الظل للعالم الكبير
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.left = -300; sunLight.shadow.camera.right = 300;
    sunLight.shadow.camera.top = 300; sunLight.shadow.camera.bottom = -300;
    scene.add(sunLight);

    const ambi = new THREE.AmbientLight(0xccaa88, 0.6); // ضوء محيطي رملي
    scene.add(ambi);

    // 2. الأرضية (صحراء واسعة ومتموجة)
    const groundSize = 1200;
    const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize, 64, 64);
    
// تمويج الأرض قليلاً لتبدو كثبان رملية
const posAttribute = groundGeo.attributes.position;
// **التعديل بناءً على طلب المستخدم:**
// 1. تم إزالة تمويج الكثبان تماماً (القيمة الثابتة بدلاً من المعادلة).
// 2. تم رفع الأرضية قليلاً (إلى 0.2) لإخفاء الخط الدائري تحت اللاعب.
const floorHeight = 0.2; // الارتفاع الجديد، يمكن زيادته إذا لزم الأمر
        
for (let i = 0; i < posAttribute.count; i++) {
    // تعيين ارتفاع ثابت لـ Z (الذي يصبح Y بعد تدوير الأرضية)
    posAttribute.setZ(i, floorHeight);
}
groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({ 
        color: 0xE6C288, // لون الرمال
        roughness: 1.0 
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    levelObjects.push(ground);

    uiLevel.innerText = "LEVEL 2: Ancient Mecca";
    uiLevel.style.color = "#DAA520";

    // 3. المعالم الرئيسية
    
    // بناء الكعبة (مكعب أسود في المنتصف)
    createKaaba(0, 0);

    // الأصنام حول الكعبة (تمثيل تجريدي)
    for(let i=0; i<8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const dist = 12;
        createAncientIdol(Math.cos(angle) * dist, Math.sin(angle) * dist);
    }

    // 4. العناصر المحيطة (بيوت الطين والنخيل والجبال)
    
    // بيوت طينية (توزيع عشوائي بعيد عن المركز)
    for(let i=0; i<120; i++) {
        const x = Math.random() * 600 - 300;
        const z = Math.random() * 600 - 300;
        
        // لا تبني في ساحة الكعبة أو فوق البوابة/اللاعب
        if (Math.sqrt(x*x + z*z) < 40) continue; 
        if(!isPositionSafe(x, z) || !isFarFromObstacles(x, z, 10)) continue;

        createClayHouse(x, z);
    }

    // نخيل (توزيع كثيف)
    for(let i=0; i<80; i++) {
        const x = Math.random() * 600 - 300;
        const z = Math.random() * 600 - 300;
        if (Math.sqrt(x*x + z*z) < 30) continue;
        createPalmTree(x, z);
    }

    // صخور وجبال بعيدة
    for(let i=0; i<40; i++) {
        const x = Math.random() * 800 - 400;
        const z = Math.random() * 800 - 400;
        if (Math.sqrt(x*x + z*z) < 60) continue;
        createDesertRock(x, z);
    }

    // آبار مياه قديمة
    for(let i=0; i<10; i++) {
        const x = Math.random() * 400 - 200;
        const z = Math.random() * 400 - 200;
        if (Math.sqrt(x*x + z*z) < 50) continue;
        createAncientWell(x, z);
    }

    spawnEnemies(10); // حراس القبائل
}

// =================================================================
// المستوى 2 المحسن: مدينة واقعية (Realistic Metropolis)
// =================================================================
function setupModernCityEnvironment() {
    // 1. الجو والإضاءة
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 30, 200);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(150, 250, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.left = -400; sunLight.shadow.camera.right = 400;
    sunLight.shadow.camera.top = 400; sunLight.shadow.camera.bottom = -400;
    scene.add(sunLight);

    // 2. الأرضية (أسفلت واقعي)
    const groundSize = 1200;
    const asphaltMat = new THREE.MeshStandardMaterial({ 
        map: createAsphaltTexture(),
        roughness: 0.9 
    });
    
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize), asphaltMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    levelObjects.push(ground);

    uiLevel.innerText = "LEVEL 2: Realistic City";
    uiLevel.style.color = "#00BFFF";

    // 3. تخطيط المدينة (شوارع وأرصفة)
    // سنقوم بإنشاء "طرق" عن طريق وضع الأرصفة والمباني
    
    

    // 4. العناصر (مباني مفصلة، شجر ضخم، أعمدة إنارة)
    
    // ناطحات السحاب (زيادة الكثافة والضخامة)
    for (let i = 0; i < 180; i++) {
        const x = Math.random() * 800 - 400;
        const z = Math.random() * 800 - 400;
        // نترك مساحات للشوارع (إذا كان x قريباً من مضاعفات 40 نبتعد قليلاً)
        if (Math.abs(x % 40) < 8) continue; 
        
        if (!isPositionSafe(x, z) || !isFarFromObstacles(x, z, 20)) continue;
        createDetailedSkyscraper(x, z);
    }

    // أشجار عملاقة تظلل الشوارع
    for (let i = 0; i < 80; i++) {
        const x = Math.random() * 800 - 400;
        const z = Math.random() * 800 - 400;
        if (!isPositionSafe(x, z) || !isFarFromObstacles(x, z, 10)) continue;
        createRealisticTree(x, z);
    }

    // أعمدة إنارة (لإعطاء تفاصيل بشرية)
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * 800 - 400;
        const z = Math.random() * 800 - 400;
        if (!isPositionSafe(x, z) || !isFarFromObstacles(x, z, 5)) continue;
        createStreetLampPost(x, z);
    }
    
    spawnEnemies(15);
}
// -------------------------------------------------------------
// Level 4 (NEW): Cyberpunk Neon City (Mega Version)
// -------------------------------------------------------------
function setupCyberpunkEnvironment() {
    // 1. الإضاءة والجو (تم رفع السطوع وتقليل الضباب)
    scene.background = new THREE.Color(0x0a0a20); // لون خلفية أزرق ليلي بدلاً من الأسود الدامس
    // تقليل كثافة الضباب لرؤية مسافة أبعد (من 0.015 إلى 0.004)
    scene.fog = new THREE.FogExp2(0x0a0a20, 0.004); 

    // إضاءة محيطية قوية (سماء زرقاء وأرضية بنفسجية)
    const hemiLight = new THREE.HemisphereLight(0x4444ff, 0xff00ff, 1.2); 
    scene.add(hemiLight);

    // ضوء رئيسي (قمر صناعي أو ضوء المدينة) لزيادة الوضوح والظلال
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(50, 100, 50);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 4096;
    mainLight.shadow.mapSize.height = 4096;
    // توسيع نطاق الظل ليشمل العالم الكبير
    mainLight.shadow.camera.left = -300;
    mainLight.shadow.camera.right = 300;
    mainLight.shadow.camera.top = 300;
    mainLight.shadow.camera.bottom = -300;
    scene.add(mainLight);

    // أضواء النيون الموضعية (أكثر سطوعاً)
    const blueLight = new THREE.PointLight(0x00ffff, 3, 200);
    blueLight.position.set(50, 40, 50);
    scene.add(blueLight);

    const pinkLight = new THREE.PointLight(0xff00ff, 3, 200);
    pinkLight.position.set(-50, 40, -50);
    scene.add(pinkLight);

    // 2. توسيع الأرضية (من 400 إلى 1200)
    const groundSize = 800;
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(groundSize, groundSize), 
        new THREE.MeshStandardMaterial({ 
            color: 0x1a1a1a, // أرضية أفتح قليلاً
            roughness: 0.2, 
            metalness: 0.6 
        })
    );
    ground.rotation.x = -Math.PI/2; 
    ground.receiveShadow = true; 
    scene.add(ground); 
    levelObjects.push(ground);

    // شبكة عملاقة
    const gridHelper = new THREE.GridHelper(groundSize, 150, 0x00ffff, 0x330033);
    gridHelper.position.y = 0.2;
    scene.add(gridHelper);
    levelObjects.push(gridHelper);

    uiLevel.innerText = "LEVEL 2: Mega Neon City"; 
    uiLevel.style.color = "#00ffff";
    uiLevel.style.textShadow = "0 0 15px #00ffff";

    // 3. زيادة عدد العناصر وتوسيع نطاق التوزيع
    
    // المباني (زدنا العدد من 40 إلى 120 والنطاق من 90 إلى 400)
    for(let i=0; i<90; i++) {
        // نطاق واسع جداً (-400 إلى 400)
        const x = Math.random()*600-300; 
        const z = Math.random()*600-300;
        
        // مسافة أمان أكبر قليلاً حول اللاعب
        if(!isPositionSafe(x, z) || !isFarFromObstacles(x, z, 15)) continue; 
        createNeonBuilding(x, z);
    }

    // أعمدة البيانات (زدنا العدد من 30 إلى 80)
    for(let i=0; i<80; i++) {
        const x = Math.random()*800-400; 
        const z = Math.random()*800-400;
        if(!isPositionSafe(x, z) || !isFarFromObstacles(x, z, 8)) continue; 
        createDataPillar(x, z);
    }

    // إضافة طرق سريعة عائمة (Floating Highways) كعنصر جمالي جديد للعالم الكبير
    for(let i=0; i<10; i++) {
         createFloatingHighway();
    }

    spawnEnemies(12); // زيادة عدد الأعداء لتغطية المساحة
}

// -------------------------------------------------------------
// Level 5: Ruined City Environment
// -------------------------------------------------------------
function setupRuinedCityEnvironment() {
    const skyColor = 0xd0c0b0; 
    scene.background = new THREE.Color(skyColor); 
    scene.fog = new THREE.Fog(skyColor, 15, 70); 
    
    const ambi = new THREE.AmbientLight(0xffffff, 0.7); scene.add(ambi);
    const sunLight = new THREE.DirectionalLight(0xffeebb, 1.0); 
    sunLight.position.set(-60, 100, -30); sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096; sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.bias = -0.0005; scene.add(sunLight);
    
    const groundColor = 0x5a5040;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: groundColor, roughness: 1.0 }));
    ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground); levelObjects.push(ground);

    uiLevel.innerText = "LEVEL 3: The Fallen City"; uiLevel.style.color = "#dcb"; 

    for(let i=0; i<400; i++) {
        const x = Math.random()*160-80; const z = Math.random()*160-80;
        createCobbleStone(x, z);
    }
    for(let i=0; i<25; i++) {
        const x = Math.random()*180-90; const z = Math.random()*180-90;
        if(!isPositionSafe(x, z) || !isFarFromObstacles(x, z, 14)) continue; 
        createDetailedRuin(x, z); 
    }
    for(let i=0; i<12; i++) { 
        const x = Math.random()*180-90; const z = Math.random()*180-90;
        if(!isPositionSafe(x, z) || !isFarFromObstacles(x, z, 5)) continue; 
        createMedievalCart(x, z);
    }
    for(let i=0; i<30; i++) {
        const x = Math.random()*180-90; const z = Math.random()*180-90;
        if(!isPositionSafe(x, z) || !isFarFromObstacles(x, z, 3)) continue;
        createDebrisPile(x, z);
    }
    for(let i=0; i<15; i++) {
        const x = Math.random()*180-90; const z = Math.random()*180-90;
        if(!isPositionSafe(x, z) || !isFarFromObstacles(x, z, 2)) continue;
        createStreetLamp(x, z);
    }
    for(let i=0; i<20; i++) {
        const x = Math.random()*180-90; const z = Math.random()*180-90;
        if(!isPositionSafe(x, z) || !isFarFromObstacles(x, z, 4)) continue;
        createBarricade(x, z);
    }
    spawnEnemies(8);
}

// -------------------------------------------------------------
// Level 6: Medieval Forest Environment
// -------------------------------------------------------------
function setupMedievalForestEnvironment() {
    scene.background = new THREE.Color(0x87CEEB); 
    scene.fog = new THREE.Fog(0x87CEEB, 20, 100); 
    const ambi = new THREE.AmbientLight(0xffffff, 0.7); scene.add(ambi);
    const sunLight = new THREE.DirectionalLight(0xffdfba, 1.3);
    sunLight.position.set(50, 100, 50); sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048; sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);
    
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x4C9A2A }));
    ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground); levelObjects.push(ground);

    uiLevel.innerText = "LEVEL 4: The Royal Woods"; 
    uiLevel.style.color = "#FFD700"; 

    for(let i=0; i<8; i++) {
        const x = Math.random()*180-90; const z = Math.random()*180-90;
        if(!isPositionSafe(x, z) || !isFarFromObstacles(x, z, 15)) continue; 
        createEuropeanCastle(x, z);
    }
    for(let i=0; i<100; i++) { 
        const x = Math.random()*200-100; const z = Math.random()*200-100;
        if(!isPositionSafe(x, z) || !isFarFromObstacles(x, z, 4)) continue; 
        createTallPineTree(x, z);
    }
    for(let i=0; i<30; i++) {
        const x = Math.random()*200-100; const z = Math.random()*200-100;
        if(!isPositionSafe(x, z) || !isFarFromObstacles(x, z, 3)) continue;
        createRock(x, z);
    }
    spawnEnemies(6);
}

// -------------------------------------------------------------
// Level 7: Candy Land Environment
// -------------------------------------------------------------
function setupCandyLandEnvironment() {
    scene.background = new THREE.Color(0xfde0e0); 
    scene.fog = new THREE.Fog(0xfde0e0, 20, 90); 
    const ambi = new THREE.AmbientLight(0xffffff, 1.5); scene.add(ambi);
    const sunLight = new THREE.DirectionalLight(0xffaaee, 1.2);
    sunLight.position.set(-50, 80, 50); sunLight.castShadow = true;
    scene.add(sunLight);
    
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff }); 
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), groundMat);
    ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground); levelObjects.push(ground);

    for (let i = -20; i <= 20; i += 2) {
        const line = new THREE.Mesh(
            new THREE.BoxGeometry(400, 0.1, 1),
            new THREE.MeshBasicMaterial({ color: 0xffaacc }) 
        );
        line.position.z = i * 10; line.position.y = 0.01; line.rotation.x = -Math.PI / 2;
        scene.add(line); levelObjects.push(line);
    }
    uiLevel.innerText = "LEVEL 5: Candy Land"; uiLevel.style.color = "#ff44aa";

    for(let i=0; i<40; i++) {
        const x = Math.random()*200-100; const z = Math.random()*200-100;
        if(!isPositionSafe(x, z) || !isFarFromObstacles(x, z, 7)) continue; 
        createLollipop(x, z);
    }
    for(let i=0; i<50; i++) {
        const x = Math.random()*200-100; const z = Math.random()*200-100;
        if(!isPositionSafe(x, z) || !isFarFromObstacles(x, z, 4)) continue;
        createCandyCane(x, z);
    }
    for(let i=0; i<70; i++) {
        const x = Math.random()*200-100; const z = Math.random()*200-100;
        if(!isPositionSafe(x, z) || !isFarFromObstacles(x, z, 3)) continue;
        createGumdrop(x, z);
    }
    spawnEnemies(7);
}

// -------------------------------------------------------------
// Level 8: Volcano Environment
// -------------------------------------------------------------
function setupVolcanoEnvironment() {
    scene.background = new THREE.Color(0x220000); 
    scene.fog = new THREE.Fog(0x220000, 15, 80); 
    const ambi = new THREE.AmbientLight(0xff4444, 0.6); scene.add(ambi);
    const fireLight = new THREE.DirectionalLight(0xffaa00, 1.2);
    fireLight.position.set(0, 50, 0); fireLight.castShadow = true;
    scene.add(fireLight);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
    ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground); levelObjects.push(ground);
    uiLevel.innerText = "LEVEL 6: The Core"; uiLevel.style.color = "#ff3300"; 
    for(let i=0; i<90; i++) {
        const x = Math.random()*200-100; const z = Math.random()*200-100;
        if(!isPositionSafe(x, z)) continue; createVolcanicRock(x, z);
    }
    spawnEnemies(7);
}

// -------------------------------------------------------------
// Level 9: Desert Environment
// -------------------------------------------------------------
function setupDesertEnvironment() {
    scene.background = new THREE.Color(0xffdcb4); 
    scene.fog = new THREE.Fog(0xffdcb4, 25, 100); 
    const ambi = new THREE.AmbientLight(0xffffff, 0.8); scene.add(ambi);
    const sunLight = new THREE.DirectionalLight(0xffaa00, 1);
    sunLight.position.set(-40, 80, -40); sunLight.castShadow = true;
    scene.add(sunLight);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0xeeddaa }));
    ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground); levelObjects.push(ground);
    uiLevel.innerText = "LEVEL 7: The Desert"; uiLevel.style.color = "#ffaa00"; 
    for(let i=0; i<100; i++) {
        const x = Math.random()*200-100; const z = Math.random()*200-100;
        if(!isPositionSafe(x, z)) continue;
        if(Math.random()>0.7) createPyramid(x, z, 3 + Math.random()*3); else createCactus(x, z);
    }
    spawnEnemies(5); 
}

// -------------------------------------------------------------
// Level 10: Snow Environment
// -------------------------------------------------------------
function setupSnowEnvironment() {
    scene.background = new THREE.Color(0xcceeff); 
    scene.fog = new THREE.Fog(0xcceeff, 20, 90);
    const ambi = new THREE.AmbientLight(0xffffff, 0.9); scene.add(ambi);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 70, -50); dirLight.castShadow = true;
    scene.add(dirLight);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground); levelObjects.push(ground);
    uiLevel.innerText = "LEVEL 8: The Frozen Peaks"; uiLevel.style.color = "#00ffff"; 
    for(let i=0; i<120; i++) {
        const x = Math.random()*200-100; const z = Math.random()*200-100;
        if(!isPositionSafe(x, z)) continue; createIceSpike(x, z);
    }
    spawnEnemies(6);
}

// -------------------------------------------------------------
// دوال إنشاء العناصر (Creation Functions)
// -------------------------------------------------------------

function createMountain(x, z) {
    const size = 6 + Math.random() * 8; 
    const height = 8 + Math.random() * 10;
    const geo = new THREE.ConeGeometry(size, height, 8);
    const mat = new THREE.MeshStandardMaterial({color: 0x664422, flatShading: true});
    const mountain = new THREE.Mesh(geo, mat);
    mountain.position.set(x, height / 2, z);
    mountain.castShadow = true; mountain.receiveShadow = true;
    scene.add(mountain); levelObjects.push(mountain);
    const collider = new THREE.Mesh(new THREE.BoxGeometry(size * 1.5, height, size * 1.5), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, height / 2, z); 
    scene.add(collider); obstacles.push(collider);
}

function createRock(x, z) {
    const size = 1 + Math.random() * 1.5;
    const geo = new THREE.DodecahedronGeometry(size, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x555555, flatShading: true });
    const rock = new THREE.Mesh(geo, mat);
    rock.position.set(x, size/2, z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true; rock.receiveShadow = true;
    scene.add(rock); levelObjects.push(rock);
    
    const collider = new THREE.Mesh(new THREE.BoxGeometry(size*1.5, size*2, size*1.5), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, size/2, z);
    scene.add(collider); obstacles.push(collider);
}

function createMushroom(x, z) {
    const group = new THREE.Group();
    const stemGeo = new THREE.CylinderGeometry(0.2, 0.3, 1, 6);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0xffffee });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.5; stem.castShadow = true;

    const capGeo = new THREE.ConeGeometry(0.8, 0.6, 8);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 1.3; cap.castShadow = true;

    group.add(stem); group.add(cap);
    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * Math.PI;
    group.rotation.z = (Math.random() - 0.5) * 0.2; 
    
    scene.add(group); levelObjects.push(group);
}

function createLog(x, z) {
    const length = 4 + Math.random() * 2;
    const radius = 0.5 + Math.random() * 0.3;
    const geo = new THREE.CylinderGeometry(radius, radius, length, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x4a3c31 });
    const log = new THREE.Mesh(geo, mat);
    
    log.rotation.z = Math.PI / 2;
    log.rotation.y = Math.random() * Math.PI;
    log.position.set(x, radius/2, z);
    log.castShadow = true; log.receiveShadow = true;
    
    scene.add(log); levelObjects.push(log);
    
    const collider = new THREE.Mesh(new THREE.BoxGeometry(length, radius*2, radius*2), new THREE.MeshBasicMaterial({visible:false}));
    collider.rotation.y = log.rotation.y;
    collider.position.set(x, radius, z);
    scene.add(collider); obstacles.push(collider);
}


//Modern city
// -------------------------------------------------------------

function createDetailedSkyscraper(x, z) {
    const group = new THREE.Group();
    
    // الأبعاد
    const width = 10 + Math.random() * 10; // مباني أعرض
    const depth = 10 + Math.random() * 10;
    const height = 40 + Math.random() * 60; // مباني أطول بكثير
    
    // 1. القاعدة (Lobby) - خرسانية
    const baseHeight = 4;
    const baseGeo = new THREE.BoxGeometry(width + 1, baseHeight, depth + 1);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 1 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = baseHeight / 2;
    base.castShadow = true; base.receiveShadow = true;
    group.add(base);

    // 2. البرج الرئيسي - زجاجي مع خامة النوافذ
    const towerGeo = new THREE.BoxGeometry(width, height, depth);
    const winTex = createWindowTexture();
    
    // ضبط تكرار النوافذ حسب حجم المبنى
    winTex.repeat.set(width / 4, height / 8); 
    
    const towerMat = new THREE.MeshStandardMaterial({ 
        map: winTex, 
        roughness: 0.2, 
        metalness: 0.6,
        color: 0xccccff // لون خفيف للزجاج
    });
    
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.y = (height / 2) + baseHeight;
    tower.castShadow = true;
    group.add(tower);

    // 3. السطح (تفاصيل تقنية)
    const roofGeo = new THREE.BoxGeometry(width * 0.8, 2, depth * 0.8);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = height + baseHeight + 1;
    group.add(roof);

    // هوائيات
    if(Math.random() > 0.5) {
        const antGeo = new THREE.CylinderGeometry(0.2, 0.5, 8);
        const ant = new THREE.Mesh(antGeo, new THREE.MeshStandardMaterial({color: 0x888888}));
        ant.position.y = height + baseHeight + 4;
        group.add(ant);
    }

    group.position.set(x, 0, z);
    scene.add(group);
    levelObjects.push(group);

    // التصادم (Collider)
    const collider = new THREE.Mesh(new THREE.BoxGeometry(width, height + 10, depth), new THREE.MeshBasicMaterial({visible: false}));
    collider.position.set(x, height/2, z);
    scene.add(collider);
    obstacles.push(collider);
}

function createRealisticTree(x, z) {
    const group = new THREE.Group();
    
    // جذع ضخم
    const trunkHeight = 4 + Math.random() * 2;
    const trunkGeo = new THREE.CylinderGeometry(0.6, 0.9, trunkHeight, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3c31, roughness: 1 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    group.add(trunk);

    // أوراق شجر كثيفة (كرات متعددة)
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x1a5a1a, roughness: 0.8 });
    
    // الكرة الرئيسية
    const mainLeaves = new THREE.Mesh(new THREE.DodecahedronGeometry(3.5), leavesMat);
    mainLeaves.position.y = trunkHeight + 1.5;
    mainLeaves.castShadow = true;
    group.add(mainLeaves);
    
    // كرات فرعية لإعطاء حجم وشكل غير منتظم
    for(let i=0; i<4; i++) {
        const sub = new THREE.Mesh(new THREE.DodecahedronGeometry(2), leavesMat);
        sub.position.set(
            (Math.random()-0.5) * 3, 
            trunkHeight + 1 + Math.random()*2, 
            (Math.random()-0.5) * 3
        );
        sub.castShadow = true;
        group.add(sub);
    }

    group.position.set(x, 0, z);
    // تدوير عشوائي للشجرة بالكامل
    group.rotation.y = Math.random() * Math.PI;
    
    scene.add(group);
    levelObjects.push(group);

    const collider = new THREE.Mesh(new THREE.BoxGeometry(2, 10, 2), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, 5, z);
    scene.add(collider);
    obstacles.push(collider);
}

function createStreetLampPost(x, z) {
    const group = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7 });
    
    // العمود
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 8), metalMat);
    pole.position.y = 4;
    pole.castShadow = true;
    group.add(pole);
    
    // الذراع
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2, 0.15, 0.15), metalMat);
    arm.position.set(0.5, 7.5, 0);
    group.add(arm);
    
    // اللمبة
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.3), new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffaa, emissiveIntensity: 0.5 }));
    bulb.position.set(1.4, 7.35, 0);
    group.add(bulb);

    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    scene.add(group);
    levelObjects.push(group);

    // كوليدر صغير للعمود
    const collider = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8, 0.5), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, 4, z);
    scene.add(collider);
    obstacles.push(collider);
}

// Neon City Assets
function createNeonBuilding(x, z) {
    const height = 10 + Math.random() * 20;
    const width = 4 + Math.random() * 4;
    
    const geo = new THREE.BoxGeometry(width, height, width);
    const mat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.5 });
    const building = new THREE.Mesh(geo, mat);
    building.position.set(x, height/2, z);
    building.castShadow = true; building.receiveShadow = true;
    
    const stripGeo = new THREE.BoxGeometry(width + 0.1, 0.5, width + 0.1);
    const stripColor = Math.random() > 0.5 ? 0x00ffff : 0xff00ff; 
    const stripMat = new THREE.MeshBasicMaterial({ color: stripColor });
    const stripsCount = Math.floor(height / 4);
    for(let i=1; i<=stripsCount; i++) {
        const strip = new THREE.Mesh(stripGeo, stripMat);
        strip.position.y = i * 4 - (height/2); 
        building.add(strip);
    }
    scene.add(building); levelObjects.push(building);
    const collider = new THREE.Mesh(new THREE.BoxGeometry(width, height, width), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, height/2, z); scene.add(collider); obstacles.push(collider);
}

function createDataPillar(x, z) {
    const height = 4 + Math.random() * 6;
    const geo = new THREE.CylinderGeometry(0.5, 0.5, height, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x004400, wireframe: true }); 
    const pillar = new THREE.Mesh(geo, mat);
    pillar.position.set(x, height/2, z);
    scene.add(pillar); levelObjects.push(pillar);
    const collider = new THREE.Mesh(new THREE.BoxGeometry(1, height, 1), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, height/2, z); scene.add(collider); obstacles.push(collider);
}

function createFloatingHighway() {
    const width = 200 + Math.random() * 400;
    const geo = new THREE.BoxGeometry(width, 1, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const road = new THREE.Mesh(geo, mat);
    
    road.position.set((Math.random()-0.5)*600, 30 + Math.random()*40, (Math.random()-0.5)*600);
    road.rotation.y = Math.random() * Math.PI;
    
    const lineGeo = new THREE.BoxGeometry(width, 1.2, 0.5);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xff0055 }); 
    const line = new THREE.Mesh(lineGeo, lineMat);
    road.add(line);

    scene.add(road); levelObjects.push(road);
}

function createLollipop(x, z) {
    const group = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 5, 8), new THREE.MeshStandardMaterial({color: 0xffffff}));
    stick.position.y = 2.5; stick.castShadow = true;

    const candySize = 1.5;
    const candy = new THREE.Mesh(new THREE.SphereGeometry(candySize, 16, 16), new THREE.MeshPhongMaterial({color: 0xff44aa, specular: 0xffffff, shininess: 80}));
    candy.position.y = 5.0 + candySize/2; candy.castShadow = true;
    
    const cap = new THREE.Mesh(new THREE.SphereGeometry(candySize * 1.1, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 }));
    cap.position.y = candy.position.y;
    
    group.add(stick); group.add(candy); group.add(cap);
    group.position.set(x, 0, z); group.rotation.y = Math.random() * Math.PI;
    scene.add(group); levelObjects.push(group);

    const collider = new THREE.Mesh(new THREE.BoxGeometry(candySize*2, 6.5, candySize*2), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, 3.25, z); scene.add(collider); obstacles.push(collider);
}

function createCandyCane(x, z) {
    const height = 4 + Math.random() * 2;
    const geo = new THREE.CylinderGeometry(0.3, 0.3, height, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xee5555 }); // أحمر ساطع
    const cane = new THREE.Mesh(geo, mat);
    cane.position.set(x, height/2, z);
    cane.rotation.y = Math.random() * Math.PI;
    cane.castShadow = true; cane.receiveShadow = true;
    scene.add(cane); levelObjects.push(cane);

    const collider = new THREE.Mesh(new THREE.BoxGeometry(0.5, height+0.5, 0.5), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, height/2, z); scene.add(collider); obstacles.push(collider);
}

function createGumdrop(x, z) {
    const size = 1.0 + Math.random() * 0.5;
    const geo = new THREE.DodecahedronGeometry(size, 0); 
    const color = new THREE.Color(Math.random(), Math.random(), Math.random()).getHex();
    const mat = new THREE.MeshPhongMaterial({ color: color, specular: 0x999999, shininess: 100, transparent: true, opacity: 0.9 });
    const drop = new THREE.Mesh(geo, mat); 
    drop.position.set(x, size/2, z); drop.rotation.set(Math.random(), Math.random(), Math.random());
    drop.castShadow = true; scene.add(drop); levelObjects.push(drop);

    const collider = new THREE.Mesh(new THREE.BoxGeometry(size*1.5, size*1.5, size*1.5), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, size/2, z); scene.add(collider); obstacles.push(collider);
}

function createTree(x, z) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 2), new THREE.MeshStandardMaterial({color:0x332211}));
    trunk.position.y = 1; trunk.castShadow = true;
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(2, 4, 8), new THREE.MeshStandardMaterial({color:0x114411}));
    leaves.position.y = 3; leaves.castShadow = true;
    group.add(trunk); group.add(leaves); group.position.set(x, 0, z); scene.add(group); levelObjects.push(group);
    const collider = new THREE.Mesh(new THREE.BoxGeometry(1.5, 10, 1.5), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, 5, z); scene.add(collider); obstacles.push(collider);
}
function createVolcanicRock(x, z) {
    const size = 1.5 + Math.random() * 2;
    const geo = new THREE.DodecahedronGeometry(size, 0); 
    const mat = new THREE.MeshStandardMaterial({ color: 0x331111, roughness: 0.8, emissive: 0x220000 });
    const rock = new THREE.Mesh(geo, mat); 
    rock.position.set(x, size/2, z); rock.rotation.set(Math.random(), Math.random(), Math.random()); rock.castShadow = true;
    scene.add(rock); levelObjects.push(rock);
    const collider = new THREE.Mesh(new THREE.BoxGeometry(size*1.8, size*2, size*1.8), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, size, z); scene.add(collider); obstacles.push(collider);
}
function createPyramid(x, z, s) {
    const pyra = new THREE.Mesh(new THREE.ConeGeometry(s*2, s*1.5, 4), new THREE.MeshStandardMaterial({color: 0xddcc99, flatShading: true}));
    pyra.position.set(x, s*0.75, z); pyra.castShadow = true; scene.add(pyra); levelObjects.push(pyra);
    const collider = new THREE.Mesh(new THREE.BoxGeometry(s*2.2, s*3, s*2.2), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, s, z); scene.add(collider); obstacles.push(collider);
}
function createCactus(x, z) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({color: 0x228822});
    const main = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3, 8), mat);
    main.position.y = 1.5; main.castShadow = true; main.receiveShadow = true;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.5, 8), mat);
    arm.position.set(0.3, 2.5, 0); arm.rotation.z = Math.PI * 0.4; arm.castShadow = true;
    group.add(main); group.add(arm); group.position.set(x, 0, z); scene.add(group); levelObjects.push(group);
    const collider = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 1), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, 1.5, z); scene.add(collider); obstacles.push(collider);
}
function createIceSpike(x, z) {
    const height = 4 + Math.random() * 4;
    const geo = new THREE.ConeGeometry(1, height, 6);
    const mat = new THREE.MeshStandardMaterial({color: 0xaaddff, transparent: true, opacity: 0.9, roughness: 0.2});
    const spike = new THREE.Mesh(geo, mat); spike.position.set(x, height/2, z); spike.castShadow = true;
    scene.add(spike); levelObjects.push(spike);
    const collider = new THREE.Mesh(new THREE.BoxGeometry(2, height, 2), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, height/2, z); scene.add(collider); obstacles.push(collider);
}

function createEuropeanCastle(x, z) {
    const castleGroup = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x333388 }); // Blue roof

    // Keep
    const keepGeo = new THREE.BoxGeometry(6, 8, 6);
    const keep = new THREE.Mesh(keepGeo, stoneMat);
    keep.position.y = 4; 
    keep.castShadow = true; keep.receiveShadow = true;
    castleGroup.add(keep);

    // Towers
    const towerPositions = [
        {tx: -3, tz: -3}, {tx: 3, tz: -3},
        {tx: -3, tz: 3},  {tx: 3, tz: 3}
    ];

    towerPositions.forEach(pos => {
        const towerGeo = new THREE.CylinderGeometry(1.5, 1.5, 10, 10);
        const tower = new THREE.Mesh(towerGeo, stoneMat);
        tower.position.set(pos.tx, 5, pos.tz);
        tower.castShadow = true;
        castleGroup.add(tower);

        const roofGeo = new THREE.ConeGeometry(2, 3, 10);
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(pos.tx, 11.5, pos.tz);
        roof.castShadow = true;
        castleGroup.add(roof);
    });

    const gateGeo = new THREE.BoxGeometry(2, 4, 1);
    const gate = new THREE.Mesh(gateGeo, new THREE.MeshStandardMaterial({color: 0x4a3c31}));
    gate.position.set(0, 2, 3.1);
    castleGroup.add(gate);

    castleGroup.position.set(x, 0, z);
    castleGroup.rotation.y = Math.random() * Math.PI * 2; 

    scene.add(castleGroup); levelObjects.push(castleGroup);

    const collider = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({visible: false}));
    collider.position.set(x, 5, z);
    collider.rotation.y = castleGroup.rotation.y;
    scene.add(collider); obstacles.push(collider);
}

function createTallPineTree(x, z) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 3), new THREE.MeshStandardMaterial({color:0x3d2817}));
    trunk.position.y = 1.5; trunk.castShadow = true;
    
    const leavesMat = new THREE.MeshStandardMaterial({color:0x1a4a1a});
    const botLayer = new THREE.Mesh(new THREE.ConeGeometry(3, 4, 8), leavesMat);
    botLayer.position.y = 3.5; botLayer.castShadow = true;
    const midLayer = new THREE.Mesh(new THREE.ConeGeometry(2.5, 3.5, 8), leavesMat);
    midLayer.position.y = 5.5; midLayer.castShadow = true;
    const topLayer = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3, 8), leavesMat);
    topLayer.position.y = 7.5; topLayer.castShadow = true;

    group.add(trunk); group.add(botLayer); group.add(midLayer); group.add(topLayer);
    group.position.set(x, 0, z);
    const scale = 0.8 + Math.random() * 0.4;
    group.scale.set(scale, scale, scale);

    scene.add(group); levelObjects.push(group);

    const collider = new THREE.Mesh(new THREE.BoxGeometry(1.5, 10, 1.5), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, 5, z); scene.add(collider); obstacles.push(collider);
}

function createDetailedRuin(x, z) {
    const group = new THREE.Group();
    const stoneColor = 0x666666; 
    const woodColor = 0x4a3c31;

    const stoneMat = new THREE.MeshStandardMaterial({ color: stoneColor, flatShading: true });
    const woodMat = new THREE.MeshStandardMaterial({ color: woodColor });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0x000000 }); 

    const width = 6 + Math.random() * 3;
    const depth = 6 + Math.random() * 3;
    const floors = 1 + Math.floor(Math.random() * 2);
    const floorHeight = 3.5;

    let currentY = 0;

    for(let f=0; f<floors; f++) {
        const floorGeo = new THREE.BoxGeometry(width, floorHeight, depth);
        const floorMesh = new THREE.Mesh(floorGeo, stoneMat);
        floorMesh.position.y = currentY + floorHeight/2;
        floorMesh.castShadow = true; floorMesh.receiveShadow = true;
        group.add(floorMesh);

        const winSize = 1.0;
        for(let wx = -width/3; wx <= width/3; wx += width/3 * 2) {
            const win = new THREE.Mesh(new THREE.BoxGeometry(winSize, winSize*1.5, 0.2), windowMat);
            win.position.set(wx, currentY + floorHeight/2, depth/2 + 0.05); 
            group.add(win);
            const winBack = win.clone();
            winBack.position.set(wx, currentY + floorHeight/2, -depth/2 - 0.05);
            group.add(winBack);
        }

        if (f < floors - 1) {
            const beam = new THREE.Mesh(new THREE.BoxGeometry(width + 0.5, 0.4, depth + 0.5), woodMat);
            beam.position.y = currentY + floorHeight;
            group.add(beam);
        }

        currentY += floorHeight;
    }

    const roofBase = new THREE.Mesh(new THREE.BoxGeometry(width*0.8, 1, depth*0.8), stoneMat);
    roofBase.position.y = currentY + 0.5;
    group.add(roofBase);

    for(let i=0; i<3; i++) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 0.3), woodMat);
        plank.position.set((Math.random()-0.5)*width, currentY, (Math.random()-0.5)*depth);
        plank.rotation.z = (Math.random()-0.5);
        plank.rotation.x = (Math.random()-0.5);
        group.add(plank);
    }

    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * Math.PI; 
    scene.add(group); levelObjects.push(group);

    const collider = new THREE.Mesh(new THREE.BoxGeometry(width, currentY+2, depth), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, (currentY+2)/2, z);
    collider.rotation.y = group.rotation.y;
    scene.add(collider); obstacles.push(collider);
}

function createCobbleStone(x, z) {
    const size = 0.5 + Math.random() * 0.8;
    const geo = new THREE.BoxGeometry(size, 0.1, size); 
    const shade = Math.random() > 0.5 ? 0x6b6050 : 0x4a4030;
    const mat = new THREE.MeshStandardMaterial({ color: shade });
    const stone = new THREE.Mesh(geo, mat);
    stone.position.set(x, 0.05, z); 
    stone.rotation.y = Math.random() * Math.PI;
    scene.add(stone); 
    levelObjects.push(stone);
}

function createMedievalCart(x, z) {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 3), woodMat);
    body.position.y = 0.8; body.castShadow = true;
    group.add(body);

    const railGeo = new THREE.BoxGeometry(0.1, 1, 3);
    const railLeft = new THREE.Mesh(railGeo, woodMat); railLeft.position.set(0.95, 1.3, 0); group.add(railLeft);
    const railRight = new THREE.Mesh(railGeo, woodMat); railRight.position.set(-0.95, 1.3, 0); group.add(railRight);

    const wheelGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.2, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const w1 = new THREE.Mesh(wheelGeo, wheelMat); w1.position.set(1.1, 0.6, 0.8);
    const w2 = new THREE.Mesh(wheelGeo, wheelMat); w2.position.set(-1.1, 0.6, 0.8);
    const w3 = new THREE.Mesh(wheelGeo, wheelMat); w3.position.set(1.1, 0.6, -0.8);
    const w4 = new THREE.Mesh(wheelGeo, wheelMat); w4.position.set(-1.1, 0.6, -0.8);
    group.add(w1); group.add(w2); group.add(w3); group.add(w4);

    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * Math.PI;
    scene.add(group); levelObjects.push(group);

    const collider = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2, 3.5), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, 1, z); collider.rotation.y = group.rotation.y;
    scene.add(collider); obstacles.push(collider);
}

function createDebrisPile(x, z) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    
    const count = 5 + Math.random() * 5;
    for(let i=0; i<count; i++) {
        const size = 0.4 + Math.random() * 0.4;
        const debris = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mat);
        debris.position.set((Math.random()-0.5)*1.5, size/2 + Math.random()*0.5, (Math.random()-0.5)*1.5);
        debris.rotation.set(Math.random(), Math.random(), Math.random());
        debris.castShadow = true;
        group.add(debris);
    }
    
    group.position.set(x, 0, z);
    scene.add(group); levelObjects.push(group);
    
    const collider = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, 0.5, z);
    scene.add(collider); obstacles.push(collider);
}

function createStreetLamp(x, z) {
    const group = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.4 });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0xffffaa, transparent: true, opacity: 0.6 });

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 4), metalMat);
    post.position.y = 2; post.castShadow = true;
    group.add(post);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.6), metalMat);
    head.position.y = 4.2; 
    group.add(head);
    
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.4), glassMat);
    glass.position.y = 4.2;
    group.add(glass);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.1), metalMat);
    arm.position.y = 3.5;
    group.add(arm);

    group.position.set(x, 0, z);
    scene.add(group); levelObjects.push(group);

    const collider = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 0.5), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, 2, z);
    scene.add(collider); obstacles.push(collider);
}

function createBarricade(x, z) {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });

    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.5, 0.2), woodMat);
    p1.rotation.z = Math.PI / 4; p1.position.y = 1;
    group.add(p1);

    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.5, 0.2), woodMat);
    p2.rotation.z = -Math.PI / 4; p2.position.y = 1;
    group.add(p2);
    
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 0.2), woodMat);
    bar.position.y = 1;
    group.add(bar);

    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * Math.PI;
    scene.add(group); levelObjects.push(group);

    const collider = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.5), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, 1, z);
    collider.rotation.y = group.rotation.y;
    scene.add(collider); obstacles.push(collider);
}


// Ancient Mecca 
// -------------------------------------------------------------

function createKaaba(x, z) {
    // الكعبة: مكعب أسود بسيط
    const size = 6;
    const height = 7;
    const geo = new THREE.BoxGeometry(size, height, size);
    const mat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
    const kaaba = new THREE.Mesh(geo, mat);
    kaaba.position.set(x, height/2, z);
    kaaba.castShadow = true;
    kaaba.receiveShadow = true;
    scene.add(kaaba);
    levelObjects.push(kaaba);

    // شريط ذهبي (تجريدي)
    const bandGeo = new THREE.BoxGeometry(size + 0.1, 0.5, size + 0.1);
    const bandMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.set(x, height * 0.7, z);
    scene.add(band);
    levelObjects.push(band);

    const collider = new THREE.Mesh(new THREE.BoxGeometry(size, height, size), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, height/2, z);
    scene.add(collider); obstacles.push(collider);
}

function createClayHouse(x, z) {
    const group = new THREE.Group();
    const width = 6 + Math.random() * 4;
    const depth = 6 + Math.random() * 4;
    const height = 4 + Math.random() * 2;

    // الجدران (لون طيني باهت)
    const wallsGeo = new THREE.BoxGeometry(width, height, depth);
    const clayMat = new THREE.MeshStandardMaterial({ color: 0xdcb48c, roughness: 1.0 }); // Tan color
    const walls = new THREE.Mesh(wallsGeo, clayMat);
    walls.position.y = height / 2;
    walls.castShadow = true; walls.receiveShadow = true;
    group.add(walls);

    // عروق خشبية بارزة (الطراز القديم)
    for(let i=0; i<3; i++) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(width + 0.6, 0.3, 0.3), new THREE.MeshStandardMaterial({color: 0x5c4033}));
        beam.position.y = height * (0.3 + i * 0.25);
        beam.castShadow = true;
        group.add(beam);
    }

    // مدخل
    const doorGeo = new THREE.BoxGeometry(1.5, 2.5, 0.2);
    const door = new THREE.Mesh(doorGeo, new THREE.MeshStandardMaterial({color: 0x221100}));
    door.position.set(0, 1.25, depth/2 + 0.05);
    group.add(door);

    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    scene.add(group); levelObjects.push(group);

    const collider = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, height/2, z);
    collider.rotation.y = group.rotation.y;
    scene.add(collider); obstacles.push(collider);
}

function createPalmTree(x, z) {
    const group = new THREE.Group();
    
    // الجذع (مائل قليلاً)
    const trunkHeight = 5 + Math.random() * 3;
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, trunkHeight, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 1 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkHeight / 2;
    
    // محاولة ثني الجذع بتدويره قليلاً
    trunk.rotation.x = (Math.random() - 0.5) * 0.2;
    trunk.rotation.z = (Math.random() - 0.5) * 0.2;
    trunk.castShadow = true;
    group.add(trunk);

    // الأوراق (سعف النخيل)
    const leafGeo = new THREE.PlaneGeometry(3, 0.8);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x228B22, side: THREE.DoubleSide });

    for(let i=0; i<12; i++) {
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.y = trunkHeight * 0.95;
        
        // تدوير السعف حول المركز
        leaf.rotation.y = (i / 12) * Math.PI * 2;
        // انحناء السعف للأسفل
        leaf.rotation.x = -Math.PI / 4;
        
        // إزاحة للأمام لتبدو خارجة من الجذع
        leaf.translateZ(1.2); 
        
        group.add(leaf);
    }

    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * Math.PI;
    scene.add(group); levelObjects.push(group);

    const collider = new THREE.Mesh(new THREE.BoxGeometry(1, trunkHeight, 1), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, trunkHeight/2, z);
    scene.add(collider); obstacles.push(collider);
}

function createAncientIdol(x, z) {
    // صنم حجري بسيط
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x777777 });
    
    const base = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 1), stoneMat);
    base.position.y = 0.25;
    group.add(base);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2, 0.6), stoneMat);
    body.position.y = 1.5;
    group.add(body);

    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4), stoneMat);
    head.position.y = 2.8;
    group.add(head);

    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    group.castShadow = true;
    scene.add(group); levelObjects.push(group);

    const collider = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 1), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, 1.5, z);
    scene.add(collider); obstacles.push(collider);
}

function createDesertRock(x, z) {
    const size = 2 + Math.random() * 4;
    const geo = new THREE.DodecahedronGeometry(size, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, flatShading: true });
    const rock = new THREE.Mesh(geo, mat);
    rock.position.set(x, size/2 - 1, z); // مدفون جزئياً في الرمل
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true; rock.receiveShadow = true;
    scene.add(rock); levelObjects.push(rock);
    
    const collider = new THREE.Mesh(new THREE.BoxGeometry(size*1.5, size, size*1.5), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, size/2, z);
    scene.add(collider); obstacles.push(collider);
}

function createAncientWell(x, z) {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    
    // حلقة البئر
    const wellGeo = new THREE.CylinderGeometry(1.5, 1.5, 1, 12, 1, true);
    const wellWall = new THREE.Mesh(wellGeo, stoneMat);
    wellWall.position.y = 0.5;
    // نحتاج لجعلها سميكة بصرياً (أو نستخدم TubeGeometry)، للتبسيط سنستخدم Cylinder
    wellWall.material.side = THREE.DoubleSide;
    group.add(wellWall);
    
    // ماء في الداخل
    const water = new THREE.Mesh(new THREE.CircleGeometry(1.4, 16), new THREE.MeshBasicMaterial({color: 0x000055}));
    water.rotation.x = -Math.PI/2;
    water.position.y = 0.2;
    group.add(water);

    // أعمدة خشبية
    const postGeo = new THREE.BoxGeometry(0.2, 2.5, 0.2);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
    const p1 = new THREE.Mesh(postGeo, woodMat); p1.position.set(1.2, 1.25, 0);
    const p2 = new THREE.Mesh(postGeo, woodMat); p2.position.set(-1.2, 1.25, 0);
    group.add(p1); group.add(p2);
    
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 1), woodMat);
    roof.position.y = 2.5;
    group.add(roof);

    group.position.set(x, 0, z);
    scene.add(group); levelObjects.push(group);

    const collider = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 3), new THREE.MeshBasicMaterial({visible:false}));
    collider.position.set(x, 1, z);
    scene.add(collider); obstacles.push(collider);
}

// -------------------------------------------------------------
// دوال التوزيع (Spawning)
// -------------------------------------------------------------

function spawnGate() {
    const geo = new THREE.TorusGeometry(3, 0.5, 16, 100);
    const mat = new THREE.MeshStandardMaterial({color:0x333333}); 
    const frame = new THREE.Mesh(geo, mat); frame.position.set(GATE_POS.x, 3, GATE_POS.z); scene.add(frame); levelObjects.push(frame);
    const gateGeo = new THREE.CircleGeometry(2.8, 32);
    const gateMat = new THREE.MeshBasicMaterial({color:0x000000, side: THREE.DoubleSide, transparent:true, opacity:0.8});
    gateMesh = new THREE.Mesh(gateGeo, gateMat); gateMesh.position.set(GATE_POS.x, 3, GATE_POS.z); scene.add(gateMesh); gateActive = false;
}

function spawnCrystals() {
    for(let i=0; i<score.target; i++) {
        const geo = new THREE.OctahedronGeometry(0.5);
        const mat = new THREE.MeshStandardMaterial({color:0x00ffff, emissive:0x00ffff});
        const mesh = new THREE.Mesh(geo, mat);
        let cx, cz; let attempts = 0;
        
        // تعديل نطاق الانتشار للمستوى 2 الكبير
        let spreadRange = 160; 
        if (currentLevel === 2) spreadRange = 600; 

        do { 
            cx = Math.random() * spreadRange - (spreadRange/2); 
            cz = Math.random() * spreadRange - (spreadRange/2); 
            attempts++;
        } while((!isPositionSafe(cx, cz) || !isFarFromObstacles(cx, cz, 10)) && attempts < 100);
        
        mesh.position.set(cx, 1.5, cz); scene.add(mesh); collectibles.push(mesh);
    }
}

function spawnEnemies(count) {
    for(let i=0; i<count; i++) {
        const geo = new THREE.ConeGeometry(0.8, 2, 8);
        const mat = new THREE.MeshStandardMaterial({color:0x880000, transparent:true, opacity:0.8});
        const enemy = new THREE.Mesh(geo, mat);
        let ex, ez; let attempts = 0;
        
        // تعديل نطاق الأعداء أيضاً للمستوى 2
        let spreadRange = 160;
        if (currentLevel === 2) spreadRange = 400;

        do { 
            ex = Math.random() * spreadRange - (spreadRange/2); 
            ez = Math.random() * spreadRange - (spreadRange/2); 
            attempts++;
        } while((!isPositionSafe(ex, ez) || !isFarFromObstacles(ex, ez, 3)) && attempts < 100);
        
        enemy.position.set(ex, 2, ez); scene.add(enemy); enemies.push(enemy);
    }
}
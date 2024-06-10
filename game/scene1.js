export async function startScene() {

    const dropSound = new Audio('drop.mp3');
    const slurpSound = new Audio('slurp.mp3');
    const breakSound = new Audio('break.mp3');


    let currentAnimationFrame;

    const canvas = document.getElementById('game');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.shadowMap.enabled = true; // Enable shadow maps in the renderer
    document.body.appendChild(renderer.domElement);

    // Create a gradient background
    const gradientCanvas = document.createElement('canvas');
    const gradientContext = gradientCanvas.getContext('2d');
    gradientCanvas.width = 2;
    gradientCanvas.height = window.innerHeight;

    const gradient = gradientContext.createLinearGradient(0, 0, 0, gradientCanvas.height);
    gradient.addColorStop(0, '#7368ff');
    gradient.addColorStop(1, '#6893ff');

    gradientContext.fillStyle = gradient;
    gradientContext.fillRect(0, 0, gradientCanvas.width, gradientCanvas.height);

    const backgroundTexture = new THREE.CanvasTexture(gradientCanvas);
    const backgroundMaterial = new THREE.MeshBasicMaterial({ map: backgroundTexture });
    const backgroundGeometry = new THREE.PlaneGeometry(2, 2, 1, 1);
    const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);

    const backgroundScene = new THREE.Scene();
    const backgroundCamera = new THREE.Camera();
    backgroundMesh.material.depthTest = false;
    backgroundMesh.material.depthWrite = false;
    backgroundScene.add(backgroundMesh);

    const scene = new THREE.Scene();

    const aspectRatio = 3 / 4;
    const camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
    camera.position.set(0, 2.8, 1.6);
    camera.rotation.set(-0.79, 0, 0); // Tilt the camera downward at 45 degrees
    camera.fov = 75;
    camera.updateProjectionMatrix();

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 2); // Soft white light
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true; // Enable shadows from the directional light
    directionalLight.shadow.mapSize.width = 1024; // Increase shadow map resolution
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    scene.add(directionalLight);

    // Add point light
    const pointLight = new THREE.PointLight(0x0000ff, 0.5, 50);
    pointLight.position.set(2, 3, 4);
    scene.add(pointLight);

    // Create a ground plane
    const planeGeometry = new THREE.PlaneGeometry(10, 100);
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xd2b48c });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0;
    plane.receiveShadow = true; // Allow the plane to receive shadows
    scene.add(plane);

    // Load the custom player model
    const loader = new THREE.GLTFLoader();
    let player, mixer;

    loader.load('snake4.glb', (gltf) => {
        player = gltf.scene;
        player.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true; // Allow all meshes in the model to cast shadows
            }
        });
        player.position.set(0, 0, 0);
        player.scale.set(0.5, 0.5, 0.5); // Adjust scale as necessary
        scene.add(player);

        // Create an AnimationMixer, and get the list of animations from the loaded model
        mixer = new THREE.AnimationMixer(player);
        const action = mixer.clipAction(gltf.animations[0]); // Assuming the first animation is the default running animation
        action.play();
    }, undefined, (error) => {
        console.error('An error happened', error);
    });

    // Obstacle variables
    const obstacles = [];
    const obstacleGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const movingObstacleMaterial = new THREE.MeshStandardMaterial({ color: 0xff00ff });
    const yellowObstacleMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
    const collectibles = [];
    let obstacleSpeed = 0.1;
    let spawnInterval = 670 * 1.25; // Adjusted spawn interval to 80% as frequent

    let collectiblesCount = 0;

    // Add the can image to the top right corner
    const canImage = document.createElement('img');
    canImage.src = 'can_0.png';
    canImage.style.position = 'absolute';
    canImage.style.width = '100px';
    canImage.style.height = 'auto'; // Maintain aspect ratio

    // Define the CSS animation for pulsing
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes pulse {
            0% { transform: scale(1.4); }
            50% { transform: scale(1.6); }
            100% { transform: scale(1.4); }
        }
        .pulsing {
            animation: pulse 1s infinite;
        }
    `;
    document.head.appendChild(style);

    // Apply the pulsing animation to the can image
    canImage.classList.add('pulsing');

    document.body.appendChild(canImage);

    function positionCanImage() {
        const rect = canvas.getBoundingClientRect();
        canImage.style.top = `${rect.top + 10}px`;
        canImage.style.left = `${rect.left + rect.width - canImage.width - 10}px`;
    }

    // Position the can image initially
    positionCanImage();

    // Adjust the position on window resize
    window.addEventListener('resize', positionCanImage);

    // Flags for special modes
    let sippingAisle = false;
    let invincibilityMode = false;

    // Timers for vibration and LED effects
    let ledVibTimeout;

    function clearLedVibTimeout() {
        if (ledVibTimeout) {
            clearTimeout(ledVibTimeout);
            setLEDs(0x000000, 0); // Turn off LEDs
            SetVib(false); // Turn off vibration
        }
    }

    function cleanup() {
        cancelAnimationFrame(currentAnimationFrame);
        clearLedVibTimeout();
        setLEDs(0x000000, 0); // Turn off LEDs
        SetVib(false); // Turn off vibration
        mcleanAudio.pause(); // Stop the music
        mcleanAudio.currentTime = 0; // Reset the music to the beginning
    }
    
    

    function generateObstacle() {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        const chance = Math.min(elapsedSeconds * 0.01, 0.5); // Cap the chance to 50%

        let movingMaterial = movingObstacleMaterial;
        if (invincibilityMode) {
            movingMaterial = yellowObstacleMaterial;
        }

        if (sippingAisle) {
            const leftObstacle = createObstacle();
            const rightObstacle = createObstacle();

            leftObstacle.position.set(-1.7, 0.25, -20); // Adjust position for narrower aisle
            rightObstacle.position.set(1.7, 0.25, -20); // Adjust position for narrower aisle

            scene.add(leftObstacle);
            obstacles.push(leftObstacle);

            scene.add(rightObstacle);
            obstacles.push(rightObstacle);
        } else {
            const obstacle = (Math.random() < chance) ? createMovingObstacle(movingMaterial) : createObstacle();
            if (Math.random() < 0.45 && !obstacle.isMoving) {
                createCollectible(obstacle);
            }
            scene.add(obstacle);
            obstacles.push(obstacle);
        }
    }

    function createObstacle() {
        const obstacle = new THREE.Group(); // Create a group to hold the cactus model
        obstacle.position.set((Math.random() - 0.5) * 10 / 3, 0.25, -20); // Adjust position to spawn further back
        obstacle.isMoving = false;
        obstacle.isDestroyed = false;
        obstacle.isDestructable = invincibilityMode; // Set destructible based on invincibility mode

        loader.load('cactus.glb', (gltf) => {
            const cactusModel = gltf.scene;
            cactusModel.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true; // Allow the cactus model to cast shadows
                    if (invincibilityMode) {
                        node.material = yellowObstacleMaterial; // Apply yellow material if invincibility mode is active
                    }
                }
            });
            cactusModel.scale.set(1, 1, 1); // Set cactus model scale to 1
            obstacle.add(cactusModel); // Add the cactus model to the obstacle group
        });

        return obstacle;
    }

    function createMovingObstacle(material) {
        const obstacle = new THREE.Group(); // Create a group to hold the robot model
        obstacle.position.set((Math.random() - 0.5) * 10 / 3, 0, -20); // Adjust position to spawn further back and set Y to 0
        obstacle.isMoving = true;
        obstacle.isDestroyed = false;
        obstacle.direction = Math.random() < 0.5 ? 1 : -1; // Randomly set direction if moving
        obstacle.isDestructable = material === yellowObstacleMaterial; // Set destructible based on material

        loader.load('robot.glb', (gltf) => {
            const robotModel = gltf.scene;
            robotModel.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true; // Allow the robot model to cast shadows
                    if (material === yellowObstacleMaterial) {
                        node.material = material; // Apply the yellow material if specified
                    }
                }
            });
            robotModel.scale.set(0.75, 0.75, 0.75); // Set scale to 0.75

            // Adjust rotation to face the correct direction
            if (obstacle.direction === 1) {
                robotModel.rotation.y = Math.PI / 1.75; // Face right
            } else {
                robotModel.rotation.y = -Math.PI / 1.75; // Face left
            }

            obstacle.add(robotModel); // Add the robot model to the obstacle group
        });

        return obstacle;
    }

    function updateRobotDirection(obstacle) {
        obstacle.traverse((node) => {
            if (node.isMesh || node.isGroup) {
                if (obstacle.direction === 1) {
                    node.rotation.y = -Math.PI / 1.75; // Face right
                } else {
                    node.rotation.y = Math.PI / 1.75; // Face left
                }
            }
        });
    }

    function createCollectible(obstacle) {
        const collectible = new THREE.Group();
        let collectibleX;
        do {
            collectibleX = (Math.random() - 0.5) * 10 / 3;
        } while (Math.abs(collectibleX - obstacle.position.x) < 1);
        collectible.position.set(collectibleX, 0.25, -20);
        collectible.isProcessed = false;

        let sodaMixer;

        loader.load('soda.glb', (gltf) => {
            const sodaModel = gltf.scene;
            sodaModel.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true; // Allow the soda model to cast shadows
                }
            });
            sodaModel.scale.set(0.5, 0.5, 0.5); // Set soda model scale to 0.5
            collectible.add(sodaModel); // Add the soda model to the collectible group

            // Add animation to the collectible
            sodaMixer = new THREE.AnimationMixer(sodaModel);
            gltf.animations.forEach((clip) => {
                sodaMixer.clipAction(clip).play();
            });

            collectibles.push({ object: collectible, mixer: sodaMixer });
        });

        scene.add(collectible);
    }

    function updateSpawnInterval() {
        setTimeout(() => {
            generateObstacle();
            updateSpawnInterval();
        }, spawnInterval);
    }

    // Start generating obstacles
    updateSpawnInterval();

    // Call GetMove once to initialize the state
    await GetMove();

    // Player movement variables
    let playerVelocityX = 0;
    const playerSpeed = 0.1;
    const playerBoundary = 2;
    let lastSipCount = 0;

    // Create and display a counter for elapsed time
    const counter = document.createElement('div');
    counter.style.position = 'absolute';
    counter.style.top = '10px';
    counter.style.left = '50%';
    counter.style.transform = 'translateX(-50%)';
    counter.style.color = 'white';
    counter.style.fontSize = '48px';
    counter.style.fontFamily = 'Arial, sans-serif';
    counter.innerHTML = '000';
    document.body.appendChild(counter);

    let startTime = Date.now();
    let nextSippingAisleTime = Date.now() + 15000;

    // Handle gyro input based on updated coords
    function handleGyroInput() {
        if (coords[1] < -0.5) {
            playerVelocityX = -playerSpeed;
        } else {
            playerVelocityX = coords[1] > 0.5 ? playerSpeed : 0;
        }
    }

    // Function to receive updates from GetMove continuously
    function continuousGyroUpdate() {
        // This will continuously be called as if it was an event listener
        handleGyroInput();
        // Continue receiving gyro updates
        requestAnimationFrame(continuousGyroUpdate);
    }

    // Start continuous gyro updates
    continuousGyroUpdate();

    // Function to detect collision between player and obstacles
    function detectCollision() {
        if (player) {
            const playerBox = new THREE.Box3().setFromObject(player).expandByScalar(-0.125); // 75% hitbox
            for (const obstacle of obstacles) {
                if (!obstacle.isDestroyed) {
                    const obstacleBox = new THREE.Box3().setFromObject(obstacle);
                    if (playerBox.intersectsBox(obstacleBox)) {
                        if (obstacle.isDestructable) {
                            obstacle.isDestroyed = true;
                            breakSound.play(); // Play the break sound
                            setTimeout(() => {
                                scene.remove(obstacle);
                                obstacles.splice(obstacles.indexOf(obstacle), 1);
                            }, 500);
                        } else {
                            cleanup();
                            finishGCGame(false); // Finish the game on collision
                        }
                    }
                }
            }
    
            for (const collectible of collectibles) {
                if (!collectible.object.isProcessed) {
                    const collectibleBox = new THREE.Box3().setFromObject(collectible.object);
                    if (playerBox.intersectsBox(collectibleBox)) {
                        collectible.object.isProcessed = true;
                        clearLedVibTimeout();
                        setLEDs(0x0000ff, 5); // Turn on blue LEDs with intensity 5
                        SetVib(true); // Turn on vibration
                        ledVibTimeout = setTimeout(() => {
                            setLEDs(0x000000, 0); // Turn off LEDs
                            SetVib(false); // Turn off vibration
                        }, 500);
    
                        dropSound.play(); // Play the drop sound
    
                        if (collectiblesCount < 5) {
                            collectiblesCount++;
                            updateCanImage();
                        }
                        setTimeout(() => {
                            scene.remove(collectible.object);
                            collectibles.splice(collectibles.indexOf(collectible), 1);
                        }, 500);
                    }
                }
            }
        }
    }
    
    
    

    // Function to update the can image based on the number of collectibles
    function updateCanImage() {
        if (collectiblesCount <= 5) {
            canImage.src = `can_${collectiblesCount}.png`;
        }
    }

    // Handle sip input
    function handleSipInput() {
        if (sips > lastSipCount) {
            lastSipCount = sips;
            if (collectiblesCount >= 5) {
                activateInvincibilityMode();
            }
        }
    }

    function activateInvincibilityMode() {
        invincibilityMode = true;
        const invincibilityMessage = document.createElement('div');
        invincibilityMessage.style.position = 'absolute';
        invincibilityMessage.style.top = '60px';
        invincibilityMessage.style.left = '50%';
        invincibilityMessage.style.transform = 'translateX(-50%)';
        invincibilityMessage.style.color = 'white';
        invincibilityMessage.style.fontSize = '48px';
        invincibilityMessage.style.fontFamily = 'Arial, sans-serif';
        invincibilityMessage.innerHTML = 'Invincibility Mode';
        document.body.appendChild(invincibilityMessage);
    
        // Reset collectibles count and update can image
        collectiblesCount = 0;
        updateCanImage();
    
        // Load and display "sippy.glb" model in front of the camera
        loader.load('sippy.glb', (gltf) => {
            const sippyModel = gltf.scene;
            sippyModel.position.set(0, 1, -1); // Position the model in front of the camera
            sippyModel.scale.set(25, 25, 25); // Set scale to 25
            sippyModel.rotation.y = Math.PI / 2; // Rotate 90 degrees around the y-axis
            scene.add(sippyModel);
    
            // Animation loop for rotation
            const startTime = Date.now();
            function animateSippy() {
                const elapsed = Date.now() - startTime;
                if (elapsed < 2000) {
                    sippyModel.rotation.y -= 0.01; // Rotate clockwise around the Y axis
                    requestAnimationFrame(animateSippy);
                } else {
                    scene.remove(sippyModel); // Remove the model after 2 seconds
                }
            }
            animateSippy();
        });
    
        slurpSound.play(); // Play the slurp sound
    
        clearLedVibTimeout();
        setLEDs(0xffff00, 5); // Turn on yellow LEDs with intensity 5
        SetVib(true); // Turn on vibration
        ledVibTimeout = setTimeout(() => {
            setLEDs(0x000000, 0); // Turn off LEDs
            SetVib(false); // Turn off vibration
        }, 3000);
    
        setTimeout(() => {
            invincibilityMessage.innerHTML = '';
            document.body.removeChild(invincibilityMessage);
            invincibilityMode = false;
        }, 5000);
    
        // Change all current obstacles to yellow and mark them as destructible
        for (const obstacle of obstacles) {
            obstacle.traverse((node) => {
                if (node.isMesh) {
                    node.material = yellowObstacleMaterial; // Apply yellow material
                }
            });
            obstacle.isDestructable = true; // Mark as destructible
        }
    }    

    function activateSippingAisle() {
        sippingAisle = true;
        setTimeout(() => {
            sippingAisle = false;
        }, 2000); // 2 seconds of sipping aisle
    }

    // Animation loop
    function animate() {
        currentAnimationFrame = requestAnimationFrame(animate);

        // Calculate delta time once per frame
        const delta = clock.getDelta();

        // Update player position based on velocity
        if (player) {
            player.position.x += playerVelocityX;

            // Prevent player from moving outside the middle third boundaries
            if (player.position.x < -playerBoundary) player.position.x = -playerBoundary;
            if (player.position.x > playerBoundary) player.position.x = playerBoundary;
        }

        // Update obstacles position and recycle them
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obstacle = obstacles[i];
            if (!obstacle.isDestroyed) {
                obstacle.position.z += obstacleSpeed;
                if (obstacle.isMoving) {
                    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
                    const movingObstacleSpeed = 0.05 + (elapsedSeconds * 0.0005);
                    obstacle.position.x += movingObstacleSpeed * obstacle.direction;
                    if (obstacle.position.x < -playerBoundary || obstacle.position.x > playerBoundary) {
                        obstacle.direction *= -1; // Reverse direction if it hits the boundary
                        updateRobotDirection(obstacle); // Update robot rotation based on new direction
                    }
                }
                if (obstacle.position.z > 5) {
                    scene.remove(obstacle);
                    obstacles.splice(i, 1);
                }
            } else {
                obstacle.position.y += 0.02; // Translate up
                obstacle.scale.set(
                    obstacle.scale.x * 0.9,
                    obstacle.scale.y * 0.9,
                    obstacle.scale.z * 0.9
                ); // Scale down
            }
        }

        // Update collectibles position and recycle them
        for (let i = collectibles.length - 1; i >= 0; i--) {
            const { object: collectible, mixer } = collectibles[i];
            if (!collectible.isProcessed) {
                collectible.position.z += obstacleSpeed;
            } else {
                collectible.position.y += 0.02; // Translate up
                collectible.scale.set(
                    collectible.scale.x * 0.9,
                    collectible.scale.y * 0.9,
                    collectible.scale.z * 0.9
                ); // Scale down
            }
            if (collectible.position.z > 5) {
                scene.remove(collectible);
                collectibles.splice(i, 1);
            }
            // Update animation
            mixer.update(delta);
        }

        // Check for collisions
        detectCollision();

        // Handle sip input
        handleSipInput();

        // Update the animation mixer
        if (mixer) {
            mixer.update(delta);
        }

        // Update obstacle speed and spawn interval over time
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        obstacleSpeed = 0.1 + (elapsedSeconds * 0.003);
        spawnInterval = Math.max((670 * 1.25) / (1 + elapsedSeconds * 0.003), 50); // Adjusted spawn interval to 80% as frequent, limit to 50ms minimum

        // Update the counter
        counter.innerHTML = String(elapsedSeconds).padStart(3, '0');

        // Check for sipping aisle activation
        if (Date.now() >= nextSippingAisleTime) {
            activateSippingAisle();
            nextSippingAisleTime = Date.now() + 15000; // Schedule next sipping aisle
        }

        // Render the background and scene
        renderer.autoClear = false;
        renderer.clear();
        renderer.render(backgroundScene, backgroundCamera);
        renderer.render(scene, camera);
    }

    const clock = new THREE.Clock();

    // Start the animation loop
    animate();

    // Handle window resize
    window.addEventListener('resize', () => {
        const windowAspectRatio = window.innerWidth / window.innerHeight;
        if (windowAspectRatio > aspectRatio) {
            renderer.setSize(window.innerHeight * aspectRatio, window.innerHeight);
        } else {
            renderer.setSize(window.innerWidth, window.innerWidth / aspectRatio);
        }
        camera.aspect = aspectRatio;
        camera.updateProjectionMatrix();
        positionCanImage(); // Reposition the can image on resize
    });

    // Trigger the resize event initially to set the correct size
    window.dispatchEvent(new Event('resize'));
}
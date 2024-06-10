let scene, camera, renderer, titleModel;

export function startMainMenu() {
    // Set up renderer
    const canvas = document.getElementById('game');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
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
    const backgroundMaterial = new THREE.MeshBasicMaterial({ map: backgroundTexture, depthTest: false, depthWrite: false });
    const backgroundGeometry = new THREE.PlaneGeometry(2, 2);
    const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    backgroundMesh.position.z = -1; // Position it behind other objects

    const backgroundScene = new THREE.Scene();
    const backgroundCamera = new THREE.Camera();
    backgroundScene.add(backgroundMesh);

    // Create main scene
    scene = new THREE.Scene();

    // Set up camera
    const aspectRatio = 3 / 4;
    camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
    camera.position.set(0, 2.8, 1.6);
    camera.rotation.set(-0.79, 0, 0); // Tilt the camera downward at 45 degrees
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

    // Load the title.glb model
    const loader = new THREE.GLTFLoader();
    loader.load(
        'title.glb',
        function (gltf) {
            titleModel = gltf.scene;
            titleModel.scale.set(0.1, 0.1, 0.1); // Set scale to 10%
            titleModel.rotation.x = -Math.PI / 4; // Rotate 45 degrees counterclockwise around X-axis
            titleModel.position.set(0, 0.75, -2); // Move the title model further up
            scene.add(titleModel);
        },
        undefined,
        function (error) {
            console.error('Error loading title.glb:', error);
        }
    );

    // Variables for rotation animation
    let rotationDirection = 1; // 1 for clockwise, -1 for counterclockwise
    const maxRotationAngle = THREE.MathUtils.degToRad(15); // Maximum rotation angle in radians

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);

        // Check if the title model is loaded
        if (titleModel) {
            // Update rotation on the Y-axis
            titleModel.rotation.y += rotationDirection * 0.01; // Adjust the speed as needed

            // Check if the rotation angle exceeds the maximum
            if (Math.abs(titleModel.rotation.y) >= maxRotationAngle) {
                // Reverse rotation direction
                rotationDirection *= -1;
            }
        }

        renderer.autoClear = false;
        renderer.clear();
        renderer.render(backgroundScene, backgroundCamera);
        renderer.render(scene, camera);
    }
    animate();

    // Create text elements for credits
    const creditsContainer = document.createElement('div');
    creditsContainer.style.position = 'absolute';
    creditsContainer.style.bottom = '20px';
    creditsContainer.style.width = '100%';
    creditsContainer.style.textAlign = 'center';
    creditsContainer.style.color = 'white';
    creditsContainer.style.fontSize = '24px';
    creditsContainer.style.fontFamily = 'Arial, sans-serif';

    const gameByText = document.createElement('div');
    gameByText.innerHTML = 'Game by Nate Iversen';

    const musicByText = document.createElement('div');
    musicByText.innerHTML = 'Music: Mountain Trials by Joshua McLean';

    creditsContainer.appendChild(gameByText);
    creditsContainer.appendChild(musicByText);
    document.body.appendChild(creditsContainer);

    // Remove the credits after 5 seconds
    setTimeout(() => {
        document.body.removeChild(creditsContainer);
    }, 5000);

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    function onWindowResize() {
        const windowAspectRatio = window.innerWidth / window.innerHeight;
        if (windowAspectRatio > aspectRatio) {
            renderer.setSize(window.innerHeight * aspectRatio, window.innerHeight);
        } else {
            renderer.setSize(window.innerWidth, window.innerWidth / aspectRatio);
        }
        camera.aspect = aspectRatio;
        camera.updateProjectionMatrix();
    }

    // Trigger the resize event initially to set the correct size
    window.dispatchEvent(new Event('resize'));
}

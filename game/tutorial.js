let scene, camera, renderer, tutorialModel, backgroundScene, backgroundCamera;

export function startTutorial() {
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

    backgroundScene = new THREE.Scene();
    backgroundCamera = new THREE.Camera();
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

    // Load the tutorial.glb model
    const loader = new THREE.GLTFLoader();
    loader.load(
        'tutorial.glb',
        function (gltf) {
            tutorialModel = gltf.scene;
            tutorialModel.scale.set(0.12, 0.12, 0.12); // Set scale to 15%
            tutorialModel.rotation.x = -Math.PI / 4; // Rotate 45 degrees counterclockwise around X-axis
            tutorialModel.position.set(0, -3, -2); // Move the tutorial model further up
            scene.add(tutorialModel);

            // Remove the tutorial model after 3 seconds
            setTimeout(() => {
                scene.remove(tutorialModel);
            }, 5000);
        },
        undefined,
        function (error) {
            console.error('Error loading tutorial.glb:', error);
        }
    );

    // Variables for rotation animation
    let rotationDirection = 1; // 1 for clockwise, -1 for counterclockwise
    const maxRotationAngle = THREE.MathUtils.degToRad(5); // Maximum rotation angle in radians

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);

        // Check if the tutorial model is loaded
        if (tutorialModel) {
            // Update rotation on the Y-axis
            tutorialModel.rotation.y += rotationDirection * 0.005; // Adjust the speed as needed

            // Check if the rotation angle exceeds the maximum
            if (Math.abs(tutorialModel.rotation.y) >= maxRotationAngle) {
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

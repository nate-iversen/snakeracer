(async () => {
    await initGCGame();

    let currentScene = null;
    let currentAnimationFrame = null;

    // Create and start the audio element
    window.mcleanAudio = new Audio('mclean.mp3');
    window.mcleanAudio.loop = true;
    window.mcleanAudio.volume = 0.1;
    window.mcleanAudio.play();
    

    async function loadScene(sceneModule, startFunction) {
        if (currentScene && currentScene.dispose) {
            cancelAnimationFrame(currentAnimationFrame);
            currentScene.dispose();
        }

        try {
            const module = await import(sceneModule);
            module[startFunction]();
            currentScene = module;
        } catch (error) {
            console.error(`Error loading ${sceneModule}:`, error);
        }
    }

    // Start with the main menu
    await loadScene('./mainmenu.js', 'startMainMenu');

    // Switch to tutorial after 5 seconds
    setTimeout(async () => {
        await loadScene('./tutorial.js', 'startTutorial');

        // Switch to scene1 after another 5 seconds
        setTimeout(async () => {
            await loadScene('./scene1.js', 'startScene');
        }, 5000);
    }, 5000);
})();

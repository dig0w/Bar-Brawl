let intervalId = null;
let lastTime = 0;

self.onmessage = function(e) {
    if (e.data.action === "START") {
        if (intervalId) clearInterval(intervalId);

        lastTime = performance.now();

        intervalId = setInterval(() => {
            const now = performance.now();
            const deltaTime = (now - lastTime) / 1000;
            lastTime = now;

            self.postMessage({ action: "TICK", deltaTime: deltaTime });
        }, 1000 / (e.data.tickRate || 32));
    } 

    if (e.data.action === "STOP") {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }
};
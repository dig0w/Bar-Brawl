let intervalId = null;

self.onmessage = function(e) {
    if (e.data.action === "START") {
        if (intervalId) clearInterval(intervalId);

        const tickDelay = 1000 / (e.data.tickRate || 60);

        intervalId = setInterval(() => {
            self.postMessage({ action: "TICK" });
        }, tickDelay);
    }

    if (e.data.action === "STOP") {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }
};
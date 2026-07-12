import { FighterEngine } from "./engine.js";
import { Controller } from "./controller.js";

export class NetworkManager {
    static signalingURL = "https://cqawfcgolofiaudqacrg.supabase.co";
    static signalingKey = "sb_publishable_frZwSlAoGpeiFaZAxODyVw_kTyvDhZU";

    #engine;
    #sessionCode;
    #myId = Math.random().toString(36).substring(2, 9);
    #signaling;
    #channel;
    #peer;
    #isHost = false;

    #pingStartTimes = new Map();
    #pingSamples = [];
    #pingCount = 0;
    static MAX_PING_SAMPLES = 5;

    #status = "NONE";
    static timeoutDuration = 5;
    static errorCooldown = 2;

    constructor(engine) {
        if (!(engine instanceof FighterEngine))
            throw new Error(`${this.constructor.name} requires a ${FighterEngine.name} instance.`);

        this.#engine = engine;
    }

    get sessionCode() { return this.#sessionCode; }
    get hasConnection() { return this.#peer || this.#channel; }
    get isConnected() { return this.#peer && this.#peer.connected; }

    get status() { return this.#status; }

    SendInput(frame, mask) {
        if (this.isConnected) {
            const buffer = new ArrayBuffer(5);
            const v = new DataView(buffer);
            v.setUint32(0, frame);
            v.setUint8(4, mask);
            this.#peer.send(buffer);
        }
    }

    // When lockstep simulation has stalled, Client asks the Host for a fresh snapshot
    RequestFullStateRecovery() {
        if (!this.isConnected) return;

        if (this.#isHost) {
            this.#sendFullStateRecovery();
            return;
        }

        const buffer = new ArrayBuffer(2);
        const v = new DataView(buffer);
        v.setUint8(0, 0xFC);
        v.setUint8(1, 0);
        this.#peer.send(buffer);
        console.log("Requested Full State Recovery from Host.");
    }

    // Serializes the game state, ships it to the Client, and applies it locally too so both sides reset their states
    #sendFullStateRecovery() {
        if (!this.isConnected) return;

        const state = this.#engine.SerializeState();

        if (this.#peer) {
            const json = new TextEncoder().encode(JSON.stringify(state));
            const buffer = new ArrayBuffer(1 + json.byteLength);
            const bytes = new Uint8Array(buffer);
            bytes[0] = 0xFB;
            bytes.set(json, 1);
            this.#peer.send(buffer);
        }

        this.#engine.ApplyFullStateRecovery(state);
        console.log("Sent Full State Recovery snapshot to Client. Frame:", state.frame);
    }

    #connectSignaling(roomCode, callback) {
        if (this.#channel) return;

        if (!this.#signaling) {
            this.#signaling = window.supabase.createClient(
                NetworkManager.signalingURL,
                NetworkManager.signalingKey
            );
        }

        this.#channel = this.#signaling.channel(`room:${roomCode}`, {
            config: { broadcast: { self: false } }
        });

        this.#channel.on("broadcast", { event: "signal" }, payload => {
            const data = payload.payload;
            if (data.to === this.#myId && this.#peer && !this.#peer.destroyed)
                this.#peer.signal(data.signal);
        });

        this.#channel.subscribe((status) => {
            if (status === "SUBSCRIBED" && typeof callback === "function")
                callback();
        });
    }

    #closeSignaling() {
        if (this.#channel) {
            this.#signaling.removeChannel(this.#channel);
            this.#channel = null;
            console.log("Signaling web sockets cleanly closed.");
        }
    }

    #initPeer(initiator, targetId, gameStateMode) {
        const p = new SimplePeer({ initiator, trickle: false });

        p.on("signal", signal => {
            if (this.#channel) {
                this.#channel.send({ type: "broadcast", event: "signal", payload: { to: targetId, from: this.#myId, signal } });
            }
            console.log("Signalling");
        });

        p.on("connect", () => {
            console.log("Connected");
            this.#status = "CONNECTED";
            this.#closeSignaling();
            this.#startPingTest();
        });

        p.on("data", rawData => {
            try {
                const bytes = ArrayBuffer.isView(rawData)
                    ? new Uint8Array(rawData.buffer, rawData.byteOffset, rawData.byteLength)
                    : new Uint8Array(rawData);
                const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

                const type = bytes.byteLength > 0 ? bytes[0] : 0;

                if (type === 0xFB) {
                    // Received a snapshot of the game state
                    const json = new TextDecoder().decode(bytes.subarray(1));
                    const state = JSON.parse(json);
                    this.#engine.ApplyFullStateRecovery(state);
                    return; // Stop processing this packet
                }

                // Check if its a latency sync packet
                if (v.byteLength === 2 && type >= 0xFC) {
                    const id = v.getUint8(1);

                    if (type === 0xFF) {
                        // Received a Ping, reply with a Pong (0xFE)
                        const reply = new ArrayBuffer(2);
                        const rv = new DataView(reply);
                        rv.setUint8(0, 0xFE);
                        rv.setUint8(1, id);
                        this.#peer.send(reply);
                    } else if (type === 0xFE) {
                        // Received our Pong, calculate RTT
                        if (this.#pingStartTimes.has(id)) {
                            const rtt = performance.now() - this.#pingStartTimes.get(id);
                            this.#pingSamples.push(rtt);

                            if (this.#pingSamples.length < NetworkManager.MAX_PING_SAMPLES) {
                                // Run the next sample loop
                                this.#sendPingSample();
                            } else {
                                // All samples collected
                                this.#finalizeDelayFrames(gameStateMode);
                            }
                        }
                    } else if (type === 0xFD) {
                        // Client receives forced delay frames value from the Host
                        Controller.delayFrames = id;
                        console.log(`Client synced dynamic delay from Host: ${Controller.delayFrames}`);

                        console.log("Starting game as Client.", Date.now());
                        this.#engine.mainMenu.StartGame(gameStateMode);
                    } else if (type === 0xFC) {
                        // Requesting a fresh authoritative snapshot
                        if (this.#isHost) this.#sendFullStateRecovery();
                    }
                    return; // Stop processing this packet
                }

                const frame = v.getUint32(0);
                const mask = v.getUint8(4);

                if (this.#engine.ctrl1) this.#engine.ctrl1.QueueInput(frame, mask);
                console.log("data p", frame, mask)
            } catch (e) {
                console.error("Failed to parse network packet", e);
            }
        });

        p.on("close", () => {
            console.log("close p");
            this.Disconnect();
        });

        p.on("error", (a) => {
            console.log("error p", a);
            this.Disconnect();
        });

        this.#peer = p;
        return p;
    }

    async Host() {
        const code = Math.random().toString(36).substring(2, 7).toUpperCase();
        this.#sessionCode = code;
        this.#status = "HOSTING";

        this.#connectSignaling(code, () => {
            console.log("Host room established successfully via channel code:", code);

            this.#channel.on("broadcast", { event: "player-joined" }, payload => {
                const guestId = payload.payload.id;
                console.log("Challenger checked in:", guestId);
                this.#initPeer(true, guestId, 2);
            });

            this.#isHost = true;
        });
    }

    async Join(code) {
        if (!code) return;
        this.#status = "JOINING";

        this.#connectSignaling(code, () => {
            console.log("Successfully connected to room:", code);

            this.#channel.on("broadcast", { event: "signal" }, payload => {
                const data = payload.payload;
                if (data.to === this.#myId && !this.#peer) {
                    const p = this.#initPeer(false, data.from, 3);
                    p.signal(data.signal);
                }
            });

            this.#channel.send({ type: "broadcast", event: "player-joined", payload: { id: this.#myId } });

            this.#isHost = false;
        });

        setTimeout(() => {
            if (!this.isConnected && this.#status === "JOINING") {
                this.#status = "ERROR";
                this.#closeSignaling();

                setTimeout(() => { if(this.#status === "ERROR") this.#status = "NONE"; }, NetworkManager.errorCooldown * 1000);
            }
        }, NetworkManager.timeoutDuration * 1000);
    }

    Disconnect() {
        this.#status = "NONE";

        if (this.#peer) {
            this.#peer.destroy();
            this.#peer = null;
        }

        this.#closeSignaling();
        this.#sessionCode = null;
        this.#engine.SetGameState(0, 0);
    }


    #startPingTest() {
        this.#pingSamples = [];
        this.#pingCount = 0;
        this.#pingStartTimes.clear();
        console.log("Starting network latency calibration...");
        this.#sendPingSample();
    }

    #sendPingSample() {
        if (!this.isConnected || this.#pingCount >= NetworkManager.MAX_PING_SAMPLES) return;

        const buffer = new ArrayBuffer(2);
        const v = new DataView(buffer);
        v.setUint8(0, 0xFF);
        v.setUint8(1, this.#pingCount);

        this.#pingStartTimes.set(this.#pingCount, performance.now());
        this.#peer.send(buffer);
        this.#pingCount++;
    }

    #finalizeDelayFrames(gameStateMode) {
        // Only the Host calculates and dictates the delay frames
        if (this.#isHost) { 
            const sum = this.#pingSamples.reduce((a, b) => a + b, 0);
            const avgRTT = sum / this.#pingSamples.length;
            const oneWayTrip = avgRTT / 2;
            const frameTime = 1000 / 60;

            let calculatedDelay = Math.ceil(oneWayTrip / frameTime) + 1;
            calculatedDelay = Math.max(2, Math.min(8, calculatedDelay));

            Controller.delayFrames = calculatedDelay;
            console.log(`Host Calibration Complete! Avg Ping: ${avgRTT.toFixed(1)}ms. Delay set to: ${Controller.delayFrames}`);

            // Send sync packet to the Client
            const syncBuffer = new ArrayBuffer(2);
            const sv = new DataView(syncBuffer);
            sv.setUint8(0, 0xFD);
            sv.setUint8(1, calculatedDelay);
            this.#peer.send(syncBuffer);

            console.log("Ready to start.", Date.now(), " frames:", calculatedDelay, " time:", calculatedDelay * frameTime, "ms", " prev delay:", oneWayTrip * 1000, "ms");

            // Delay host start, to match the clients start
            this.#engine.SetDelayedGameStart(gameStateMode, calculatedDelay - 2);
        }
    }


    loadLibs() {
        return new Promise((resolve, reject) => {
            if (window.SimplePeer && window.supabase) return resolve();

            console.log("Loading multiplayer network libraries...");

            const signalingScript = document.createElement("script");
            signalingScript.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

            const peerScript = document.createElement("script");
            peerScript.src = "https://cdnjs.cloudflare.com/ajax/libs/simple-peer/9.11.1/simplepeer.min.js";

            let loadedCount = 0;
            const onScriptLoad = () => {
                loadedCount++;
                if (loadedCount === 2) {
                    console.log("Multiplayer libraries successfully compiled.");
                    resolve();
                }
            };

            signalingScript.onload = onScriptLoad;
            peerScript.onload = onScriptLoad;
            signalingScript.onerror = reject;
            peerScript.onerror = reject;

            document.head.appendChild(signalingScript);
            document.head.appendChild(peerScript);
        });
    }
}
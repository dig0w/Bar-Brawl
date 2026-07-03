import { FighterEngine } from "./engine.js";

export class NetworkManager {
    static signalingURL = "https://cqawfcgolofiaudqacrg.supabase.co";
    static signalingKey = "sb_publishable_frZwSlAoGpeiFaZAxODyVw_kTyvDhZU";

    #engine;
    #sessionCode;
    #myId = Math.random().toString(36).substring(2, 9);
    #signaling;
    #channel;
    #peer;

    constructor(engine) {
        if (!(engine instanceof FighterEngine))
            throw new Error(`${this.constructor.name} requires a ${FighterEngine.name} instance.`);

        this.#engine = engine;
    }

    get sessionCode() { return this.#sessionCode; }
    get hasConnection() { return this.#peer || this.#channel; }
    get isConnected() { return this.#peer && this.#peer.connected; }

    SendInput(frame, mask) {
        if (this.isConnected) {
            const buffer = new ArrayBuffer(2);
            const v = new DataView(buffer);
            v.setUint8(0, frame);
            v.setUint8(1, mask);
            this.#peer.send(buffer);
        }
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
            console.log("signal p");
        });

        p.on("connect", () => {
            console.log("connect p");
            this.#closeSignaling();
            this.#engine.mainMenu.StartGame(gameStateMode);
        });

        p.on("data", rawData => {
            try {
                const buffer = rawData.buffer || rawData; 
                const v = new DataView(buffer);
                const frame = v.getUint8(0);
                const mask = v.getUint8(1);

                this.#engine.ctrl1.QueueInput(frame, mask);
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

        this.#connectSignaling(code, () => {
            console.log("Host room established successfully via channel code:", code);

            this.#channel.on("broadcast", { event: "player-joined" }, payload => {
                const guestId = payload.payload.id;
                console.log("Challenger checked in:", guestId);
                this.#initPeer(true, guestId, 2);
            });
        });
    }

    async Join(code) {
        if (!code) return;

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
        });
    }

    Disconnect() {
        if (this.#peer) {
            this.#peer.destroy();
            this.#peer = null;
        }

        this.#closeSignaling();
        this.#sessionCode = null;
        this.#engine.SetGameState(0, 0);
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
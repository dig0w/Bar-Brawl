import { FighterEngine } from "./engine.js";

export class NetworkManager {
    static signalingURL = "https://cqawfcgolofiaudqacrg.supabase.co";
    static signalingKey = "sb_publishable_frZwSlAoGpeiFaZAxODyVw_kTyvDhZU";
    static networkTick = 32;
    static networkTickRate = 1 / NetworkManager.networkTick;

    #engine;
    #sessionCode;
    #myId = Math.random().toString(36).substring(2, 9);
    #signaling;
    #channel;
    #peer;
    
    #networkAccumulator = 0;
    #lastSentState = {};
    #remoteStateBuffer = null;
    #currentFrame = -1;
    #lastReceivedFrame = -1;

    constructor(engine) {
        if (!(engine instanceof FighterEngine))
            throw new Error(`${this.constructor.name} requires a ${FighterEngine.name} instance.`);

        this.#engine = engine;
    }

    get sessionCode() { return this.#sessionCode; }
    get hasConnection() { return this.#peer || this.#channel; }
    get isConnected() { return this.#peer && this.#peer.connected; }

    Tick(deltaTime) {
        this.#networkAccumulator += deltaTime;

        if (this.#networkAccumulator >= NetworkManager.networkTickRate) {
            this.#currentFrame = (this.#currentFrame + 1) % 256;

            const isHost = this.#engine.isHost;
            const myFighter = isHost ? this.#engine.fighter0 : this.#engine.fighter1;
            const theirFighter = isHost ? this.#engine.fighter1 : this.#engine.fighter0;

            if (this.isConnected) {
                const currentState = myFighter.GetNetworkState();
                const delta = { f: this.#currentFrame };

                for (let key in currentState) {
                    if (currentState[key] !== this.#lastSentState[key]) {
                        delta[key] = currentState[key];
                    }
                }

                delta["c"] = this.#engine.ctrl0.GetInputMask();

                if (isHost) {
                    delta["hp0"] = (this.#engine.fighter0.health | 0);
                    delta["hp1"] = (this.#engine.fighter1.health | 0);

                    if (this.#engine.roundOverTrigger > 0) {
                        delta["ro"] = this.#engine.roundOverTrigger;
                        this.#engine.roundOverTrigger = 0;
                    }
                }

                const hit = theirFighter.GetHitReport();
                if (hit) {
                    delta["hi"] = hit.i;
                    delta["hx"] = hit.p.x;
                    delta["hy"] = hit.p.y;
                    delta["hs"] = hit.s;
                }

                this.#peer.send(this.#Pack(delta));
            }

            if (this.#remoteStateBuffer) {
                const data = this.#remoteStateBuffer;

                if (data.hi !== undefined || data.hx !== undefined || data.hy !== undefined || data.hs !== undefined) 
                    myFighter.TakeDamage(data.hi, { x: data.hx, y: data.hy }, data.hs);

                if (!isHost) {
                    if (data.hp0 !== undefined) this.#engine.fighter0.SetNetworkState({ hp: data.hp0 });
                    if (data.hp1 !== undefined) this.#engine.fighter1.SetNetworkState({ hp: data.hp1 });
                }

                theirFighter.SetNetworkState(data);
                this.#engine.ctrl1.SetInputMask(data.c);

                if (data.ro !== undefined && data.ro > 0) 
                    this.#engine.RoundOver(data.ro == 1 ? this.#engine.fighter0 : this.#engine.fighter1);

                this.#remoteStateBuffer = null;
            }

            this.#networkAccumulator -= NetworkManager.networkTickRate;
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
            if (data.to === this.#myId && this.#peer && !this.#peer.destroyed) {
                this.#peer.signal(data.signal);
            }
        });

        this.#channel.subscribe((status) => {
            if (status === "SUBSCRIBED" && typeof callback === "function") {
                callback();
            }
        });
    }

    #closeSignaling() {
        if (this.#channel) {
            this.#signaling.removeChannel(this.#channel);
            this.#channel = null;
            console.log("Supabase signaling web sockets cleanly closed.");
        }
    }

    #initPeer(initiator, targetId, gameStateMode) {
        const p = new SimplePeer({ initiator, trickle: false });

        p.on("signal", signal => {
            if (this.#channel) {
                this.#channel.send({
                    type: "broadcast",
                    event: "signal",
                    payload: { to: targetId, from: this.#myId, signal }
                });
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
                const data = this.#Unpack(rawData);

                const newF = data.f;
                const oldF = this.#lastReceivedFrame;
                const isNewer = (newF > oldF) || (oldF - newF > 200);

                this.#lastReceivedFrame = newF;
                this.#remoteStateBuffer = data;

                console.log("data p: ", data);
                console.log("rawdata: ", rawData);
                console.log("size (B): ", rawData.byteLength || rawData.length);
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

            this.#channel.send({
                type: "broadcast",
                event: "player-joined",
                payload: { id: this.#myId }
            });
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

    #Pack(data) {
        let size = 10;
        let hasHit = false;

        if (this.#engine.isHost) size += 3;
        if (data.hi !== undefined || data.hx !== undefined || data.hy !== undefined || data.hs !== undefined) {
            size += 7;
            hasHit = true;
        }

        const buffer = new ArrayBuffer(size);
        const v = new DataView(buffer);
        let offset = 0;

        // Frame
        v.setUint8(offset++, data.f || 0);

        // Movement & Controls
        v.setInt16(offset, data.x || 0); offset += 2;
        v.setInt16(offset, data.y || 0); offset += 2;
        v.setInt16(offset, (data.vx || 0) * 100); offset += 2;
        v.setInt16(offset, (data.vy || 0) * 100); offset += 2;
        v.setUint8(offset++, data.c || 0);

        // Health & Round Over
        if (this.#engine.isHost) {
            v.setUint8(offset++, data.hp0);
            v.setUint8(offset++, data.hp1);
            v.setUint8(offset++, data.ro);
        }

        // Hit
        if (hasHit) {
            v.setUint8(offset++, (data.hi || 0));
            v.setInt16(offset, (data.hx || 0)); offset += 2;
            v.setInt16(offset, (data.hy || 0)); offset += 2;
            v.setInt16(offset, (data.hs || 0) * 100); offset += 2;
        }

        return buffer;
    }

    #Unpack(rawData) {
        const buffer = rawData.buffer || rawData; 
        const v = new DataView(buffer);
        const len = buffer.byteLength;
        let offset = 0;
        const res = {};

        res.f = v.getUint8(offset++);
        res.x = v.getInt16(offset); offset += 2;
        res.y = v.getInt16(offset); offset += 2;
        res.vx = v.getInt16(offset) / 100; offset += 2;
        res.vy = v.getInt16(offset) / 100; offset += 2;
        res.c = v.getUint8(offset++);

        if (!this.#engine.isHost) {
            res.hp0 = v.getUint8(offset++);
            res.hp1 = v.getUint8(offset++);
            res.ro = v.getUint8(offset++);
        }

        if (len - offset === 7) {
            res.hi = v.getUint8(offset++);
            res.hx = v.getInt16(offset); offset += 2;
            res.hy = v.getInt16(offset); offset += 2;
            res.hs = v.getInt16(offset) / 100; offset += 2;
        }

        return res;
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
import { AIController } from "./ai.js";
import { Controller } from "./controller.js";
import { Fighter } from "./fighter.js";
import { Menu } from "./menu.js";

export class FighterEngine {
    static gravity = 980;
    static friction = .98;
    #groundY = 2;
    #worldWidth = 0;
    #timeScale = 1;
    #timeScaleTimer = 0;

    #canvasSize = { w: 120, h: 80 };
    #canvas = null;
    #ctx = null;
    #objects = [];

    #backgroundImage = Object.assign(new Image(), { src: "assets/bar.png" });

    #mainMenu = null;
    #fighter0 = null;
    #fighter1 = null;
    #ctrl0 = null;
    #ctrl1 = null;

    #gameMode;
    #gameState;
    #prevGameState;
    static maxRounds = 3;
    #rounds = 0;
    #scoreF0 = 0;
    #scoreF1 = 0;

    static serverURL = "http://localhost:3000";
    #sessionCode;
    #socket;
    #peer;
    static networkTick = 32;
    static networkTickRate = 1 / FighterEngine.networkTick;
    #networkAccumulator = 0;
    #lastSentState = {};
    #remoteStateBuffer = null;
    #currentFrame = -1;
    #lastReceivedFrame = -1;
    #roundOverTrigger = 0;

    static uiSheet = Object.assign(new Image(), { src: "assets/ui_sheet.png" });
    #redFontSheet = null;
    #greenFontSheet = null;
    static tCanvas = document.createElement("canvas");
    static tCtx = FighterEngine.tCanvas.getContext("2d");

    static defaultUiGameOverTimer = .25;
    #uiGameOverTimer = 0;

    #uiRoundText = "";
    static defaultUiRoundTimer = .75;
    #uiRoundTimer = 0;
    #uiRoundLoc = { x: .5, y: .4 };
    static uiRoundSize = 16;
    static defaultUiRoundAfterTimer = .25;
    #uiRoundAfterTimer = 0;
    #uiRoundAfterLoc = { x: .5, y: 11 };
    static uiRoundAfterSize = 8;
    static uiRoundFillColor = "#feffff";
    static uiRoundOutlineColor = "#545454";

    static defaultUiFightTimer = .75;
    #uiFightTimer = 0;
    #uiFightDone = false;
    static uiFightFillColor = "#e66257";
    static uiFightOutlineColor = "#331505";

    #uiWinnerText = "";
    static defaultUiWinnerTimer = 1.3;
    #uiWinnerTimer = 0;
    static uiWinnerFillColor = "#feffff";
    static uiWinnerOutlineColor = "#545454";

    #shakeTimer = 0;
    #shakeDuration = 0;
    #shakeIntensity = 0;
    #shakeOffset = { x: 0, y: 0 };

    #fadeColor = "#000";
    #fadeAlpha = 0;
    #fadeDuration = 0;
    #fadeTimer = 0;
    #fadeDirection = 0; // 1 = fade to, -1 = fade from, 0 = none

    constructor() {
    }

    get gameState() { return this.#gameState; }
    get gameMode() { return this.#gameMode; }

    get gravity() { return FighterEngine.gravity; }
    get friction() { return FighterEngine.friction; }
    get groundY() { return this.#groundY; }
    get worldWidth() { return this.#worldWidth; }

    get canvasSize() { return this.#canvasSize; }
    get canvas() { return this.#canvas; }

    get isHost() { return this.#gameMode === "VERSUS_HOST" }
    get isOnline() { return (this.isHost || this.#gameMode === "VERSUS_CLIENT") }
    isFighterLocal(fighter)  { return this.#ctrl0.pawn === fighter }

    get fighter0() { return this.#fighter0; }
    get fighter1() { return this.#fighter1; }
    getOpponent(fighter) { return this.fighter0 === fighter ? this.fighter1 : this.fighter0 }

    getScore(fighter) { return fighter == this.#fighter0 ? this.#scoreF0 : this.#scoreF1; }

    Begin() {
        this.#canvas = document.getElementById("game-canvas");

        this.#canvas.width = this.#canvasSize.w * 2;
        this.#canvas.height = this.#canvasSize.h * 2;

        this.#ctx = this.#canvas.getContext("2d");
        this.#ctx.imageSmoothingEnabled = false;

        this.#mainMenu = new Menu(this);
        this.#mainMenu.Begin();

        this.#groundY = this.#canvasSize.h - this.#groundY;
        this.#worldWidth = this.#canvasSize.w;

        this.#fighter0 = new Fighter(this, 0);
        this.#objects.push(this.#fighter0);
        this.#fighter1 = new Fighter(this, 1);
        this.#objects.push(this.#fighter1);

        for (let i = 0; i < this.#objects.length; i++) {
            this.#objects[i].Begin();
        }

        this.#uiRoundLoc.x *= this.#canvas.width;
        this.#uiRoundLoc.y *= this.#canvas.height;

        this.#uiRoundAfterLoc.x *= this.#canvas.width;

        FighterEngine.uiSheet.onload = () => {
            this.#redFontSheet = FighterEngine.extractChannelMask(FighterEngine.uiSheet, "r");
            this.#greenFontSheet = FighterEngine.extractChannelMask(FighterEngine.uiSheet, "g");
        }

        this.SetGameState(0);

        window.onbeforeunload = () => {
            this.Disconnect();
        };
    }

    Tick(deltaTime) {
        if (this.#timeScaleTimer >= 0 && this.#timeScaleTimer != undefined) {
            this.#timeScaleTimer -= deltaTime;
            if (this.#timeScaleTimer <= 0) {
                this.#timeScale = 1;
            }
        }
        const activeDeltaTime = deltaTime * (this.#gameState === "PAUSED" && !this.isOnline ? 0 : this.#timeScale);

        if (this.#gameState === "MENU" || this.#gameState === "PAUSED") {
            this.#mainMenu.Tick(deltaTime);
        }

        this.#networkAccumulator += deltaTime;
        if (this.isOnline && this.#networkAccumulator >= FighterEngine.networkTickRate) {
            this.#currentFrame = (this.#currentFrame + 1) % 256;

            const isHost = this.isHost;
            const myFighter = isHost ? this.#fighter0 : this.#fighter1;
            const theirFighter = isHost ? this.#fighter1 : this.#fighter0;

            if (this.#peer && this.#peer.connected) {
                const currentState = myFighter.GetNetworkState();
                const delta = { f: this.#currentFrame };
                let hasChanges = false;

                for (let key in currentState) {
                    if (currentState[key] !== this.#lastSentState[key]) {
                        delta[key] = currentState[key];
                        this.#lastSentState[key] = currentState[key];
                        hasChanges = true;
                    }
                }

                delta["c"] = this.#ctrl0.GetInputMask();

                const hit = theirFighter.GetHitReport();
                if (hit) delta["h"] = hit;

                if (isHost) {
                    delta["hp0"] = (this.#fighter0.health | 0);
                    delta["hp1"] = (this.#fighter1.health | 0);

                    if (this.#roundOverTrigger > 0) {
                        delta["ro"] = this.#roundOverTrigger;
                        this.#roundOverTrigger = 0;
                    }
                }

                this.#peer.send(JSON.stringify(delta));
            }

            if (this.#remoteStateBuffer) {
                const data = this.#remoteStateBuffer;

                if (data.h) myFighter.TakeDamage(data.h.i, data.h.p, data.h.s);

                if (!isHost) {
                    if (data.hp0 !== undefined) this.#fighter0.SetNetworkState({ hp: data.hp0 });
                    if (data.hp1 !== undefined) this.#fighter1.SetNetworkState({ hp: data.hp1 });
                }

                theirFighter.SetNetworkState(data);
                this.#ctrl1.SetInputMask(data.c);

                if (data.ro !== undefined && data.ro > 0) this.RoundOver(data.ro == 1 ? this.#fighter0 : this.#fighter1);

                this.#remoteStateBuffer = null;
            }

            this.#networkAccumulator -= FighterEngine.networkTickRate;
        }

        for (let i = this.#objects.length - 1; i >= 0; i--) {
            this.#objects[i].Tick(activeDeltaTime);
        }


        if (this.#uiGameOverTimer > 0) {
            this.#uiGameOverTimer -= deltaTime;
        }

        if (this.#uiRoundTimer > 0) {
            this.#uiRoundTimer -= deltaTime;

            if (this.#uiRoundTimer <= 0) {
                this.#uiRoundAfterTimer = FighterEngine.defaultUiRoundAfterTimer;
            }
        }
        if (this.#uiRoundAfterTimer > 0) {
            this.#uiRoundAfterTimer -= deltaTime;

            if (this.#uiRoundAfterTimer <= 0) {
                this.#uiFightTimer = FighterEngine.defaultUiFightTimer;
                this.#uiFightDone = false;
            }
        }
        if (this.#uiFightTimer > 0) {
            this.#uiFightTimer -= deltaTime;

            if (this.#uiFightTimer <= FighterEngine.defaultUiFightTimer / 3 && !this.#uiFightDone) {
                this.#uiFightDone = true;
                this.SetGameState(3);
            }
        }

        if (this.#uiWinnerTimer > 0) {
            this.#uiWinnerTimer -= deltaTime;
        }


        if (this.#shakeTimer > 0) {
            this.#shakeTimer -= deltaTime;

            if (this.#shakeTimer <= 0) {
                this.#shakeTimer = 0;
                this.#shakeOffset.x = 0;
                this.#shakeOffset.y = 0;
            } else {
                const progress = this.#shakeTimer / this.#shakeDuration;
                const currentPower = this.#shakeIntensity * progress;

                this.#shakeOffset.x = (Math.random() * 2 - 1) * currentPower;
                this.#shakeOffset.y = (Math.random() * 2 - 1) * currentPower;
            }
        }

        if (this.#fadeDirection !== 0) {
            this.#fadeTimer += deltaTime;

            const dir = this.#fadeDirection;

            let t = this.#fadeTimer / this.#fadeDuration;
            if (t >= 1) {
                t = 1;
                this.#fadeDirection = 0;
            }

            if (dir === 1) {
                this.#fadeAlpha = t;
            } else if (dir === -1) {
                this.#fadeAlpha = 1 - t;
            }
        }
    }

    Draw() {
        this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);

        this.#ctx.save();
        this.#ctx.scale(2, 2);

        if (this.#shakeTimer > 0) {
            this.#ctx.translate(this.#shakeOffset.x, this.#shakeOffset.y);
        }

        let scrollX = 0;

        if (this.#gameState === "GAME_OVER") {
            this.#ctx.fillStyle = "#000000";
            this.#ctx.fillRect(0, 0, this.#canvas.width, this.#canvas.height);

            const fighterMidX = (this.#fighter0.loc.x + this.#fighter1.loc.x) / 2 + (this.#fighter0.size.w / 2);
            scrollX = (this.#canvas.width / 4) - fighterMidX;
        } else if (this.#backgroundImage && this.#backgroundImage.complete) {
            const scale = this.#canvasSize.h / this.#backgroundImage.height;
            this.#worldWidth = this.#backgroundImage.width * scale;

            const fighterMidX = (this.fighter0.loc.x + this.fighter1.loc.x) / 2 + this.fighter0.size.w / 2;
            const viewPercent = Math.max(0, Math.min(1, fighterMidX / this.#canvasSize.w));

            const extraWidth = this.#worldWidth - this.#canvasSize.w;
            scrollX = -(extraWidth * viewPercent);

            this.#ctx.drawImage(this.#backgroundImage, (scrollX | 0), 0, (this.#worldWidth | 0), (this.#canvasSize.h | 0));
        }

        this.#ctx.save();
        this.#ctx.translate((scrollX | 0), 0);

        for (let i = 0; i < this.#objects.length; i++) {
            this.#objects[i].Draw(this.#ctx);
        }

        this.#ctx.restore();

        for (let i = 0; i < this.#objects.length; i++) {
            if (this.#objects[i].DrawUI) this.#objects[i].DrawUI(this.#ctx);
        }

        this.#ctx.restore();
        this.#ctx.save();

        if (this.#gameState === "GAME_OVER") {
            let fontSize = FighterEngine.uiRoundSize;
            if (this.#uiGameOverTimer > 0) {
                const percent = this.#uiGameOverTimer / Fighter.defaultUiGameOverTimer;
                fontSize *= (1 - percent);
            }

            this.DrawPixelText(this.#ctx, "Game Over", (this.#uiRoundLoc.x | 0), (this.#uiRoundLoc.y | 0), (fontSize | 0), FighterEngine.uiRoundFillColor, "#00000000");
        }

        if (this.#uiRoundTimer > 0) {
            this.DrawPixelText(this.#ctx, this.#uiRoundText, (this.#uiRoundLoc.x | 0), (this.#uiRoundLoc.y | 0), (FighterEngine.uiRoundSize | 0), FighterEngine.uiRoundFillColor, FighterEngine.uiRoundOutlineColor);
        } else if (this.#uiRoundAfterTimer > 0) {
            const percent = this.#uiRoundAfterTimer / FighterEngine.defaultUiRoundAfterTimer;

            const locX = this.#uiRoundAfterLoc.x + (this.#uiRoundLoc.x - this.#uiRoundAfterLoc.x) * percent;
            const locY = this.#uiRoundAfterLoc.y + (this.#uiRoundLoc.y - this.#uiRoundAfterLoc.y) * percent;
            const fontSize = FighterEngine.uiRoundAfterSize + (FighterEngine.uiRoundSize - FighterEngine.uiRoundAfterSize) * percent;

            this.DrawPixelText(this.#ctx, this.#uiRoundText, (locX | 0), (locY | 0), (fontSize | 0), FighterEngine.uiRoundFillColor, FighterEngine.uiRoundOutlineColor);
        } else if (this.#uiRoundText != "") {
            this.DrawPixelText(this.#ctx, this.#uiRoundText, (this.#uiRoundAfterLoc.x | 0), (this.#uiRoundAfterLoc.y | 0), (FighterEngine.uiRoundAfterSize | 0), FighterEngine.uiRoundFillColor, FighterEngine.uiRoundOutlineColor);
        }

        if (this.#uiFightTimer > 0) {
            const t = FighterEngine.defaultUiFightTimer - this.#uiFightTimer;
            const third = FighterEngine.defaultUiFightTimer / 3;
            let fontSize = 0;

            if (t <= third) {
                const percent = t / third;
                fontSize = FighterEngine.uiRoundSize * percent;

            } else if (t <= 2 * third) {
                fontSize = FighterEngine.uiRoundSize;
            } else {
                const percent = (t - 2 * third) / third;
                fontSize = FighterEngine.uiRoundSize * (1 - percent);
            }

            this.DrawPixelText(this.#ctx, "Fight!", (this.#uiRoundLoc.x | 0), (this.#uiRoundLoc.y | 0), (fontSize | 0), FighterEngine.uiFightFillColor, FighterEngine.uiFightOutlineColor);
        } else if (this.#uiWinnerTimer > 0) {
            const t = FighterEngine.defaultUiWinnerTimer - this.#uiWinnerTimer;
            const stopGrowing = FighterEngine.defaultUiWinnerTimer / 2;
            let fontSize = 0;

            if (t <= stopGrowing) {
                const percent = t / stopGrowing;
                fontSize = FighterEngine.uiRoundSize * percent;
            } else {
                fontSize = FighterEngine.uiRoundSize;
            }

            this.DrawPixelText(this.#ctx, this.#uiWinnerText, (this.#uiRoundLoc.x | 0), (this.#uiRoundLoc.y | 0), (fontSize | 0), FighterEngine.uiWinnerFillColor, FighterEngine.uiWinnerOutlineColor);
        }

        if (this.#gameState === "MENU" || this.#gameState === "PAUSED") {
            this.#mainMenu.Draw(this.#ctx);
        }

        if (this.#fadeAlpha > 0) {
            this.#ctx.save();
            this.#ctx.globalAlpha = this.#fadeAlpha;
            this.#ctx.fillStyle = this.#fadeColor;
            this.#ctx.fillRect(0, 0, this.#canvas.width, this.#canvas.height);
            this.#ctx.restore();
        }

        this.#ctx.restore();
    }

    DestroyObject(obj) {
        const index = this.#objects.indexOf(obj);
        if (index !== -1) {
            this.#objects[index] = null;
            this.#objects.splice(index, 1);
        }
    }

    SetGameState(state, mode = -1) {
        // States = MENU INTRO PRE_ROUND FIGHTING POS_ROUND GAME_OVER PAUSED
        // Modes = CAREER VERSUS_LOCAL VERSUS_HOST VERSUS_CLIENT
        switch (state) {
            case 0:
            case "MENU":
                this.#gameState = "MENU";
                mode = -1;

                if (this.#peer || this.#socket) this.Disconnect();

                this.#mainMenu.Reset();
                this.#fighter0.Reset();
                this.#fighter1.Reset();

                this.#rounds = 0;
                this.#scoreF0 = 0;
                this.#scoreF1 = 0;

                this.#uiRoundText = "";
                break;
            case 1:
            case "INTRO":
                this.#gameState = "INTRO";
                mode = 0;

                this.#canvas.style.cursor = "none";
                break;
            case 2:
            case "PRE_ROUND":
                this.#gameState = "PRE_ROUND";
                this.StartRound();

                this.#canvas.style.cursor = "none";
                break;
            case 3:
            case "FIGHTING":
                this.#gameState = "FIGHTING";

                this.#canvas.style.cursor = "none";
                break;
            case 4:
            case "POS_ROUND":
                this.#gameState = "POS_ROUND";

                this.#canvas.style.cursor = "none";
                break;
            case 5:
            case "GAME_OVER":
                this.#gameState = "GAME_OVER";

                this.#canvas.style.cursor = "none";
                break;
            case 6:
            case "PAUSED":
                this.#mainMenu.fadeTimer = Menu.defaultFadeTimer;
                this.#mainMenu.fadeDirection = -1;

                this.#prevGameState = this.#gameState;
                this.#gameState = "PAUSED";
                this.#mainMenu.Reset();
                this.#mainMenu.ToMenu(6);
                break;
        }

        if (mode >= 0) {
            this.DestroyObject(this.#ctrl0);
            this.DestroyObject(this.#ctrl1);

            switch (mode) {
                case 0:
                case "CAREER":
                    this.#gameMode = "CAREER";

                    this.#ctrl0 = new Controller(this, this.#fighter0, 2);
                    this.#objects.push(this.#ctrl0);
                    this.#ctrl1 = new AIController(this, this.#fighter1);
                    this.#objects.push(this.#ctrl1);
                    break;
                case 1:
                case "VERSUS_LOCAL":
                    this.#gameMode = "VERSUS_LOCAL";

                    this.#ctrl0 = new Controller(this, this.#fighter0, 0);
                    this.#objects.push(this.#ctrl0);
                    this.#ctrl1 = new Controller(this, this.#fighter1, 1);
                    this.#objects.push(this.#ctrl1);
                    break;
                case 2:
                case "VERSUS_HOST":
                    this.#gameMode = "VERSUS_HOST";

                    this.#ctrl0 = new Controller(this, this.#fighter0, 2);
                    this.#objects.push(this.#ctrl0);
                    this.#ctrl1 = new Controller(this, this.#fighter1, 0, true);
                    this.#objects.push(this.#ctrl1);
                    break;
                case 3:
                case "VERSUS_CLIENT":
                    this.#gameMode = "VERSUS_CLIENT";

                    this.#ctrl0 = new Controller(this, this.#fighter1, 2);
                    this.#objects.push(this.#ctrl0);
                    this.#ctrl1 = new Controller(this, this.#fighter0, 0, true);
                    this.#objects.push(this.#ctrl1);
                    break;
            }

            this.#ctrl0.Begin();
            this.#ctrl1?.Begin();
        }
    }

    SlowTime(scale = 0.1, duration = 50) {
        this.#timeScale = scale;
        this.#timeScaleTimer = duration / 1000;
    }

    StartRound() {
        if (this.#rounds == FighterEngine.maxRounds || this.#scoreF0 == FighterEngine.maxRounds - 1 || this.#scoreF1 == FighterEngine.maxRounds - 1) {
            return this.GameOver();
        }

        this.#fighter0.Reset();
        this.#fighter1.Reset();

        this.#uiRoundTimer = FighterEngine.defaultUiRoundTimer;
        this.#uiRoundText = `Round ${this.#rounds + 1}`;

        this.#rounds++;
    }

    async RoundOver(loser) {
        if (!loser || (loser != this.#fighter0 && loser != this.#fighter1)) return;

        const winner = loser == this.#fighter0 ? this.#fighter1 : this.#fighter0;

        this.#ctrl0.Reset();
        this.#ctrl1?.Reset();

        this.SetGameState(4);
        this.#uiRoundText = ``;

        if (this.isHost) this.#roundOverTrigger = loser == this.#fighter0 ? 1 : 2;

        await FighterEngine.wait(50);

        this.#uiWinnerTimer = FighterEngine.defaultUiWinnerTimer;
        this.#uiWinnerText = `${loser == this.#fighter0 ? "P2" : "P1"} Wins!`;

        winner.Celebrate();

        if (loser == this.fighter0) this.#scoreF1++;
        else if (loser == this.fighter1) this.#scoreF0++;

        await FighterEngine.wait(400);
        this.#timeScale = 0.1;

        await FighterEngine.wait(400);
        this.Fade("#000", 500);
        await FighterEngine.wait(1200);
        this.SetGameState(2);

        this.#timeScale = 1;
        this.Fade("#000", 500, -1);
    }

    async GameOver() {
        this.SetGameState(5);
        this.#uiGameOverTimer = FighterEngine.defaultUiGameOverTimer;

        await FighterEngine.wait(5000);
        this.Fade("#000", 500);
        await FighterEngine.wait(1200);
        this.SetGameState(0);
        if (this.isOnline) this.Disconnect();

        this.Fade("#000", 500, -1);
    }

    async Resume() {
        this.#mainMenu.fadeTimer = Menu.defaultFadeTimer;
        this.#mainMenu.fadeDirection = 1;
        await FighterEngine.wait(Menu.defaultFadeTimer * 1000);
        this.SetGameState(this.#prevGameState);
    }


    get sessionCode() { return this.#sessionCode; }

    #connectSignaling(callback) {
        if (this.#socket) return;
        this.#socket = io(FighterEngine.serverURL);

        this.#socket.on("connect", callback);

        this.#socket.on("signal", data => {
            if (this.#peer && !this.#peer.destroyed) {
                this.#peer.signal(data.signal);
            }
        });

        this.#socket.on("disconnect", () => {
            if (!this.#peer?.connected) this.Disconnect();
        });
    }

    #initPeer(initiator, targetId, gameStateMode) {
        const p = new SimplePeer({ initiator, trickle: false });

        p.on("signal", signal => {
            this.#socket.emit("signal", { to: targetId, signal });
            console.log("signal p");
        });

        p.on("connect", () => {
            console.log("connect p");
            this.#mainMenu.StartGame(gameStateMode);
        });

        p.on("data", rawData => {
            try {
                const data = JSON.parse(rawData);

                const newF = data.f;
                const oldF = this.#lastReceivedFrame;

                const isNewer = (newF > oldF) || (oldF - newF > 200);

                this.#lastReceivedFrame = newF;
                this.#remoteStateBuffer = data;

                console.log("data p", data);
            } catch (e) {
                console.error("Failed to parse network packet", e);
            }
        });

        p.on("close", () => this.Disconnect());
        p.on("error", (a) => {
            console.log("error p", a);
            this.Disconnect()
        });

        this.#peer = p;
        return p;
    }

    async Host() {
        this.#connectSignaling(() => this.#socket.emit("create-session"));

        this.#socket.on("session-created", code => this.#sessionCode = code);

        this.#socket.on("player-joined", playerId => {
            this.#initPeer(true, playerId, 2);
        });
    }

    async Join(code) {
        if (!code) return;
        this.#connectSignaling(() => this.#socket.emit("join-session", code));

        this.#socket.once("signal", data => {
            if (!this.#peer) {
                const p = this.#initPeer(false, data.from, 3);
                p.signal(data.signal);

                this.#socket.on("signal", d => p.signal(d.signal));
            }
        });
    }

    Disconnect() {
        if (this.#peer) {
            this.#peer.destroy();
            this.#peer = null;
        }

        if (this.#socket) {
            this.#socket.off("signal");
            this.#socket.off("player-joined");
            this.#socket.disconnect();
            this.#socket = null;
        }

        this.#sessionCode = null;
        this.SetGameState(0);
    }


    DrawPixelText(ctx, text, x, y, size = 5, fillColor = "#fff", outlineColor = "#000") {
        if (!this.#redFontSheet || !this.#greenFontSheet || size <= 0) return;

        const srcSize = { w: 8, h: 8 };
        const outSize = { w: (size * (srcSize.w / srcSize.h)) | 0, h: size };

        const spacing = 0;
        const spaceWidth = (outSize.w / 3) | 0;

        const rows = ["ABCDEFGHIJKLMNOPQRSTUVWXYZ", "0123456789.!?_"]

        let totalWidth = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text[i].toUpperCase();
            totalWidth += (char === " ") ? spaceWidth : outSize.w;
            if (i < text.length - 1) totalWidth += spacing;
        }

        let currentX = (x - totalWidth / 2) | 0;

        FighterEngine.tCanvas.width = outSize.w;
        FighterEngine.tCanvas.height = outSize.h;
        FighterEngine.tCtx.imageSmoothingEnabled = false;

        for (let i = 0; i < text.length; i++) {
            if (i != 0) currentX += spacing;
            const char = text[i].toUpperCase();

            if (char === " ") {
                currentX += spaceWidth;
                continue;
            }

            let index = -1;
            let row = -1;
            do {
                row++;
                index = rows[row].indexOf(char);
            } while (index === -1 && row != rows.length - 1);

            if (index === -1) continue;

            let s = { x: index * srcSize.w, y: row * srcSize.h };

            const drawLayer = (sheet, color) => {
                FighterEngine.tCtx.clearRect(0, 0, outSize.w, outSize.h);
                FighterEngine.tCtx.globalCompositeOperation = "source-over";

                FighterEngine.tCtx.drawImage(
                    sheet,
                    s.x, s.y, srcSize.w, srcSize.h,
                    0, 0,
                    outSize.w, outSize.h
                );

                FighterEngine.tCtx.globalCompositeOperation = "source-in";
                FighterEngine.tCtx.fillStyle = color;
                FighterEngine.tCtx.fillRect(0, 0, outSize.w, outSize.h);

                ctx.drawImage(FighterEngine.tCanvas, currentX, (y | 0));
            };
            
            drawLayer(this.#greenFontSheet, fillColor);
            drawLayer(this.#redFontSheet, outlineColor);

            currentX += outSize.w;
        }
    }

    CameraShake(intensity = 5, duration = 300) {
        this.#shakeIntensity = intensity;
        this.#shakeDuration = duration / 1000;
        this.#shakeTimer = this.#shakeDuration;
    }

    Fade(color = "#000", duration = 500, direction = 1) {
        this.#fadeColor = color;
        this.#fadeDuration = duration / 1000;
        this.#fadeTimer = 0;
        this.#fadeDirection = direction;
        this.#fadeAlpha = 0;
    }

    static extractChannelMask(image, channel = "r") {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = image.width;
        canvas.height = image.height;

        ctx.drawImage(image, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        const ch =
            channel === "r" ? 0 :
            channel === "g" ? 1 :
            channel === "b" ? 2 :
            0;

        for (let i = 0; i < data.length; i += 4) {
            const value = data[i + ch];

            if (value > 0) {
                data[i] = 255;
                data[i + 1] = 255;
                data[i + 2] = 255;
                data[i + 3] = 255;
            } else {
                data[i + 3] = 0;
            }
        }

        ctx.putImageData(imgData, 0, 0);

        return canvas;
    }

    static wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}
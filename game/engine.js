import { AIController } from "./ai.js";
import { Controller } from "./controller.js";
import { Fighter } from "./fighter.js";
import { Menu } from "./menu.js";
import { NetworkManager } from "./network.js";

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

    static barImage = Object.assign(new Image(), { src: "assets/bar.png" });
    static barImageSize = { w: 128, h: 80 };
    #barFrame = 0;
    static defaultBarAnimTimer = 35 / 60;
    static maxBarAnimState = 2;
    #barAnimState = 0;
    #barAnimTimer = FighterEngine.defaultBarAnimTimer;

    #mainMenu = null;
    #fighter0 = null;
    #fighter1 = null;
    #ctrl0 = null;
    #ctrl1 = null;

    #gameState;
    #gameMode;
    #gamePaused = false;
    static maxRounds = 3;
    #rounds = 0;
    #scoreF0 = 0;
    #scoreF1 = 0;

    static IntroSheet = Object.assign(new Image(), { src: "assets/intro.png" });
    static frameStamp = [ 1, 1.15, 1.3, 1.45, 1.6, 3, 3.05, 3.1, 3.15, 3.2, 3.25, 4.75, 6, 6.15, 6.3, 6.45, 6.6, 7.1 ];
    #introTimer = 0;
    static maxIntroFramesLine = 6;
    static maxIntroState = 18;
    #introState = 0;

    #network = new NetworkManager(this);
    #currentFrame = 0;
    #delayedGameStart = { state: null, frames: -1 };

    #isSimulationLocked = false;
    #lockTimer = 0;
    #lockRecoveryCooldownTimer = 0;
    #lockRecoveryAttempts = 0;
    static lockRecoveryTimeout = 1.5;
    static lockRecoveryCooldown = 1.5;
    static maxLockRecoveryAttempts = 4;

    static uiSheet = Object.assign(new Image(), { src: "assets/ui_sheet.png" });
    #redFontSheet = null;
    #greenFontSheet = null;
    static tCanvas = document.createElement("canvas");
    static tCtx = FighterEngine.tCanvas.getContext("2d");

    static defaultUiGameOverTimer = .25;
    #uiGameOverTimer = 0;

    static defaultUiCreditsTimer = 8;
    #uiCreditsTimer = 0;
    static uiCreditsSize = 12;
    #uiCreditsLocY = 0;

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

    #pendingWaits = [];

    #audioCtx = null;
    static soundUrls = [
        "assets/ui.wav",
        "assets/punch_1.wav",
        "assets/punch_2.wav",
        "assets/hit_1.wav",
        "assets/hit_2.wav",
        "assets/groan_1.wav",
        "assets/groan_2.wav",
        "assets/jump_1.wav",
        "assets/jump_2.wav",
    ]
    #soundBuffers = [];
    #volume = .5;

    constructor() { }

    get gameState() { return this.#gameState; }
    get gameMode() { return this.#gameMode; }
    get gamePaused() { return this.#gamePaused; }

    get gravity() { return FighterEngine.gravity; }
    get friction() { return FighterEngine.friction; }
    get groundY() { return this.#groundY; }
    get worldWidth() { return this.#worldWidth; }

    get canvasSize() { return this.#canvasSize; }
    get canvas() { return this.#canvas; }

    get isHost() { return this.#gameMode === "VERSUS_HOST"; }
    get isOnline() { return (this.isHost || this.#gameMode === "VERSUS_CLIENT"); }
    isFighterLocal(fighter)  { return this.#ctrl0.pawn === fighter; }
    get networkStatus() { return this.#network.status; }
    get isGameLocked() { return this.#isSimulationLocked; }

    get fighter0() { return this.#fighter0; }
    get fighter1() { return this.#fighter1; }
    getOpponent(fighter) { return this.fighter0 === fighter ? this.fighter1 : this.fighter0; }
    get ctrl0() { return this.#ctrl0; }
    get ctrl1() { return this.#ctrl1; }
    get mainMenu() { return this.#mainMenu; }

    getScore(fighter) { return fighter === this.#fighter0 ? this.#scoreF0 : this.#scoreF1; }

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

        this.#audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.#preloadSounds();

        window.onbeforeunload = () => {
            this.Disconnect();
        };

        const handleAutoPause = () => {
            if (!this.isOnline && !this.#gamePaused && this.#gameState !== "MENU") {
                this.Pause();
            }
        };

        window.addEventListener("blur", handleAutoPause);
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) handleAutoPause();
        });
    }

    Tick(deltaTime) {
        for (let i = this.#pendingWaits.length - 1; i >= 0; i--) {
            this.#pendingWaits[i].time -= deltaTime;
            if (this.#pendingWaits[i].time <= 0) {
                this.#pendingWaits[i].resolve();
                this.#pendingWaits.splice(i, 1);
            }
        }

        if (this.#gameState === "MENU" || this.#gamePaused) {
            this.#mainMenu.Tick(deltaTime);
        }

        if (this.#delayedGameStart.frames >= 0 && this.#delayedGameStart.state != null) {
            this.#delayedGameStart.frames--;
            if (this.#delayedGameStart.frames <= 0) {
                this.#mainMenu.StartGame(this.#delayedGameStart.state);
                this.#delayedGameStart.state = null;
                this.#delayedGameStart.frames = -1
            }
        }

        let isSimulationLocked = false;

        if (this.isOnline) {
            // Read inputs & send to the future!
            this.#ctrl0.ReadInputs();
            let localMask = this.#ctrl0.GetInputMask();
            if (this.#gameState !== "FIGHTING" || this.#gamePaused) localMask = 0;
            const targetFrame = (this.#currentFrame + Controller.delayFrames) >>> 0;

            this.#ctrl0.QueueInput(targetFrame, localMask);
            // also send the a zero out mask to the other client when paused
            this.#network.SendInput(targetFrame, localMask);

            // Fetch both inputs for the current frame
            const p1Input = this.#ctrl0.GetInputForFrame(this.#currentFrame);
            const p2Input = this.#ctrl1.GetInputForFrame(this.#currentFrame);

            // If either packet is missing, wait
            if (p1Input === undefined || p2Input === undefined) {
                isSimulationLocked = true;
            } else {
                this.#ctrl0.ApplyMask(p1Input);
                this.#ctrl1.ApplyMask(p2Input);

                this.#ctrl0.ClearInput(this.#currentFrame);
                this.#ctrl1.ClearInput(this.#currentFrame);
            }

            this.#isSimulationLocked = isSimulationLocked;

            if (isSimulationLocked) {
                this.#lockTimer += deltaTime;
                if (this.#lockRecoveryCooldownTimer > 0) this.#lockRecoveryCooldownTimer -= deltaTime;

                if (this.#lockTimer >= FighterEngine.lockRecoveryTimeout && this.#lockRecoveryCooldownTimer <= 0) {
                    this.#lockTimer = 0;
                    this.#lockRecoveryCooldownTimer = FighterEngine.lockRecoveryCooldown;
                    this.#lockRecoveryAttempts++;

                    if (this.#lockRecoveryAttempts > FighterEngine.maxLockRecoveryAttempts) {
                        this.Disconnect();
                    } else {
                        this.#network.RequestFullStateRecovery();
                    }
                }
            } else {
                this.#lockTimer = 0;
                this.#lockRecoveryAttempts = 0;
            }
        } else {
            // Offline Mode: Instantly tick controllers
            if (this.#gameState === "FIGHTING" && !this.#gamePaused) {
                this.#ctrl0?.Tick(deltaTime);
                this.#ctrl1?.Tick(deltaTime);
            } else {
                // Just read inputs so Pause button still works
                this.#ctrl0?.ReadInputs();
                if (this.#ctrl1 instanceof Controller) this.#ctrl1.ReadInputs();
            }
        }

        if (!isSimulationLocked) {
            if (this.#timeScaleTimer >= 0 && this.#timeScaleTimer != undefined) {
                this.#timeScaleTimer -= deltaTime;
                if (this.#timeScaleTimer <= 0) {
                    this.#timeScale = 1;
                }
            }
            const activeDeltaTime = deltaTime * (this.#gamePaused && !this.isOnline ? 0 : this.#timeScale);

            // Only tick objects if the simulation is unlocked
            for (let i = this.#objects.length - 1; i >= 0; i--) {
                const obj = this.#objects[i];
                // Skip controllers
                if (!(obj instanceof Controller || obj instanceof AIController)) {
                    obj.Tick(activeDeltaTime);
                }
            }

            if (this.isOnline || (this.#gameState === "FIGHTING" && !this.#gamePaused)) {
                this.#currentFrame = (this.#currentFrame + 1) >>> 0;
            }
        }

        // Bar Animation
        this.#barAnimTimer -= deltaTime;
        if (this.#barAnimTimer <= 0) {
            this.#barAnimState = (this.#barAnimState == FighterEngine.maxBarAnimState - 1 && Math.random() > .6) ? 2 : (this.#barAnimState + 1) % FighterEngine.maxBarAnimState;
            this.#barAnimTimer += FighterEngine.defaultBarAnimTimer;
        }

        // Intro
        if (this.#gameState === "INTRO") {
            this.#introTimer += deltaTime;

            const currentFrameMaxTime = FighterEngine.frameStamp[this.#introState];

            if (this.#introTimer >= currentFrameMaxTime) {
                if (this.#introState === FighterEngine.maxIntroState - 1) {
                    this.Fade("#000", 500);
                    this.#introState++;
                } 
                else if (this.#introState < FighterEngine.maxIntroState - 1) {
                    this.#introState++;
                }
            }

            if (this.#introState == 16) {
                this.CameraShake(5, 150);
            }

            if (this.#introState >= FighterEngine.maxIntroState && this.#fadeTimer >= this.#fadeDuration) {
                this.SetGameState(2); 
                this.Fade("#000", 500, -1);
            }
        }

        if (this.#uiGameOverTimer > 0 && this.#gameState === "GAME_OVER") {
            this.#uiGameOverTimer -= deltaTime;
        }

        if (this.#uiCreditsTimer > 0) {
            this.#uiCreditsTimer -= deltaTime;

            if (this.#uiCreditsTimer <= 0) {
                this.SetGameState(0);
                this.Fade("#000", 500, -1);
            }
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

        if (this.#uiWinnerTimer > 0 && this.#gameState === "POS_ROUND") {
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

        if (this.#gameState === "INTRO") {
            const totalColumns = FighterEngine.maxIntroFramesLine;
            const totalRows = Math.ceil(FighterEngine.maxIntroState / totalColumns);

            const frameWidth = FighterEngine.IntroSheet.width / totalColumns;
            const frameHeight = FighterEngine.IntroSheet.height / totalRows;

            const colIndex = this.#introState % totalColumns;
            const rowIndex = Math.floor(this.#introState / totalColumns);

            let frameCoords = {
                x: colIndex * frameWidth,
                y: rowIndex * frameHeight
            };

            this.#ctx.drawImage(FighterEngine.IntroSheet, (frameCoords.x | 0), (frameCoords.y | 0), (frameWidth | 0), (this.#canvasSize.h | 0), 0, 0, (this.#canvasSize.w | 0), (this.#canvasSize.h | 0));
        } else if (this.#gameState === "CREDITS") {
            this.#ctx.fillStyle = "#000000";
            this.#ctx.fillRect(0, 0, this.#canvas.width, this.#canvas.height);
        } else if (this.#gameState === "GAME_OVER") {
            this.#ctx.fillStyle = "#000000";
            this.#ctx.fillRect(0, 0, this.#canvas.width, this.#canvas.height);

            const fighterMidX = (this.#fighter0.loc.x + this.#fighter1.loc.x) / 2 + (this.#fighter0.size.w / 2);
            scrollX = (this.#canvas.width / 4) - fighterMidX;
        } else if (FighterEngine.barImage && FighterEngine.barImage.complete) {
            const scale = this.#canvasSize.h / FighterEngine.barImageSize.h;
            this.#worldWidth = FighterEngine.barImageSize.w * scale;

            const fighterMidX = (this.fighter0.loc.x + this.fighter1.loc.x) / 2 + this.fighter0.size.w / 2;
            const viewPercent = Math.max(0, Math.min(1, fighterMidX / this.#canvasSize.w));

            const extraWidth = this.#worldWidth - this.#canvasSize.w;
            scrollX = -(extraWidth * viewPercent);

            let frameCoords = { x: 0, y: FighterEngine.barImageSize.h * this.#barFrame };

            // Bar Animation
            switch (this.#barAnimState) {
                case 0:
                    frameCoords.x = 0;
                    break;
                case 1:
                    frameCoords.x = FighterEngine.barImageSize.w;
                    break;
                case 2:
                    frameCoords.x = FighterEngine.barImageSize.w * 2;
                    break;
            }

            this.#ctx.drawImage(FighterEngine.barImage, frameCoords.x, frameCoords.y, FighterEngine.barImageSize.w, FighterEngine.barImageSize.h, (scrollX | 0), 0, (this.#worldWidth | 0), (this.#canvasSize.h | 0));
        }

        this.#ctx.save();
        this.#ctx.translate((scrollX | 0), 0);

        if (this.#gameState !== "CREDITS" && this.#gameState !== "INTRO") {
            for (let i = 0; i < this.#objects.length; i++) {
                this.#objects[i].Draw(this.#ctx);
            }
        }

        this.#ctx.restore();

        // Foreground
        if (this.#gameState !== "GAME_OVER" && this.#gameState !== "CREDITS" && this.#gameState !== "INTRO" && FighterEngine.barImage && FighterEngine.barImage.complete) {
            this.#ctx.drawImage(FighterEngine.barImage, FighterEngine.barImageSize.w * 3, this.#barFrame * FighterEngine.barImageSize.h, FighterEngine.barImageSize.w, FighterEngine.barImageSize.h, (scrollX | 0), 0, (this.#worldWidth | 0), (this.#canvasSize.h | 0));
        }

        for (let i = 0; i < this.#objects.length; i++) {
            if (this.#objects[i].DrawUI) this.#objects[i].DrawUI(this.#ctx);
        }

        this.#ctx.restore();
        this.#ctx.save();

        if (this.#gameState === "CREDITS") {
            let fontSize1 = FighterEngine.uiCreditsSize;
            let fontSize2 = FighterEngine.uiRoundAfterSize;

            const progress = 1 - (this.#uiCreditsTimer / FighterEngine.defaultUiCreditsTimer);

            let Y = this.#uiCreditsLocY + ((this.#uiCreditsLocY * -2) - this.#uiCreditsLocY) * progress;

            const growPercent = Math.min(1, progress / (1/4/2/2/2));
            fontSize1 *= growPercent;
            fontSize2 *= growPercent;

            this.DrawPixelText(this.#ctx, "Game by", (this.#uiRoundLoc.x | 0), (Y | 0), (fontSize2 | 0), FighterEngine.uiRoundFillColor, "#00000000");
            this.DrawPixelText(this.#ctx, "dig0w", (this.#uiRoundLoc.x | 0), (Y + 15 | 0), (fontSize1 | 0), FighterEngine.uiRoundFillColor, "#00000000");

            this.DrawPixelText(this.#ctx, "Logo by", (this.#uiRoundLoc.x | 0), (Y + 75 | 0), (fontSize2 | 0), FighterEngine.uiRoundFillColor, "#00000000");
            this.DrawPixelText(this.#ctx, "Rift", (this.#uiRoundLoc.x | 0), (Y + 90 | 0), (fontSize1 | 0), FighterEngine.uiRoundFillColor, "#00000000");

            this.DrawPixelText(this.#ctx, "Special Thanks to", (this.#uiRoundLoc.x | 0), (Y + 150 | 0), (fontSize2 | 0), FighterEngine.uiRoundFillColor, "#00000000");
            this.DrawPixelText(this.#ctx, "Dogo, Mewy", (this.#uiRoundLoc.x | 0), (Y + 165 | 0), (fontSize1 | 0), FighterEngine.uiRoundFillColor, "#00000000");
        } else if (this.#gameState === "GAME_OVER") {
            let fontSize = FighterEngine.uiRoundSize;
            if (this.#uiGameOverTimer > 0) {
                const percent = this.#uiGameOverTimer / FighterEngine.defaultUiGameOverTimer;
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
        } else if (this.#uiWinnerTimer > 0 && this.#gameState === "POS_ROUND") {
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

        if (this.isOnline && this.#isSimulationLocked && this.#gameState === "FIGHTING") {
            this.DrawPixelText(this.#ctx, "Syncing...", (this.#uiRoundLoc.x | 0), (this.#canvas.height - 16 | 0), FighterEngine.uiRoundAfterSize, FighterEngine.uiRoundFillColor, "#00000000");
        }

        if (this.#gameState === "MENU" || this.#gamePaused) {
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
        // States = MENU INTRO PRE_ROUND FIGHTING POS_ROUND GAME_OVER CREDITS
        // Modes = CAREER VERSUS_LOCAL VERSUS_HOST VERSUS_CLIENT
        if (mode >= 0) {
            this.DestroyObject(this.#ctrl0);
            this.DestroyObject(this.#ctrl1);

            switch (mode) {
                case 0:
                case "MAIN":
                    this.#gameMode = "MAIN";
                    this.#ctrl0 = new Controller(this, this.#fighter0, 2, 0);
                    this.#objects.push(this.#ctrl0);
                    this.#ctrl1 = new AIController(this, this.#fighter1, .8);
                    this.#objects.push(this.#ctrl1);
                    break;
                case 1:
                case "VERSUS_LOCAL":
                    this.#gameMode = "VERSUS_LOCAL";
                    this.#ctrl0 = new Controller(this, this.#fighter0, 0, 0);
                    this.#objects.push(this.#ctrl0);
                    this.#ctrl1 = new Controller(this, this.#fighter1, 1, 1);
                    this.#objects.push(this.#ctrl1);
                    break;
                case 2:
                case "VERSUS_HOST":
                    this.#gameMode = "VERSUS_HOST";
                    this.#ctrl0 = new Controller(this, this.#fighter0, 2, 0);
                    this.#objects.push(this.#ctrl0);
                    this.#ctrl1 = new Controller(this, this.#fighter1, 0, 1, true);
                    this.#objects.push(this.#ctrl1);
                    break;
                case 3:
                case "VERSUS_CLIENT":
                    this.#gameMode = "VERSUS_CLIENT";
                    this.#ctrl0 = new Controller(this, this.#fighter1, 2, 0);
                    this.#objects.push(this.#ctrl0);
                    this.#ctrl1 = new Controller(this, this.#fighter0, 0, 1, true);
                    this.#objects.push(this.#ctrl1);
                    break;
            }

            this.#ctrl0?.Begin();
            this.#ctrl1?.Begin();
        }

        switch (state) {
            case 0:
            case "MENU":
                this.#gameState = "MENU";
                this.#gamePaused = false;

                if (this.#network.hasConnection) this.Disconnect();

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

                this.#canvas.style.cursor = "none";

                this.#introTimer = 0;
                this.#introState = 0;
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
            case "CREDITS":
                this.#gameState = "CREDITS";

                this.#canvas.style.cursor = "none";

                this.#uiCreditsTimer = FighterEngine.defaultUiCreditsTimer;
                this.#uiCreditsLocY = this.#canvas.height;
                break;
        }
    }

    SlowTime(scale = 0.1, duration = 50) {
        this.#timeScale = scale;
        this.#timeScaleTimer = duration / 1000;
    }

    StartRound() {
        if (this.#rounds == FighterEngine.maxRounds || ((this.#scoreF0 == FighterEngine.maxRounds - 1 || this.#scoreF1 == FighterEngine.maxRounds - 1) && this.#gameMode !== "MAIN")) {
            return this.GameOver();
        }

        this.#fighter0.Reset();
        this.#fighter1.Reset();

        this.#uiRoundTimer = FighterEngine.defaultUiRoundTimer;
        this.#uiRoundText = `Round ${this.#rounds + 1}`;

        if (this.#gameMode === "MAIN") this.#barFrame = this.#rounds;

        this.#ctrl0?.ClearAllInputs();
        if (this.#ctrl1 instanceof Controller) this.#ctrl1.ClearAllInputs();
        this.#currentFrame = 0;

        if (this.isOnline) {
            for (let i = 0; i < Controller.delayFrames; i++) {
                this.#ctrl0.QueueInput(i, 0);
                this.#ctrl1.QueueInput(i, 0);
            }
        }

        this.#rounds++;
    }

    async RoundOver(loser) {
        if (!loser || (loser != this.#fighter0 && loser != this.#fighter1)) return;

        const winner = loser == this.#fighter0 ? this.#fighter1 : this.#fighter0;

        this.#ctrl0.Reset();
        this.#ctrl1?.Reset();

        this.SetGameState(4);
        this.#uiRoundText = ``;

        await this.Wait(50);
        if (this.#gameState !== "POS_ROUND") return;

        this.#uiWinnerTimer = FighterEngine.defaultUiWinnerTimer;
        this.#uiWinnerText = this.#gameMode === "MAIN" ? (loser == this.#fighter0 ? "You Lost!" : "You Won!") : `${loser == this.#fighter0 ? "P2" : "P1"} Wins!`;

        winner.Celebrate();

        if (loser == this.fighter0) this.#scoreF1++;
        else if (loser == this.fighter1) this.#scoreF0++;

        await this.Wait(400);
        if (this.#gameState !== "POS_ROUND") return;
        this.#timeScale = 0.1;

        await this.Wait(400);
        if (this.#gameState !== "POS_ROUND") {
            this.#timeScale = 1;
            return;
        }
        this.Fade("#000", 500);
        await this.Wait(1200);
        if (this.#gameState !== "POS_ROUND") {
            this.Fade("#000", 0, -1);
            return;
        }
        this.SetGameState(2);

        this.#timeScale = 1;
        this.Fade("#000", 500, -1);
    }

    async GameOver() {
        this.SetGameState(5);
        this.#uiGameOverTimer = FighterEngine.defaultUiGameOverTimer;

        await this.Wait(4000);
        if (this.#gameState !== "GAME_OVER") return;
        this.Fade("#000", 500);
        await this.Wait(1200);
        if (this.#gameState !== "GAME_OVER") {
            this.Fade("#000", 0, -1);
            return;
        }
        if (this.#gameMode !== "MAIN") this.SetGameState(0);
        else this.SetGameState(6);
        if (this.isOnline) this.Disconnect();

        this.Fade("#000", 500, -1);
    }

    Pause() {
        this.#mainMenu.fadeTimer = Menu.defaultFadeTimer;
        this.#mainMenu.fadeDirection = -1;

        this.#gamePaused = true;
        this.#mainMenu.Reset();
        this.#mainMenu.ToMenu(6);
    }

    async Resume() {
        this.#mainMenu.fadeTimer = Menu.defaultFadeTimer;
        this.#mainMenu.fadeDirection = 1;
        await this.Wait(Menu.defaultFadeTimer * 1000);

        this.#gamePaused = false;
    }


    async #preloadSounds() {
        for (let i = 0; i < FighterEngine.soundUrls.length; i++) {
            try {
                const response = await fetch(FighterEngine.soundUrls[i]);
                const arrayBuffer = await response.arrayBuffer();

                this.#soundBuffers[i] = await this.#audioCtx.decodeAudioData(arrayBuffer);
            } catch (err) {
                console.error(`Failed to load sound: ${FighterEngine.soundUrls[i]}`, err);
            }
        }
    }

    PlaySound(index, pitch = 1.0, volume = 1) {
        const buffer = this.#soundBuffers[index];
        if (!buffer) return;

        if (this.#audioCtx.state === "suspended") {
            this.#audioCtx.resume();
        }

        const source = this.#audioCtx.createBufferSource();
        source.buffer = buffer;

        const gainNode = this.#audioCtx.createGain();
        gainNode.gain.value = this.#volume * volume;

        source.playbackRate.value = pitch;

        source.connect(gainNode);
        gainNode.connect(this.#audioCtx.destination);

        source.start(0);
    }


    get sessionCode() { return this.#network.sessionCode; }
    Host() { this.#network.Host(); }
    Join(code) { this.#network.Join(code); }
    Disconnect() { this.#network.Disconnect(); }
    SetDelayedGameStart(gameStateMode, delayFrames) { this.#delayedGameStart.state = gameStateMode; this.#delayedGameStart.frames = delayFrames; }
    loadLibs() { return this.#network.loadLibs(); }

    // Captures everything needed to reconstruct the match
    SerializeState() {
        return {
            frame: this.#currentFrame,
            gameState: this.#gameState,
            rounds: this.#rounds,
            scoreF0: this.#scoreF0,
            scoreF1: this.#scoreF1,
            delayFrames: Controller.delayFrames,
            fighter0: this.#fighter0.SerializeState(),
            fighter1: this.#fighter1.SerializeState()
        };
    }

    // Applies a state
    ApplyFullStateRecovery(state) {
        if (!state || !this.isOnline || !this.#ctrl0 || !this.#ctrl1) return;

        this.#fighter0.ApplyState(state.fighter0);
        this.#fighter1.ApplyState(state.fighter1);

        this.#currentFrame = state.frame >>> 0;
        this.#rounds = state.rounds;
        this.#scoreF0 = state.scoreF0;
        this.#scoreF1 = state.scoreF1;
        Controller.delayFrames = state.delayFrames;

        if (state.gameState) this.#gameState = state.gameState;

        this.#ctrl0.ClearAllInputs();
        this.#ctrl1.ClearAllInputs();
        for (let i = 0; i < Controller.delayFrames; i++) {
            const f = (this.#currentFrame + i) >>> 0;
            this.#ctrl0.QueueInput(f, 0);
            this.#ctrl1.QueueInput(f, 0);
        }

        this.#isSimulationLocked = false;
        this.#lockTimer = 0;
        this.#lockRecoveryCooldownTimer = 0;
        this.#lockRecoveryAttempts = 0;
    }


    DrawPixelText(ctx, text, x, y, size = 5, fillColor = "#fff", outlineColor = "#000") {
        if (!this.#redFontSheet || !this.#greenFontSheet || size <= 0) return;

        const srcSize = { w: 8, h: 8 };
        const outSize = { w: (size * (srcSize.w / srcSize.h)) | 0, h: size };

        const spacing = 0;
        const spaceWidth = (outSize.w / 3) | 0;

        const rows = ["ABCDEFGHIJKLMNOPQRSTUVWXYZ", "0123456789.!?_,"]

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
        ctx.imageSmoothingEnabled = false;

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

                ctx.drawImage(FighterEngine.tCanvas, (currentX | 0), (y | 0));
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

            if (value > 127) {
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

    Wait(ms) { return new Promise(resolve => { this.#pendingWaits.push({ time: ms / 1000, resolve }); }); }
}
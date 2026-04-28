const io = require("socket.io")(3000, {
    cors: {
        origin: "http://127.0.0.1:5500",
        methods: ["GET", "POST"]
    }
});

const sessions = new Map(); // code: [id, timestamp]
const expirationTime = 24 * 60 * 60 * 1000;

io.on("connection", (socket) => {
    socket.on("create-session", () => {
        let code;
        do {
            code = Math.random().toString(36).substring(2, 7).toUpperCase();
        } while (sessions.has(code) && Date.now() - sessions.get(code)[1] < expirationTime);

        sessions.set(code, [socket.id, Date.now()]);
        socket.sessionCode = code;

        socket.join(code);
        console.log("session-created", code, socket.id);
        socket.emit("session-created", code);
    });

    socket.on("join-session", (code) => {
        const cleanCode = code.toUpperCase();
        if (sessions.has(cleanCode)) {
            socket.join(cleanCode);
            console.log("player-joined", cleanCode, socket.id);
            io.to(sessions.get(cleanCode)[0]).emit("player-joined", socket.id);
        } else {
            console.log("Session not found");
            socket.emit("error", "Session not found");
        }
    });

    socket.on("signal", (data) => {
        console.log("signal", socket.id);
        io.to(data.to).emit("signal", { from: socket.id, signal: data.signal });
    });

    socket.on("disconnect", () => {
        if (socket.sessionCode) {
            console.log("session-deleted", socket.sessionCode);
            sessions.delete(socket.sessionCode);
        }
    });

    socket.on("error", (err) => {
        console.error(err);
    });
});
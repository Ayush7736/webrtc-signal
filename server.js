import express from "express";
import { WebSocketServer } from "ws";
import cors from "cors";
import { v4 as uuid } from "uuid";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// HTTP server
const server = app.listen(PORT, () =>
  console.log("Signaling server running on " + PORT)
);

// WebSocket server
const wss = new WebSocketServer({ server });

const rooms = {}; // room → [sockets]

function broadcast(room, data, except) {
  rooms[room]?.forEach((client) => {
    if (client !== except && client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on("connection", (ws) => {
  let currentRoom = null;

  ws.on("message", (msg) => {
    const data = JSON.parse(msg);

    if (data.type === "join") {
      currentRoom = data.room;
      rooms[currentRoom] = rooms[currentRoom] || [];
      rooms[currentRoom].push(ws);
      return;
    }

    // Forward all WebRTC signaling
    if (currentRoom) {
      broadcast(currentRoom, data, ws);
    }
  });

  ws.on("close", () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom] = rooms[currentRoom].filter((c) => c !== ws);

      if (rooms[currentRoom].length === 0) delete rooms[currentRoom];
    }
  });
});

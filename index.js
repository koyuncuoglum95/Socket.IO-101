import express from 'express';
import { createServer } from 'http';
import path from 'path';  // <-- Import the path module
import { Server } from 'socket.io';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { availableParallelism } from 'node:os'
import cluster from 'node:cluster'
import { createAdapter, setupPrimary } from '@socket.io/cluster-adapter';


if (cluster.isPrimary) {
  const numCPUs = availableParallelism();

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork({
      PORT: 3000 + i
    });
  }

  setupPrimary();
}


else {




const db = await open({
    filename: 'chat.db',
    driver: sqlite3.Database
});

await db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_offset TEXT UNIQUE,
    content TEXT
  );
`);

const app = express();
const server = createServer(app);
const io = new Server(server, {
    connectionStateRecovery: {},

    adapter: createAdapter()
})

// Decode the provided path
const decodedPath = decodeURIComponent("C:\\Users\\memo_\\OneDrive\\Masaüstü\\socket-chat-app\\index.html");

app.get('/', (req, res) => {
  // Use the decodedPath here
  res.sendFile(path.resolve(decodedPath));
});

io.on('connection', async (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    // This event send a chat message event
    socket.on('chat message', async (msg) => {
        let result;

        try {
            // store the message in the database
            result = await db.run('INSERT INTO messages (content) VALUES (?)', msg);
        } catch (error) {
          console.log(error);
        }

        console.log('message: ' + msg);
        // This will send message everyone both sender and receiver
        io.emit('chat message', msg, result.lastID);
    });


    if (!socket.recovered) {
      // if the connection state recovery was not successful
      try {
        await db.each('SELECT id, content FROM messages WHERE id > ?',
          [socket.handshake.auth.serverOffset || 0],
          (_err, row) => {
            socket.emit('chat message', row.content, row.id);
          }
        )
      } catch (e) {
        // something went wrong
        console.log(e);
      }
    }



})

const port = process.env.PORT || 3000;

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});

}
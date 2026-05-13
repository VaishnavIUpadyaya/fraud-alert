const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});
let users = [];
let transactions = [];
let alerts = [];
io.on("connection", (socket) => {
    console.log("Client connected");

    socket.on("join_user_room", (user_id) => {
        socket.join(user_id);
        console.log(`User joined room: ${user_id}`);
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });
});

app.post("/users", (req, res) => {
    const { user_id, name } = req.body;

    if (!user_id || !name) {
        return res.status(400).json({
            message: "user_id and name required"
        });
    }

    users.push({
        user_id,
        name
    });

    res.json({
        message: "User created",
        user: { user_id, name }
    });
});

app.post("/transactions", (req, res) => {

    const { txn_id, user_id, amount, location } = req.body;

    const user = users.find(u => u.user_id == user_id);

    if (!user) {
        return res.status(404).json({
            message: "Invalid user_id"
        });
    }

    const transaction = {
        txn_id,
        user_id,
        amount,
        location,
        timestamp: new Date()
    };

    transactions.push(transaction);


    let fraud = false;
    let message = "";

    if (amount > 50000) {
        fraud = true;
        message = "High amount transaction detected";
    }

    const userTransactions = transactions.filter(
        t => t.user_id == user_id
    );

    if (userTransactions.length > 1) {

        const lastTransaction =
            userTransactions[userTransactions.length - 2];

        if (lastTransaction.location !== location) {
            fraud = true;
            message = "Transaction from different location detected";
        }
    }

    if (fraud) {

        const alert = {
            alert_id: alerts.length + 1,
            txn_id,
            message
        };

        alerts.push(alert);

        io.to(user_id).emit("fraud_alert", {
            txn_id,
            message,
            amount,
            location
        });

        return res.json({
            message: "Fraud detected",
            transaction,
            alert
        });
    }
res.json({
        message: "Transaction successful",
        transaction
    });
});
server.listen(3000, () => {
    console.log("Server running on port 3000");
});
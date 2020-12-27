const functions = require("firebase-functions");
const cors = require("cors");
const { loginUser } = require("./api/user");
const app = require("express")();

app.use(cors());

/* Auth routes */
app.post("/login", loginUser);

exports.api = functions.https.onRequest(app);

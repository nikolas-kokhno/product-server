const functions = require("firebase-functions");
const cors = require("cors");
const { loginUser } = require("./api/user");
const auth = require("./utils/auth");
const {
  getAllProducts,
  deleteProduct,
  postOneProduct,
  editProduct,
} = require("./api/product");

const app = require("express")();
app.use(cors());

/* Auth routes */
app.post("/login", loginUser);

/* Product routes */
app.get("/products", auth, getAllProducts);
app.post("/products", auth, postOneProduct);
app.put("/products/:productId", auth, editProduct);
app.delete("/products/:productId", auth, deleteProduct);

exports.api = functions.https.onRequest(app);

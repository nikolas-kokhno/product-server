const { db, admin } = require("../utils/admin");
const config = require("../utils/config");

exports.getAllProducts = (request, response) => {
  db.collection("products")
    .where("username", "==", request.user.username)
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let products = [];
      data.forEach((doc) => {
        products.push({
          productId: doc.id,
          title: doc.data().title,
          desc: doc.data().desc,
          price: doc.data().price,
          imageUrl: doc.data().imageUrl,
          discount: doc.data().discount,
          createdAt: doc.data().createdAt,
        });
      });
      return response.json(products);
    })
    .catch((err) => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};

exports.postOneProduct = (request, response) => {
  if (request.body.title.trim() === "") {
    return response.status(400).json({ title: "Must not be empty" });
  }

  const newProductItem = {
    username: request.user.username,
    title: request.body.title,
    desc: request.body.desc,
    price: request.body.price,
    discount: request.body.discount,
    createdAt: new Date().toISOString(),
  };

  db.collection("products")
    .add(newProductItem)
    .then((doc) => {
      const responseProductItem = newProductItem;
      responseProductItem.id = doc.id;
      return response.json(responseProductItem);
    })
    .catch((err) => {
      response.status(500).json({ error: "Something went wrong" });
      console.error(err);
    });
};

exports.editProduct = (request, response) => {
  if (request.body.productId || request.body.createdAt) {
    response.status(403).json({ message: "Not allowed to edit" });
  }

  let document = db.collection("products").doc(`${request.params.productId}`);
  document
    .update(request.body)
    .then(() => {
      response.json({ message: "Updated successfully" });
    })
    .catch((err) => {
      console.error(err);
      return response.status(500).json({
        error: err.code,
      });
    });
};

exports.setImage = (request, response) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");
  const busboy = new BusBoy({ headers: request.headers });

  let imageFileName;
  let imageToBeUploaded = {};

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/png" && mimetype !== "image/jpeg") {
      return response.status(400).json({ error: "Wrong file type submited" });
    }

    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    imageFileName = `${
      (request.user.user_id, new Date().getTime())
    }.${imageExtension}`;
    const filePath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filePath, mimetype };
    file.pipe(fs.createWriteStream(filePath));
  });

  let product_id = {};

  busboy.on("field", function (fieldname, val) {
    product_id = val;
  });

  deleteImage(imageFileName);
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filePath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
          },
        },
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        return db.doc(`/products/${product_id}`).update({
          imageUrl,
        });
      })
      .then(() => {
        return response.json({ message: "Image uploaded successfully" });
      })
      .catch((error) => {
        console.error(error);
        return response.status(500).json({ error: error.code });
      });
  });

  busboy.end(request.rawBody);
};

exports.deleteProduct = (request, response) => {
  const document = db.doc(`/products/${request.params.productId}`);
  document
    .get()
    .then((doc) => {
      if (doc.data().username !== request.user.username) {
        return response.status(403).json({ error: "UnAuthorized" });
      }

      if (!doc.exists) {
        return response.status(404).json({ error: "Product not found" });
      }
      return document.delete();
    })
    .then(() => {
      response.json({ message: "Delete successfull" });
    })
    .catch((err) => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};

deleteImage = (imageName) => {
  const bucket = admin.storage().bucket();
  const path = `${imageName}`;
  return bucket
    .file(path)
    .delete()
    .then(() => {
      return;
    })
    .catch((error) => {
      return;
    });
};

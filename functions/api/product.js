const { db, admin } = require("../utils/admin");
const config = require("../utils/config");

exports.getAllProducts = (request, response) => {
  console.log(request.user.username);
  db.collection("products")
    .where("username", "==", request.user.username)
    .orderBy("desc")
    .get()
    .then((data) => {
      let products = [];
      data.forEach((doc) => {
        products.push({
          productId: doc.id,
          title: doc.data().title,
          desc: doc.data().desc,
          price: doc.data().price,
          imageURL: doc.data().imageURL,
          discount: doc.data().discount,
          discountTo: doc.data().discountTo,
        });
      });
      return response.json(products);
    })
    .catch((err) => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};

exports.editProduct = (request, response) => {
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

exports.postOneProduct = (request, response) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");
  const busboy = new BusBoy({ headers: request.headers });

  let imageFileName;
  let imageToBeUploaded = {};

  let productData = {};

  busboy.on("field", (fieldname, val) => {
    switch (fieldname) {
      case "product_id": {
        productData.product_id = val;
      }
      case "title": {
        productData.title = val;
      }
      case "desc": {
        productData.desc = val;
      }
      case "price": {
        productData.price = val;
      }
      case "discount": {
        productData.discount = val;
      }
      case "discountTo": {
        productData.discountTo = val;
      }
      default:
        fieldname;
    }
  });

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
        productData.username = request.user.username;
        productData.imageURL = imageUrl;
        return db.collection("products").add(productData);
      })
      .then(() => {
        return response.json(productData);
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

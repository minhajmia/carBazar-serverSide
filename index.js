const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
console.log(stripe);
const app = express();

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(bodyParser.json());

/*Connect With MongoDB*/
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster0.dftbcru.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

/* VERIFY TOKEN */
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("Unauthorized Access");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
}
async function run() {
  try {
    const categoriesNameCollection = client
      .db("carBazarDB")
      .collection("categories");
    const categoriesProductsCollection = client
      .db("carBazarDB")
      .collection("products");
    const bookingsCollection = client.db("carBazarDB").collection("bookings");
    const usersCollection = client.db("carBazarDB").collection("users");

    /* STRIPE PAYMENT  */
    app.post("/create-payment-intent", async (req, res) => {
      const booking = req.body;
      const price = parseInt(booking.price);
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    /*1JWT TOKEN */
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "14d",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: " " });
    });

    /*   GOOGLE SIGN IN AS A BUYER */
    app.put("/users/googleLogin", async (req, res) => {
      const email = req.query.email;
      const name = req.query.name;
      const query = { email: email, name: name };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          name: name,
          email: email,
          role: "buyer",
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    /*   BOOKING PAYMENT */
    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const booking = await bookingsCollection.findOne(query);
      res.send(booking);
    });

    /*   CHECK USER FOR TOKEN */
    app.get("/users", async (req, res) => {
      const email = req.query.email;
      const query = { email };
      const result = await usersCollection.findOne(query);
      console.log(result);
      res.send(result);
    });
    /*   ADVERTISE  SELLER UPLOAD PRODUCT */
    app.put("/product/advertise/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          isAdvertisement: "advertised",
        },
      };
      const result = await categoriesProductsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    /*     DELETE  SELLER UPLOAD PRODUCT */
    app.delete("/sellerProduct/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await categoriesProductsCollection.deleteOne(query);
      res.send(result);
    });
    /*   CHECK AS A  Admin */
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    /*   CHECK AS A  SELLER */
    app.get("/users/seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isSeller: user?.role === "seller" });
    });
    /*   LOAD  SELLER ALL  PRODUCT */
    app.get("/sellerProducts", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "seller") {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      const sellerProducts = await categoriesProductsCollection
        .find(query)
        .toArray();
      res.send(sellerProducts);
    });

    /*  Add   PRODUCT */
    app.post("/addProduct", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "seller") {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      const product = req.body;
      const result = await categoriesProductsCollection.insertOne(product);
      res.send(result);
    });

    /*  VERIFY  SELLER  */
    app.put("/seller/verify/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          isVerified: "verified",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    /*  DELETE  SELLER  */
    app.delete("/seller/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });
    /*  DELETE BUYER  */
    app.delete("/buyer/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    /*  CHECK VERIFIED SELLER  */
    app.get("/users/sellers/verify/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send(user);
    });
    /*  GET ALL SELLER  */
    app.get("/users/sellers", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const filter = { email: decodedEmail };
      const user = await usersCollection.findOne(filter);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      const query = {};
      const allUsers = await usersCollection.find(query).toArray();
      if (allUsers.length) {
        const sellers = allUsers.filter((user) => user.role !== "buyer");
        return res.send(sellers);
      }
    });
    /*  GET ALL BUYER  */
    app.get("/users/buyers", async (req, res) => {
      const query = {};
      const allUsers = await usersCollection.find(query).toArray();
      if (allUsers.length) {
        const buyers = allUsers.filter((user) => user.role !== "seller");
        return res.send(buyers);
      }
    });

    /*  CHECK AS A BUYER */
    app.get("/users/buyer/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isBuyer: user?.role === "buyer" });
    });

    /*  GET BUYER BOOKINGS */
    app.get("/bookings", verifyJWT, async (req, res) => {
      const decodeEmail = req.decoded.email;
      const email = req.query.email;
      const filter = { email: decodeEmail };
      const user = await usersCollection.findOne(filter);
      if (user?.role !== "buyer") {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      const query = { email };
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings);
    });

    /*  USERS POST */
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    /*   BOOKING PRODUCTS */
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const query = {
        email: booking.email,
        product: booking.product,
      };
      const count = await bookingsCollection.find(query).toArray();
      if (count.length) {
        const message = `You already booked. Choose another one`;
        return res.send({ acknowledge: false, message });
      }
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    /*  LOAD ALL PRODUCTS */
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { category: id };
      const products = await categoriesProductsCollection.find(query).toArray();
      res.send(products);
    });

    /*  LOAD ALL CATEGORIES */
    app.get("/categories", async (req, res) => {
      const query = {};
      const categories = await categoriesNameCollection.find(query).toArray();
      res.send(categories);
    });
  } finally {
  }
}
run().catch((err) => console.error(err));

app.get("/", (req, res) => {
  res.send("carBazar server is running");
});

app.listen(port, () => console.log("listening the port of ", port));

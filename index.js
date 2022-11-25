const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

    /* 5.  Delete  SELLER  */
    /* 5.  Delete Buyer  */
    app.delete("/buyer/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });
    /* 5.  GET ALL SELLER  */
    app.get("/users/sellers", async (req, res) => {
      const query = {};
      const allUsers = await usersCollection.find(query).toArray();
      if (allUsers.length) {
        const sellers = allUsers.filter((user) => user.role !== "buyer");
        return res.send(sellers);
      }
    });
    /* 4.  GET ALL BUYER  */
    app.get("/users/buyers", async (req, res) => {
      const query = {};
      const allUsers = await usersCollection.find(query).toArray();
      if (allUsers.length) {
        const buyers = allUsers.filter((user) => user.role !== "seller");
        return res.send(buyers);
      }
    });

    /* 4.  GET BUYER BOOKINGS */
    app.get("/bookings", async (req, res) => {
      const query = {};
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings);
    });

    /* 3.  USERS POST */
    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    /* 3.   BOOKING PRODUCTS */
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

    /* 2.  LOAD ALL PRODUCTS */
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { category_id: id };
      const products = await categoriesProductsCollection.find(query).toArray();
      res.send(products);
    });

    /* 1.  LOAD ALL CATEGORIES NAME*/
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

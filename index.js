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

    /* 3.  Booking PRODUCTS */
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

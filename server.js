const dotenv = require("dotenv");
const mongoose = require("mongoose");

// listening for uncaught exceptions
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: "./config.env" });

const app = require("./app");

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

// Connecting the app with the database
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  })
  .then((conn) => {
    // console.log(conn.connections);
    console.log("DB connection successful!");
  });

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(
    `App is running on port: ${port}. NODE_ENV is ${process.env.NODE_ENV}`
  );
});

// listening to unhandled async rejections
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    // 0 is success and 1 is uncaught exception
    process.exit(1);
  });
});

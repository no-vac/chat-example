var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var logger = require("morgan");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");

var app = express();
var server = require("http").createServer(app);
var io = require("socket.io")(server);

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
  res.io = io;
  next();
});

app.use("/", indexRouter);
app.use("/users", usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error", {
    message: err.message,
    error: {},
  });
});

io.on("connection", (socket) => {
  console.log(`user ${socket.id} connected`);
  socket.broadcast.emit("connected", socket.id);

  socket.on("msg", (msg) => {
    message = { text: msg, id: socket.id };
    io.emit("new msg", message);
  });

  socket.on("disconnect", () => {
    console.log(`user ${socket.id} disconnected`);
    io.emit("disconnected", socket.id);
  });
});

module.exports = { app, server };

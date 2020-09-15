var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var logger = require("morgan");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var videoRouter = require("./routes/video");

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
app.use("/video", videoRouter);

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

//SocketIO
let activeSockets = [];

io.on("connection", (socket) => {
  const existingSocket = activeSockets.find((existingSocket) => existingSocket === socket.id);

  if (!existingSocket) activeSockets.push(socket.id);

  socket.emit("update-user-list", {
    users: activeSockets.filter((existingSocket) => existingSocket !== socket.id),
  });

  socket.broadcast.emit("update-user-list", { users: [socket.id] });

  console.log(`user ${socket.id} connected`);

  socket.on("disconnect", () => {
    activeSockets = activeSockets.filter((existingSocket) => existingSocket !== socket.id);
    socket.broadcast.emit("remove-user", { socketId: socket.id });
  });

  socket.on("call-user", (data) => {
    socket.to(data.to).emit("call-made", {
      offer: data.offer,
      socket: socket.id,
    });
  });

  socket.on("make-answer", (data) => {
    socket.to(data.to).emit("answer-made", {
      socket: socket.id,
      answer: data.answer,
    });
  });
});

module.exports = { app, server };

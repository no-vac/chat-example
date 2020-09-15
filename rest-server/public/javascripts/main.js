const { RTCPeerConnection, RTCSessionDescription } = window;
const peerConnection = new RTCPeerConnection();
let isAlreadyCalling = false;
let getCalled = false;

var socket = io();

navigator.getUserMedia(
  { video: true, audio: true },
  (stream) => {
    console.log("stream on");
    const localVideo = document.querySelector("#local-video");
    if (localVideo) {
      localVideo.srcObject = stream;
    }

    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
  },
  (error) => {
    console.warn(error.message);
  }
);

socket.on("remove-user", ({ socketId }) => {
  const elToRemove = document.querySelector("#" + socketId);
  if (elToRemove) elToRemove.remove();
});

socket.on("update-user-list", ({ users }) => {
  updateUserList(users);
});

socket.on("call-made", async (data) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

  socket.emit("make-answer", {
    answer,
    to: data.socket,
  });
});

socket.on("answer-made", async (data) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
  if (!isAlreadyCalling) {
    callUser(data.socket);
    isAlreadyCalling = true;
  }
});

peerConnection.ontrack = function ({ streams: [stream] }) {
  const remoteVideo = document.querySelector("#remote-video");
  if (remoteVideo) remoteVideo.srcObject = stream;
};

function unselectUsersFromList() {
  const alreadySelectedUser = document.querySelectorAll(".active-user .active-user--selected");
  alreadySelectedUser.forEach((el) => {
    el.setAttribute("class", "active-user");
  });
}

function updateUserList(socketIds) {
  const activeUserContainer = document.querySelector("#active-user-container");
  socketIds.forEach((socketId) => {
    const existingUser = document.getElementById(socketId);
    if (!existingUser) {
      const userContainer = createUserItemContainer(socketId);
      activeUserContainer.appendChild(userContainer);
    }
  });
}

function createUserItemContainer(socketId) {
  const userContainer = document.createElement("div");
  const username = document.createElement("p");

  userContainer.setAttribute("class", "active-user");
  userContainer.setAttribute("id", socketId);
  username.setAttribute("class", "username");
  username.innerHTML = `Socket: ${socketId}`;

  userContainer.appendChild(username);

  userContainer.addEventListener("click", () => {
    unselectUsersFromList();
    userContainer.setAttribute("class", "active-user active-user--selected");
    const talkingWithInfo = document.querySelector("#talking-with-info");
    talkingWithInfo.innerHTML = `Talking with: "Socket: ${socketId}"`;
    callUser(socketId);
  });
  return userContainer;
}

async function callUser(socketId) {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

  socket.emit("call-user", {
    offer,
    to: socketId,
  });
}

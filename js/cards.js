var ownColors = {
  yellow: false,
  blue: false,
  green: false,
  red: false,
  white: false,
  all: false,
};

$(document).ready(() => {
  let wsUrl =
    (location.protocol == "https:" ? "wss://" : "ws://") +
    location.hostname +
    (location.port ? ":" + location.port : "") +
    '/' + roomId;
  var socket = new WebSocket(wsUrl, "stimmung"); // "ws://localhost:8080/"
  socket.onopen = function () {
    socket.send(
      JSON.stringify({
        type: "join",
        name: $("#displayname").text(),
      })
    );
  };
  socket.onmessage = function (msg) {
    var data = JSON.parse(msg.data);
    switch (data.type) {
      case "msg":
        var msg = $("<div>" + data.name + ": " + data.msg + "</div>");
        $("#cards").append(msg);
        break;
      case "join":
        $("#users").empty();
        for (var i = 0; i < data.names.length; i++) {
          var user = $("<div>" + data.names[i] + "</div>");
          $("#users").append(user);
        }
        break;
      case "raise":
        renderCard(data);
        countCards();
        renderIfUserHasRaised(data.id);
        break;
      case "lower":
        $(`#${data.id}${data.card}`).remove();
        countCards();
        renderIfUserHasRaised(data.id);
        break;
      case "all":
        $("#cards").empty();
        data.cards.forEach((card) => {
          renderCard(card);
        });
        countCards();
        data.cards.forEach((card) => {
          renderIfUserHasRaised(card.id);
        });
        break;
      case "reset":
        $("#cards").empty();
        resetOwnCards();
        countCards();
        document
          .querySelectorAll(`div.user>span.has-raised`)
          .forEach((dot) => dot.remove());
        break;
      case "connected":
        renderUsers(data);
        data.connected.forEach((user) => {
          renderIfUserHasRaised(user.id);
        });
        break;
      default:
        $("#cards").append(msg.data);
    }
  };

  socket.onclose = function (msg) {
    resetOwnCards();
    $("#counts").remove();
    $("#cards").empty();
    $("#col-users").remove();
    $("#cards").append(
      '<div class="disconnected">Deine Verbindung wurde beendet! <a href="/">Zur&uuml;ck zum Beitreten-Bildschirm</a></div>'
    );
  };

  function renderCard(data) {
    let card = `<div id="${data.id}${data.card}" class="card-common card-${data.card}">${data.name}</div>`;
    $("#cards").append(card);
  }

  function renderIfUserHasRaised(id) {
    let usersCards = document.querySelectorAll(`div.card-common[id^="${id}"]`);
    let user = document.querySelector(`div.user[id="${id}"]`);
    let currentSpan = document.querySelector(
      `div.user[id="${id}"]>span.has-raised`
    );
    if (currentSpan) currentSpan.remove();

    if (user && usersCards.length > 0) {
      user.innerHTML =
        "<span class='has-raised'>&bull;</span>" + user.innerHTML;
      let kickBtn = document.querySelector(`div.user[id="${id}"] a.kickBtn`);
      if (kickBtn) kickBtn.addEventListener("click", () => kickUser(id));
    }
  }

  function compareUsers(a, b) {
    if (a.name.localeCompare(b.name) != 0) {
      return a.name.localeCompare(b.name);
    } else {
      return a.id.localeCompare(b.id);
    }
  }

  function renderUsers(data) {
    let users = data.connected.sort(compareUsers);
    $("#users").empty();
    users.forEach((user) => {
      $("#users").append(
        `<div class='user' id='${user.id}'>${user.name}<span><a class='kickBtn reset-hide'>X</a></span></div>`
      );
    });

    $("#users .kickBtn").each(function () {
      $(this).on("click", () => kickUser($(this).closest(".user").attr("id")));
    });

    if (!$("#resetRow").hasClass("reset-hide")) {
      $(".kickBtn").each(function () {
        $(this).toggleClass("reset-hide");
      });
    }
  }

  function kickUser(id) {
    socket.send(
      JSON.stringify({
        type: "kick",
        id,
      })
    );
  }

  function countCards() {
    Object.keys(ownColors).forEach((color) => {
      $(`#count-${color}`).text($(`#cards .card-${color}`).length);
    });
  }

  function resetOwnCards() {
    Object.keys(ownColors).forEach((color) => {
      $(`#${color}Btn`).addClass("btn-color-unselected");
      $(`#${color}Btn`).removeClass("btn-color-selected");
      ownColors[color] = false;
    });
  }

  Object.keys(ownColors).forEach((color) => {
    $(`#${color}Btn`).on("click", function (event) {
      event.preventDefault();
      socket.send(
        JSON.stringify({
          type: ownColors[color] ? "lower" : "raise",
          card: `${color}`,
        })
      );
      ownColors[color] = !ownColors[color];
      $(this).toggleClass("btn-color-unselected");
      $(this).toggleClass("btn-color-selected");
    });
  });

  $("#resetBtn").on("click", function (event) {
    event.preventDefault();
    socket.send(
      JSON.stringify({
        type: "reset",
      })
    );
    $("#cards").empty();
    resetOwnCards();
    countCards();
  });

  document.body.addEventListener("keypress", (event) => {
    if (event.key && event.key === "R") {
      $("#resetRow").toggleClass("reset-show");
      $("#resetRow").toggleClass("reset-hide");
      $("#users .kickBtn").each(function () {
        $(this).toggleClass("reset-show");
        $(this).toggleClass("reset-hide");
      });
    }
  });
});

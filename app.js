require("dotenv-extended").load();

const builder = require("botbuilder");
const restify = require("restify");
const Store = require("./store");
const spellService = require("./spell-service");

const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`${server.name} listening to ${server.url}`);
});

const connector = new builder.ChatConnector({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD
});
server.post("/api/messages", connector.listen());

var inMemoryStorage = new builder.MemoryBotStorage();
var bot = new builder.UniversalBot(connector, function(session) {
  session.send(
    "Hello!! I`m the Constance Bot! Your friendly Bot! How can I assist you ?",
    session.message.text
  );
}).set("storage", inMemoryStorage);

const recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL);
bot.recognizer(recognizer);

bot
  .dialog("SearchHotels", [
    (session, args, next) => {
      session.send(
        `Welcome to the Constance! We are analyzing your request: ${
          session.message.text
        }. Please give us a minute!`
      );
      const cityEntity = builder.EntityRecognizer.findEntity(
        args.intent.entities,
        "builtin.geography.city"
      );
      const airportEntity = builder.EntityRecognizer.findEntity(
        args.intent.entities,
        "AirportCode"
      );
      if (cityEntity) {
        session.dialogData.searchType = "city";
        next({ response: cityEntity.entity });
      } else if (airportEntity) {
        session.dialogData.searchType = "airport";
        next({ response: airportEntity.entity });
      } else {
        builder.Prompts.text(session, "Please enter your destination");
      }
    },
    (session, results) => {
      const destination = results.response;
      let message = "Looking for hotels";
      if (session.dialogData.searchType === "airport") {
        message += " near %s airport...";
      } else {
        message += " in %s...";
      }
      session.send(message, destination);
      Store.searchHotels(destination).then(hotels => {
        session.send(`I found ${hotels.length} hotels:`);
        let message = new builder.Message()
          .attachmentLayout(builder.AttachmentLayout.carousel)
          .attachments(hotels.map(hotelAsAttachment));
        session.send(message);
        session.endDialog();
      });
    }
  ])
  .triggerAction({
    matches: "SearchHotels",
    onInterrupted: session => {
      session.send("Please provide a destination");
    }
  });

bot
  .dialog("Rooms", [
    (session, args, next) => {
      session.send(`We are fetching the rooms as per your request.!`);
      next({ response: args });
    },
    (session, results) => {
      const typeOfRoom = results.response;
      let message = "Looking for available rooms";
      session.send(message, typeOfRoom);
      Store.searchRooms(typeOfRoom).then(rooms => {
        session.send(`I found ${rooms} rooms:`);
        let availableRooms = new builder.Message().attachmentLayout(
          builder.AttachmentLayout.carousel
        );
        //   .attachments(rooms.map(roomAsAttachment));
        session.send(availableRooms);
        session.endDialog();
      });
    }
  ])
  .triggerAction({
    matches: "Rooms",
    onInterrupted: session => {
      session.send("Please provide a valid choice");
    }
  });

bot
  .dialog("ShowHotelsReviews", (session, args) => {
    const hotelEntity = builder.EntityRecognizer.findEntity(
      args.intent.entities,
      "Hotel"
    );
    if (hotelEntity) {
      session.send(`Looking for reviews of '${hotelEntity.entity}'...`);
      Store.searchHotelReviews(hotelEntity.entity).then(reviews => {
        let message = new builder.Message()
          .attachmentLayout(builder.AttachmentLayout.carousel)
          .attachments(reviews.map(reviewAsAttachment));
        session.endDialog(message);
      });
    }
  })
  .triggerAction({
    matches: "ShowHotelsReviews"
  });

bot
  .dialog("Help", session => {
    session.endDialog(
      `Try asking me things like 'search hotels in Mauritius' or 'show me the reviews of Constance Prince Maurice'`
    );
  })
  .triggerAction({
    matches: "Help"
  });

if (process.env.IS_SPELL_CORRECTION_ENABLED === "true") {
  bot.use({
    botbuilder: (session, next) => {
      spellService
        .getCorrectedText(session.message.text)
        .then(text => {
          session.message.text = text;
          next();
        })
        .catch(error => {
          console.error(error);
          next();
        });
    }
  });
}

const hotelAsAttachment = hotel => {
  return new builder.HeroCard()
    .title(hotel.name)
    .subtitle(
      "%d stars. %d reviews. From $%d per night.",
      hotel.rating,
      hotel.numberOfReviews,
      hotel.priceStarting
    )
    .images([new builder.CardImage().url(hotel.image)])
    .buttons([
      new builder.CardAction()
        .title("More details")
        .type("openUrl")
        .value("https://www.constancehotels.com/en/")
    ]);
};

const roomAsAttachment = room => {
  return (
    new builder.HeroCard()
      .title(room.name)
      .subtitle("%d stars. %d reviews. From $%d per night.", room.name)
      // .images([new builder.CardImage().url(hotel.image)])
      .buttons([
        new builder.CardAction()
          .title("More details")
          .type("openUrl")
          .value("https://www.constancehotels.com/en/")
      ])
  );
};

const reviewAsAttachment = review => {
  return new builder.ThumbnailCard()
    .title(review.title)
    .text(review.text)
    .images([new builder.CardImage().url(review.image)]);
};

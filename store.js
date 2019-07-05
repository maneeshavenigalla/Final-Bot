const ReviewsOptions = [
  "“Very stylish, great stay, great staff”",
  "“good hotel awful meals”",
  "“Need more attention to little things”",
  "“Lovely small hotel ideally situated to explore the area.”",
  "“Positive surprise”",
  "“Beautiful suite and resort”"
];

const searchHotels = destination => {
  return new Promise((resolve, reject) => {
    // Filling the hotels results manually just for demo purposes
    let hotels = Array(5).fill({});
    hotels = hotels.map((hotel, index) => {
      const i = index + 1;
      return {
        name: `${destination} Hotel ${i}`,
        location: destination,
        rating: Math.ceil(Math.random() * 5),
        numberOfReviews: Math.floor(Math.random() * 5000) + 1,
        priceStarting: Math.floor(Math.random() * 450) + 80,
        image: `https://www.constancehospitality.com/media/1051/constance-hospitality-management-history-2.jpg`
      };
    });
    hotels.sort((a, b) => {
      return a.priceStarting - b.priceStarting;
    });
    // complete promise with a timer to simulate async response
    setTimeout(() => {
      resolve(hotels);
    }, 1000);
  });
};

const rooms = [
  "sea-view",
  "double",
  "city-view",
  "single",
  "luxury",
  "deluxe",
  "smoking",
  "non-smoking"
];

const searchRooms = typeOfRoom => {
  return new Promise((resolve, reject) => {
    // Filling the hotels results manually just for demo purposes
    let roomTypes = Array(rooms).fill({});
    rooms.map((rooms, index) => {
      const j = index + 1;
      return {
        name: `${typeOfRoom} Hotel ${j}`
        // location: destination,
        // rating: Math.ceil(Math.random() * 5),
        // numberOfReviews: Math.floor(Math.random() * 5000) + 1,
        // priceStarting: Math.floor(Math.random() * 450) + 80,
        // image: `https://www.constancehospitality.com/media/1051/constance-hospitality-management-history-2.jpg`
      };
    });
    // complete promise with a timer to simulate async response
    setTimeout(() => {
      resolve(rooms);
    }, 1000);
  });
};

const searchHotelReviews = hotelName => {
  return new Promise((resolve, reject) => {
    // Filling the review results manually just for demo purposes
    let reviews = Array(5).fill({});
    reviews = reviews.map(review => {
      return {
        title:
          ReviewsOptions[Math.floor(Math.random() * ReviewsOptions.length)],
        text: `Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                Mauris odio magna, sodales vel ligula sit amet, vulputate vehicula velit.
                Nulla quis consectetur neque, sed commodo metus.`,
        image:
          "https://upload.wikimedia.org/wikipedia/en/e/ee/Unknown-person.gif"
      };
    });
    // complete promise with a timer to simulate async response
    setTimeout(() => {
      resolve(reviews);
    }, 500);
  });
};

module.exports = {
  searchHotels,
  searchHotelReviews,
  searchRooms
};

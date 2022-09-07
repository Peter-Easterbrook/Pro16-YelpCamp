const mongoose = require('mongoose');
const cities = require('./cities');
const { places, descriptors } = require('./seedHelpers');
const Campground = require('../models/campground');

mongoose.connect('mongodb://localhost:27017/yelp-camp');

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Database connected');
});

const sample = (array) => array[Math.floor(Math.random() * array.length)];

const seedDB = async () => {
  await Campground.deleteMany({});
  for (let i = 0; i < 200; i++) {
    const random1000 = Math.floor(Math.random() * 1000);
    const price = Math.floor(Math.random() * 20) + 10;
    const camp = new Campground({
      // author: '5c8f8f8f8f8f8f8f8f8f8f8',
      author: '6300a3b7eec7af8c4833a71d',
      location: `${cities[random1000].city}, ${cities[random1000].state}`,
      title: `${sample(descriptors)} ${sample(places)}`,
      description:
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quidem.',
      price,
      geometry: {
        type: 'Point',
        coordinates: [
          cities[random1000].longitude,
          cities[random1000].latitude,
        ],
      },
      images: [
        {
          url: 'https://res.cloudinary.com/onestep-webdev/image/upload/v1661788122/YelpCamp/we9o2kqjnibhm9nutyhw.jpg',
          filename: 'YelpCamp/we9o2kqjnibhm9nutyhw',
        },
        {
          url: 'https://res.cloudinary.com/onestep-webdev/image/upload/v1661788122/YelpCamp/ru8vudvgojed8owncnii.jpg',
          filename: 'YelpCamp/ru8vudvgojed8owncnii',
        },
        {
          url: 'https://res.cloudinary.com/onestep-webdev/image/upload/v1661788124/YelpCamp/zpthwqntmmuptd9uflo8.jpg',
          filename: 'YelpCamp/zpthwqntmmuptd9uflo8',
        },
      ],
    });
    await camp.save();
  }
};
seedDB().then(() => {
  mongoose.connection.close();
});

const { campgroundSchema, reviewSchema } = require('./schemas.js');
const ExpressError = require('./utils/ExpressError');
const Campground = require('./models/campground');
const Review = require('./models/review');
const { deleteUploads } = require('./cloudinary');

module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    // Only GET URLs can be revisited after login; a POST/PUT/DELETE target would 404
    if (req.method === 'GET') req.session.returnTo = req.originalUrl;
    req.flash('error', 'You must be signed in first!');
    return res.redirect('/login');
  }
  next();
};

// Passport 0.6+ regenerates the session on login, wiping returnTo, so keep a copy on res.locals
module.exports.storeReturnTo = (req, res, next) => {
  if (req.session.returnTo) {
    res.locals.returnTo = req.session.returnTo;
  }
  next();
};

module.exports.validateCampground = async (req, res, next) => {
  const { error } = campgroundSchema.validate(req.body);
  if (error) {
    // Images were already uploaded by multer; remove them before rejecting
    await deleteUploads(req.files);
    const msg = error.details.map((el) => el.message).join(',');
    throw new ExpressError(msg, 400);
  } else {
    next();
  }
};

module.exports.isAuthor = async (req, res, next) => {
  const { id } = req.params;
  const campground = await Campground.findById(id);
  if (!campground) {
    req.flash('error', 'Cannot find that campground!');
    return res.redirect('/campgrounds');
  }
  if (!campground.author.equals(req.user._id)) {
    req.flash('error', 'You do not have permission to do that!');
    return res.redirect(`/campgrounds/${id}`);
  }
  next();
};

module.exports.isReviewAuthor = async (req, res, next) => {
  const { id, reviewId } = req.params;
  const review = await Review.findById(reviewId);
  if (!review) {
    req.flash('error', 'Cannot find that review!');
    return res.redirect(`/campgrounds/${id}`);
  }
  if (!review.author.equals(req.user._id)) {
    req.flash('error', 'You do not have permission to do that!');
    return res.redirect(`/campgrounds/${id}`);
  }
  next();
};

module.exports.validateReview = (req, res, next) => {
  const { error } = reviewSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((el) => el.message).join(',');
    throw new ExpressError(msg, 400);
  } else {
    next();
  }
};

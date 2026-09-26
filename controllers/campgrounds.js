const Campground = require('../models/campground');
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapBoxToken });

const { cloudinary, deleteUploads } = require('../cloudinary');

module.exports.index = async (req, res) => {
  const campgrounds = await Campground.find({});
  res.render('campgrounds/index', { campgrounds });
};

module.exports.renderNewForm = (req, res) => {
  res.render('campgrounds/new');
};

// Returns a GeoJSON Point for the location, or undefined if Mapbox finds no match
const geocode = async (location) => {
  const geoData = await geocoder
    .forwardGeocode({ query: location, limit: 1 })
    .send();
  return geoData.body.features[0]?.geometry;
};

const locationNotFound = async (req, res, redirectUrl) => {
  // Don't leave the just-uploaded images orphaned on Cloudinary
  await deleteUploads(req.files);
  req.flash('error', 'Could not find that location. Please try a different one.');
  res.redirect(redirectUrl);
};

module.exports.createCampground = async (req, res) => {
  const geometry = await geocode(req.body.campground.location);
  if (!geometry) return locationNotFound(req, res, '/campgrounds/new');
  const campground = new Campground(req.body.campground);
  campground.geometry = geometry;
  campground.images = req.files.map((f) => ({
    url: f.path,
    filename: f.filename,
  }));
  campground.author = req.user._id;
  await campground.save();
  req.flash('success', 'Successfully made a new campground!');
  res.redirect(`/campgrounds/${campground._id}`);
};

module.exports.showCampground = async (req, res) => {
  const campground = await Campground.findById(req.params.id)
    .populate({
      path: 'reviews',
      populate: {
        path: 'author',
      },
    })
    .populate('author');
  if (!campground) {
    req.flash('error', 'Cannot find that campground!');
    return res.redirect('/campgrounds');
  }
  res.render('campgrounds/show', { campground });
};

module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params;
  const campground = await Campground.findById(id);
  if (!campground) {
    req.flash('error', 'Cannot find that campground!');
    return res.redirect('/campgrounds');
  }
  res.render('campgrounds/edit', { campground });
};

module.exports.updateCampground = async (req, res) => {
  const { id } = req.params;
  const campground = await Campground.findById(id);
  const { location } = req.body.campground;
  if (location !== campground.location) {
    const geometry = await geocode(location);
    if (!geometry) return locationNotFound(req, res, `/campgrounds/${id}/edit`);
    campground.geometry = geometry;
  }
  campground.set(req.body.campground);
  const imgs = req.files.map((f) => ({ url: f.path, filename: f.filename }));
  campground.images.push(...imgs);
  // Only delete images that belong to this campground, never arbitrary Cloudinary IDs
  const toDelete = campground.images.filter((img) =>
    req.body.deleteImages?.includes(img.filename)
  );
  campground.images = campground.images.filter((img) => !toDelete.includes(img));
  await campground.save();
  await Promise.all(
    toDelete.map((img) => cloudinary.uploader.destroy(img.filename))
  );
  req.flash('success', 'Successfully updated campground!');
  res.redirect(`/campgrounds/${campground._id}`);
};

module.exports.deleteCampground = async (req, res) => {
  const { id } = req.params;
  await Campground.findByIdAndDelete(id);
  req.flash('success', 'Successfully deleted campground');
  res.redirect('/campgrounds');
};

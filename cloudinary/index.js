const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

// Custom Multer storage engine for Cloudinary v2
class CloudinaryStorage {
  constructor(options) {
    this.cloudinary = options.cloudinary;
    this.params = options.params || {};
  }

  _handleFile(req, file, cb) {
    const uploadOptions = {
      folder: this.params.folder || 'uploads',
      allowed_formats: this.params.allowedFormats || ['jpg', 'png', 'jpeg'],
      transformation: this.params.transformation,
    };

    const uploadStream = this.cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return cb(error);
        cb(null, {
          path: result.secure_url,
          filename: result.public_id,
        });
      }
    );

    file.stream.pipe(uploadStream);
  }

  _removeFile(req, file, cb) {
    this.cloudinary.uploader.destroy(file.filename, cb);
  }
}

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'YelpCamp',
    allowedFormats: ['jpg', 'png', 'jpeg'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
  },
});

module.exports = {
  storage,
  cloudinary,
};

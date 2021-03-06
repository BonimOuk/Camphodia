var express         = require("express");
var router          = express.Router();
var Campground      = require("../models/campground");
var User            = require("../models/user");
var Notification    = require("../models/notification");
var middleware      = require("../middleware");
var mbxGeocoding    = require('@mapbox/mapbox-sdk/services/geocoding');
var geocodingClient = mbxGeocoding({ accessToken: process.env.MAPBOX_TOKEN });


var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({  
  cloud_name: 'bonim', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// We need to replace all app. with router in this case
// INDEX ROUTE - Show all campgrounds
router.get("/", function(req, res){
    var perPage = 8;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;
    var noMatch = null;
    if(req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Campground.find({name: regex}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allCampgrounds) {
           Campground.countDocuments({name: regex}).exec(function (err, countDocuments) {
               if(err){ 
                   console.log(err);
               } else {
                   if(allCampgrounds.length < 1) {
                       noMatch = "No campgrounds match that query, please try again.";
                   }
                    // We take override currentUser: req.user from below line, by using app.use(function(req, res, next)...
                    res.render("campgrounds/index", {
                        campgrounds:allCampgrounds, 
                        // page: 'campgrounds', 
                        current: pageNumber,
                        pages: Math.ceil(countDocuments / perPage),
                        noMatch: noMatch,
                        search: req.query.search
                    });
               }
           });
        });
    } else {
        // Get all campgrounds from DB
        Campground.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allCampgrounds) {
            Campground.countDocuments().exec(function (err, countDocuments) {
                if(err){ 
                   console.log(err);
               } else {
                    // We take override currentUser: req.user from below line, by using app.use(function(req, res, next)...
                    res.render("campgrounds/index", {
                        campgrounds:allCampgrounds, 
                        // page: 'campgrounds', 
                        current: pageNumber,
                        pages: Math.ceil(countDocuments / perPage),
                        noMatch: noMatch,
                        search: false
                    });
                }
            });
           
        });
    }
});

// CREATE ROUTE - Add new campground to DB
router.post("/", middleware.isLoggedIn, upload.single('image'), async function(req, res) {
    cloudinary.v2.uploader.upload(req.file.path, async function(err, result) {
      if(err) {
        req.flash('error', err.message);
        return res.redirect('back');
      }
      // add cloudinary url for the image to the campground object under image property
      req.body.campground.image = result.secure_url;
      // add image's public_id to campground object
      req.body.campground.imageId = result.public_id;
      // add author to campground
      req.body.campground.author = {
        id: req.user._id,
        username: req.user.username
      };
      try {
          let response = await geocodingClient
    	    .forwardGeocode({
    	       query: req.body.campground.location,
    		   limit: 1
        	})
        	.send();
          req.body.campground.coordinates = response.body.features[0].geometry.coordinates;
          let campground = await Campground.create(req.body.campground);
          let user = await User.findById(req.user._id).populate("followers").exec();
          let newNotification = {
              username: req.user.username,
              campgroundId: campground.id    
          };
          for(const follower of user.followers) {
              let notification = await Notification.create(newNotification);
              follower.notifications.push(notification);
              follower.save();
          }
          // Redirect back to campgrounds page
          res.redirect('/campgrounds/' + campground.id);
        } catch(err) {
          req.flash("err", err.message);
          res.redirect("back");
        }
    });
});

// NEW ROUTE - Show form to create new campground
router.get("/new", middleware.isLoggedIn, function(req, res){
   res.render("campgrounds/new"); 
});

// SHOW ROUTE - Show more info about one campground
router.get("/:id", function(req, res){
    // Find the campground with provided ID
    Campground.findById(req.params.id).populate("comments likes").exec(function(err, foundCampground){
        if(err){
            console.log(err);
        } else {
            console.log(foundCampground);
            // Render show template with that campground
            res.render("campgrounds/show", {campground: foundCampground});
        }
    });
});

// Campground Like Route
router.post("/:id/like", middleware.isLoggedIn, function (req, res) {
    Campground.findById(req.params.id, function (err, foundCampground) {
        if (err) {
            console.log(err);
            return res.redirect("/campgrounds");
        }
        // check if req.user._id exists in foundCampground.likes
        var foundUserLike = foundCampground.likes.some(function (like) {
            return like.equals(req.user._id);
        });

        if (foundUserLike) {
            // user already liked, removing like
            foundCampground.likes.pull(req.user._id);
        } else {
            // adding the new user like
            foundCampground.likes.push(req.user);
        }

        foundCampground.save(function (err) {
            if (err) {
                console.log(err);
                return res.redirect("/campgrounds");
            }
            return res.redirect("/campgrounds/" + foundCampground._id);
        });
    });
});

// EDIT CAMPGROUND ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
         Campground.findById(req.params.id, function(err, foundCampground){
            res.render("campgrounds/edit", {campground: foundCampground});
        });
});

// UPDATE CAMPGROUND ROUTE
router.put("/:id", middleware.checkCampgroundOwnership, upload.single('image'), function(req, res) {
    // Find and update the correct campground
    Campground.findById(req.params.id, async function(err, campground){
        if(err){
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            if(req.file) {
                try {
                    await cloudinary.v2.uploader.destroy(campground.imageId);
                    var result = await cloudinary.v2.uploader.upload(req.file.path);
                    campground.imageId = result.public_id;
                    campground.image = result.secure_url;
                } catch(err){
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
            }
            // Check if location was updated
            if(req.body.campground.location !== campground.location) {
                let response = await geocodingClient
            	    .forwardGeocode({
            	       query: req.body.campground.location,
            		   limit: 1
                	})
                	.send();
                campground.coordinates = response.body.features[0].geometry.coordinates;
                campground.location = req.body.campground.location;
            }
            campground.name = req.body.name;
            campground.price = req.body.price;
            campground.description = req.body.description;
            campground.save();
            req.flash("success", "Successfully Updated!");
            // Redirect somewhere(Show page)
            res.redirect("/campgrounds/" + campground._id);
        }   
    });
});

// DESTROY CAMPGROUND ROUTE
router.delete("/:id", middleware.checkCampgroundOwnership, function(req, res) {
    Campground.findOneAndDelete(req.params.id, async function(err, campground) {
        if(err){
            req.flash("error", err.message);
            return res.redirect("back");
        } 
        try {
            await cloudinary.v2.uploader.destroy(campground.imageId);
            campground.remove();
            req.flash("sucess", "Campground deleted successfully!");
            res.redirect("/campgrounds");
        } catch(err) {
            if(err){
                req.flash("error", err.message);
                return res.redirect("back");
            } 
        }
            
    });
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;
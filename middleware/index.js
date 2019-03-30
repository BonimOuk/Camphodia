var Campground  = require("../models/campground");
var Comment     = require("../models/comment");

// All the middleware goes here
var middlewareObj = {};

middlewareObj.checkCampgroundOwnership = function(req, res, next){
    // Is user logged in?
    if(req.isAuthenticated()){
         Campground.findById(req.params.id, function(err, foundCampground){
            // To fix Error Handling Bug Solution - We need to use if(err || !foundCampground) instead of if(err)
            if(err || !foundCampground){
                req.flash("error", "Campground not found");
                res.redirect("back");
            } else {  
                // Does user own the campground
                // console.log(typeof foundCampground.author.id);
                // console.log(typeof req.user._id);
                if(foundCampground.author.id.equals(req.user._id) || req.user.isAdmin){
                    next();
                } else {
                    req.flash("error", "You don't have permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
}

middlewareObj.checkCommentOwnership = function(req, res, next){
    // Is user logged in?
    if(req.isAuthenticated()){
         Comment.findById(req.params.comment_id, function(err, foundComment){
            if(err || !foundComment){
                // To fix Error Handling Bug Solution - We need to use if(err || !foundComment) instead of if(err)
                req.flash("error", "Comment not found");
                res.redirect("back");
            } else {  
                // Does user own the comment?
                if(foundComment.author.id.equals(req.user._id) || req.user.isAdmin){
                    next();
                } else {
                    req.flash("error", "You don't have permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        res.redirect("back");
    }
}

// Middleware
middlewareObj.isLoggedIn = function(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error", "You need to be logged in to do that");
    res.redirect("/login");
}

module.exports = middlewareObj;
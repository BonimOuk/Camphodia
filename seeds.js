var mongoose    = require("mongoose");
var Campground  = require("./models/campground");
var Comment     = require("./models/comment");

var seeds = [
    {
        name: "Cloud's Rest", 
        image:"https://farm1.staticflickr.com/82/225912054_690e32830d.jpg",
        description: "Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source"
    },
    {
        name: "Angel Camp", 
        image:"https://farm1.staticflickr.com/211/467048513_4042c7979f.jpg",
        description: "Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source"
    },
    {
        name: "Funky Montain", 
        image:"https://farm3.staticflickr.com/2409/2251892884_a5b0048ed1.jpg",
        description: "Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable sourceBlah blah blah blah blah"
    },
];

async function seedDB(){
    try {
        await Campground.deleteMany({});
        console.log("Campgrounds removed!");
        await Comment.deleteMany({});
        console.log("Comments removed!");  
        for(const seed of seeds) {
            let campground = await Campground.create(seed);
            console.log("Campground created!");
            let comment = await Comment.create(
                                {
                                    text: "This place is great, but I wish there was an internet",
                                    author: "Homer"  
                            });
                            console.log("Comment created!");
                            campground.comments.push(comment);
                            campground.save();
                            console.log("Comment added to campground!");
        }
    } catch(err) {
        console.log(err);
    }
    
}

module.exports = seedDB;
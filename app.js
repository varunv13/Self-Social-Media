const express = require('express');
const userModel = require('./models/user.js');
const postModel = require('./models/post.js');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const post = require('./models/post.js');

const app = express();

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended : true }));
app.use(cookieParser());

app.get("/", (req, res) => {
    res.render("index");
});

app.post("/register", async(req, res) => {
    let {username, name, age, email, password} = req.body; // de-structing the content which the server is receiving
    let user = await userModel.findOne({ email });
    if(user) res.status(500).send("User already exist");

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async(err, hash) => {
            let user = await userModel.create({
                username,
                name,
                age,
                email,
                password:hash,
            });

            let token = jwt.sign({ email: email, userid: user._id }, "shhhhhhhhhhhh");
            res.cookie("token", token);
            res.send("Accound created");
        })
    })

});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", async(req, res) => {
    let {email, password} = req.body; // de-structing the content which the server is receiving

    let user = await userModel.findOne({ email });
    if(!user) res.status(500).send("Check your email or your password");

    bcrypt.compare(password, user.password, (err, result) => {
        if(result) {
            let token = jwt.sign({ email: email, userid: user._id }, "shhhhhhhhhhhh");
            res.cookie("token", token);
            res.status(200).redirect("/profile");
        }
        else res.redirect("/");
    });
    

});

app.get("/profile", isLoggedIn, async(req, res) =>{
    let user = await userModel.findOne({ email: req.user.email }).populate("posts");
    // console.log(user);
    res.render("profile", {user})
});

app.post("/post", isLoggedIn, async(req, res) =>{
    let user = await userModel.findOne({ email: req.user.email });
    let { content } = req.body;

    let post = await postModel.create({
        userInfo: user._id,
        content,
    });
    
    user.posts.push(post._id); // we're storing the post in the posts array of the user
    await user.save(); // and saving it

    res.redirect("/profile");
});

app.get("/like/:id", isLoggedIn, async(req, res) => {
    let post = await postModel.findOne({ _id: req.params.id }).populate("userInfo");
    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid);
    }
    else {
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }
    await post.save()
    // console.log(req.user.userid);

    res.redirect("/profile");
});

app.get("/edit/:id", isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({ _id: req.params.id }).populate("userInfo");

    res.render("edit", { post }); 

});

app.post("/update/:id", async(req, res) => {
    let post = await postModel.findOneAndUpdate({ _id: req.params.id }, { content: req.body.content });
    res.redirect("/profile");
});

app.get("/delete/:id", isLoggedIn, async(req, res) =>{
    let post = await postModel.findOneAndDelete({ _id: req.params.id }, { content: req.body.content });
    res.redirect("/profile");
});

app.get("/logout", (req, res) => {
    res.cookie("token", "");
    res.redirect("login");
});

// it's a middleware, which makes sure that our route is protected
// validates the user, and makes sure that once the user is logged in
// he doesn't need to re-login it again, stores the user's important info 
// in the form of token on the frontend
function isLoggedIn(req, res, next) {
    if(req.cookies.token === ""){
        res.redirect("/login");
    }
    else {
        let data = jwt.verify(req.cookies.token, "shhhhhhhhhhhh");
        req.user = data;
        next();
    }
}

app.listen(3000);
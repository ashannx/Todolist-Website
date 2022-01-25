require('dotenv').config()
const express = require("express")
const bodyParser = require("body-parser")
const mongoose = require('mongoose')
const ejs = require("ejs")
const _ = require('lodash')
const ObjectId = require('bson-objectid')
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')

// custom modules
const defaultData = require('./defaultData.js')
const defaultLists = defaultData.defaultLists
const defaultItems = defaultData.defaultItems

// start express server
const app = express();
app.set('view engine', 'ejs');

// use body-parser to read database url
app.use(bodyParser.urlencoded({
  extended: true
}));

// helps it use our css
app.use(express.static("public"))

// for sessions
app.use(session({
  secret:process.env.SECRET,
  resave:false,
  saveUninitialized:false
}))
app.use(passport.initialize())
app.use(passport.session())

async function main() {
  const url = process.env.DATABASE;
  await mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  let userNameEntered = ""
  let userInfo
  let currentUserId = ""
  let currentListItems = []
  let currentListID = ""
  let userLists = []

  // schema
  const itemSchema = new mongoose.Schema({
    itemName: String
  })
  const customListSchema = new mongoose.Schema({
    displayName: String,
    link: String,
    items: [itemSchema]
  })
  const userSchema = new mongoose.Schema({
    name: String,
    password: String,
    lists: [customListSchema]
  });

  userSchema.plugin(passportLocalMongoose)
  const User = mongoose.model("User", userSchema)

  passport.use(User.createStrategy());
  passport.serializeUser(User.serializeUser())
  passport.deserializeUser(User.deserializeUser())

  // home page
  app.route("/")
    .get((req,res)=>{
      //show a home page with a gif of the lists or something?
      //have a button on this page that brings you to the login?
      res.render("username.ejs",{
        errorMessage:""
      })
    })
  app.route("/login")
    .post((req,res)=>{
      const user = new User({
        username:req.body.username,
        password:req.body.password
      })
      req.login(user, (err)=>{
        if(err){
          console.log(err)
          res.redirect("/")
        } else {
          passport.authenticate("local")(req,res,()=>{
            res.redirect("/lists")
          })
        }
      })
    })

  // make new user
  app.route("/create-user")
    .get((req,res)=>{
      res.render("create-user.ejs",{
        errorMessage:""
      })
    })
    .post((req,res) =>{
      if(req.body.password === req.body.confirmPassword && req.body.password.length > 7){
        User.register({username:req.body.username}, req.body.password, (err, user)=>{
          if(err){
            console.log(err);
            res.redirect("/create-user") // add error message
          } else {
            user.lists=defaultLists
            user.save()
            passport.authenticate("local")(req,res,()=>{
              res.redirect("/lists")
            })
          }
        })
      } else {
        res.redirect("/create-user") // add error message
      }
    })

  // all lists page
  app.route("/lists")
    // display list of lists
    .get((req,res)=>{
      if(req.isAuthenticated()){
        User.findOne({_id:req.user._id}, (err, user)=>{
          res.render("all-lists.ejs", {
            userLists:user.lists
          })
        })
      } else {
        res.redirect("/")
      }
    })
    // add new list
    .post((req,res)=>{
      if(req.isAuthenticated()){
        if(req.body.newListTitle){
          User.findOne({_id:req.user._id}, (err, user)=>{
            const newList = {
              displayName: req.body.newListTitle,
              link: _.kebabCase(req.body.newListTitle),
              items: defaultItems
            }
            user.lists.push(newList)
            user.save()
          })
          res.redirect("/lists")
        } else {
          res.redirect("/lists") // error message about title not valid
        }
      } else {
        res.redirect("/")
      }
    })
  // delete a list
  app.post("/lists/:list/delete", (req,res)=>{
    if(req.isAuthenticated()){
      User.findOne({_id:req.user._id}, (err,user)=>{
        user.lists.splice(req.body.listArrayId,1)
        user.save()
      })
      res.redirect("/lists")
    } else {
      res.redirect("/")
    }
  })

  // specific list page
  app.route("/lists/:list")
    .get((req,res)=>{
      if(req.isAuthenticated()){
        User.findOne({_id:req.user._id}, (err,user)=>{
          for (const list of user.lists){
            if(req.params.list === list.link){
              res.render("list.ejs", {
                list:list
              })
              break
            } else {
              res.redirect("/lists")
            }
          }
        })
      } else {
        res.redirect("/")
      }
    })
    // delete an item
    app.patch("/lists/items/delete/:patch", (req,res)=>{
      if(req.isAuthenticated()){
        User.findOne({_id:req.user._id}, (err,user)=>{
          const currentList = user.lists.id(req.body.listDBId)
          currentList.items.splice(req.body.itemArrayId,1)
          user.save()
          res.redirect("/lists/" + currentList.link)
        })
      } else {
        res.redirect("/")
      }
    })



  //ADD ITEM TO LIST
  // app.post("/add-item", function(req, res) {
  //   const newItem = req.body.newItem
  //   const newItemList = req.body.listName
  //
  //   User.findById(currentUserId, function(err, user) {
  //     var doc2 = user.lists.id(currentListID);
  //     doc2.items.push({
  //       itemName: newItem
  //     })
  //     user.save()
  //   })
  //   // console.log("New List Item: " + newItem)
  //   currentListItems.push({
  //     itemName: newItem
  //   })
  //   res.redirect("/user/" + userInfo.name + "/lists/" + newItemList)
  // })



  app.get("/about", function(req, res) {
    res.render("about.ejs")
  })


} // end of main

main().catch((err) => console.log(err));

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, function() {
  console.log("Server started on port " + port);
});

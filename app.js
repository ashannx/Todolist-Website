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
const methodOverride = require('method-override');

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

// to use other http methods with forms
app.use(methodOverride('_method'));

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
      //show a home page with a gif of the lists or something? <-- make this an about page

      if(req.isAuthenticated()){
        req.logout()
      }
      res.render("username.ejs",{
        errorMessage:"",
        button:""
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
            userLists:user.lists,
            button:"Sign Out"
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
  app.patch("/lists/:id", (req,res)=>{
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

  // individual list page
  app.route("/lists/:list")
    .get((req,res)=>{
      if(req.isAuthenticated()){
        User.findOne({_id:req.user._id}, (err,user)=>{
          for (const list of user.lists){
            if(req.params.list === list.link){
              res.render("list.ejs", {
                list:list,
                button:"Sign Out"
              })
            }
          }
        })
      } else {
        res.redirect("/")
      }
    })
    .post((req,res)=>{
      if(req.isAuthenticated()){
        User.findOne({_id:req.user._id}, (err,user)=>{
          const currentList = user.lists.id(req.body.listDBId)
          currentList.items.push({itemName:req.body.newItem})
          user.save()
        })
        res.redirect("/lists/" + req.params.list)
      } else {
        res.redirect("/")
      }
    })
  // delete an item
  app.patch("/lists/:list/:id", (req,res)=>{
    if(req.isAuthenticated()){
      User.findOne({_id:req.user._id}, (err,user)=>{
        const currentList = user.lists.id(req.body.listDBId)
        currentList.items.splice(req.params.itemArrayId,1)
        user.save()
      })
      res.redirect("/lists/" + req.params.list)
    } else {
      res.redirect("/")
    }
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

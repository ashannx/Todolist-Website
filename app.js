const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const ejs = require("ejs");
const _ = require('lodash')
const ObjectId = require('bson-objectid')

// start express server
const app = express();
app.set('view engine', 'ejs');

// user body-parser to use database url?
app.use(bodyParser.urlencoded({
  extended: true
}));

// helps it use our css
app.use(express.static("public"))

async function main() {
  const url = `mongodb+srv://admin:XmFolEM6Bc1aCPtm@webdevtests.dljay.mongodb.net/todolist?retryWrites=true&w=majority`;
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

  const User = mongoose.model("User", userSchema)

  const default1 = {
    itemName: "Welcome to your todolist!"
  };
  const default2 = {
    itemName: "<-- Hit this to remove an item"
  };
  const default3 = {
    itemName: "Add a new item below"
  };
  const defaultItems = [default1, default2, default3];

  const defaultList1 = {
    displayName: "These are all your lists",
    link: "list-1",
    items: defaultItems
  }
  const defaultList2 = {
    displayName: "Click one to open it",
    link: "list-2",
    items: defaultItems
  }
  const defaultList3 = {
    displayName: "Click ___ to delete",
    link: "list-3",
    items: defaultItems
  }
  const defaultLists = [defaultList1, defaultList2, defaultList3]

  // USERNAME PAGE
  app.get("/", function(req, res) {
    userNameEntered = String(req.query.user);
    const userNameError = String(req.query.error);
    const userCreated = String(req.query.created)
    const newUsername = String(req.query.newUser)

    if (userNameError === "true") {
      res.render("username.ejs", {
        errorMessage: "That username does not exist. Please try again or create new user.",
        placeholder: userNameEntered
      })
    } else {
      if (userCreated === "success") {
        res.render("username.ejs", {
          errorMessage: "Username '" + newUsername + "' successfully created. Please log in.",
          placeholder: newUsername
        })
      } else {
        res.render("username.ejs", {
          errorMessage: "This app is functional but keep in mind it is a work in progress. Passwords and lists are not encrypted, please avoid using personal information",
          placeholder: ""
        })
      }

    }
  })

  // post username form from / page
  app.post("/username", function(req, res) {
    userNameEntered = req.body.username.toLowerCase();
    // console.log("User has entered username: '" + userNameEntered + "'");
    const userNameEnteredURIEncoded = encodeURIComponent(userNameEntered);

    // check if user exists
    User.findOne({
      name: userNameEntered
    }, (err, userData) => {
      // if they exist, go to password page
      if (userData) {
        res.redirect("/user/" + userNameEntered)
        userInfo = userData
        currentUserId = userInfo._id
        userLists = userInfo.lists
        // console.log("The user exists. Going to password page.")
        // if not, redirect to home page with error message
      } else {
        const stringUserExists = encodeURIComponent("true")
        res.redirect("/?user=" + userNameEnteredURIEncoded + "&error=" + stringUserExists)
        // console.log("User does not exist, try again.")
      }
    })
  })


  // PASSWORD PAGE
  // display password page
  app.get("/user/:user", function(req, res) {
    const userCapitalized = _.capitalize(req.params.user) //temp, delete this for below option eventually
    const passwordError = String(req.query.error);

    if (passwordError === "true") {
      res.render("password.ejs", {
        userCapitalized: userCapitalized,
        errorMessage: "That password is incorrect. Please try again."
      })
    } else {
      res.render("password.ejs", {
        userCapitalized: userCapitalized,
        errorMessage: "Please enter your password"
      })
    }
  })

  // password page form submit
  app.post("/password", function(req, res) {
    const passwordEntered = req.body.password;
    const user = req.body.userCapitalized.toLowerCase(); //temp

    // look up user's info in database
    if (passwordEntered === userInfo.password) {
      // go to all lists page
      // console.log("Password entered successfully.")
      res.redirect("/user/" + user + "/lists")
    } else {
      const stringPasswordExists = encodeURIComponent("true")
      // go to try again
      // console.log("Password failed.")
      res.redirect("/user/" + user + "/?error=" + stringPasswordExists)
    }
  })

  // ALL LISTS
  app.get("/user/:user/lists", function(req, res) {
    const userCapitalized = _.capitalize(req.params.user) //temp, change this to use userInfo
    // would be better if we checked list items every time we go back to this page??
    res.render("all-lists.ejs", {
      userLists: userLists,
      userLowercase: req.params.user
    })
  })

  // INDIVIDUAL LIST
  app.get("/user/:user/lists/:list", function(req, res) {
    const listName = _.kebabCase(req.params.list)
    listNameCapitalize = _.startCase(listName)
    for (const list of userLists) {
      // console.log(list.link)
      // console.log(listName)
      if (list.link === listName) {
        currentListItems = list.items
        currentListID = list._id
        // console.log("List found, displaying items")
      }
    }

    res.render("list.ejs", {
      listName: listNameCapitalize,
      items: currentListItems,
      username: userInfo.name
    })
  })

  // DELETE ITEM FROM LIST
  app.post("/delete-item", function(req, res) {
    const checkedItemIndex = req.body.checkbox
    const checkedItemName = req.body.itemName
    const checkedItemList = req.body.listName.toLowerCase()
    const checkedItemID = req.body.itemId

    // console.log("Removing item: '" + checkedItemName + "' with id: '" + checkedItemID + "' from list: '" + checkedItemList + "'")

    currentListItems.splice(checkedItemIndex, 1)

    User.findById(currentUserId, function(err, user) {
      var doc = user.lists.id(currentListID);
      doc.items.pull(checkedItemID)
      user.save()
    })
    res.redirect("/user/" + userInfo.name + "/lists/" + checkedItemList)
  })

  //ADD ITEM TO LIST
  app.post("/add-item", function(req, res) {
    const newItem = req.body.newItem
    const newItemList = req.body.listName

    User.findById(currentUserId, function(err, user) {
      var doc2 = user.lists.id(currentListID);
      doc2.items.push({
        itemName: newItem
      })
      user.save()
    })
    // console.log("New List Item: " + newItem)
    currentListItems.push({
      itemName: newItem
    })
    res.redirect("/user/" + userInfo.name + "/lists/" + newItemList)
  })


  // MAKE NEW LISTS
  app.post("/add-list", function(req, res) {
    const newListName = req.body.newList
    // console.log(defaultItems)
    const newList = {
      displayName: _.startCase(newListName),
      link: _.kebabCase(newListName),
      items: defaultItems
    }

    User.findById(currentUserId, function(err, user) {
      user.lists.push(newList)
      user.save()
    })

    userLists.push(newList)

    res.redirect("/user/" + userInfo.name + "/lists")
  })

// TODO DELETE LISTS
  //have separate page with dropdown menu then delete button??

  // MAKE NEW USER
  app.get("/create-user", function(req, res) {
    const createUserError = String(req.query.error);
    let error = ""
    switch (createUserError) {
      case "user-exists":
        error = "Username already exists. Please choose a new one."
        break;
      case "password-length":
        error = "Password length too short. Please try again."
        break;
      case "password-match":
        error = "Passwords do not match. Please try again."
        break;
      default:
        error = ""
    }

    res.render("create-user.ejs", {
      errorMessage: error
    })
  })

  app.post("/create-user", function(req, res) {
    const newUsername = req.body.newUsername.toLowerCase()
    const newPassword = req.body.newPassword
    const confirmPassword = req.body.confirmPassword
    // console.log("Creating New User")

    User.findOne({
      name: newUsername
    }, (err, userData) => {
      if (userData) {
        // user already exists, try again
        const userAlreadyExists = encodeURIComponent("user-exists")
        res.redirect("/create-user/?error=" + userAlreadyExists)
        //better way to organize this (put errors in one variable and redirect there after. don't feel like doing it now though)
        // console.log("Username already exists")
      } else {
        // if passwords match
        if (newPassword === confirmPassword) {
          // if password length greater than 8 characters
          if (newPassword.length >= 8) {
            //create new user
            const newUser = new User({
              name: newUsername,
              password: newPassword,
              lists: defaultLists
            })
            newUser.save()
            // console.log("New user '" + newUsername + "' created")
            res.redirect("/?newUser=" + newUsername + "&created=success")

          } else {
            const passwordLength = encodeURIComponent("password-length")
            res.redirect("/create-user/?error=" + passwordLength)
            // console.log("Password too short")
          }

        } else {
          const passwordsDontMatch = encodeURIComponent("password-match")
          res.redirect("/create-user/?error=" + passwordsDontMatch)
          // console.log("Passwords Don't Match")
        }
      }
    })
  })

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

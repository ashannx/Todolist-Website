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
  displayName: "Add a new list below",
  link: "list-3",
  items: defaultItems
}

exports.defaultItems = [default1, default2, default3]
exports.defaultLists = [defaultList1, defaultList2, defaultList3]

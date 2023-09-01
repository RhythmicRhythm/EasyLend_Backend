const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    author_name: {
      type: String,
      required: true,
    },
    title: {
      type: String,
    },
    desc: {
      type: String,
    },
    content: {
      type: String,
    },
    image: {
      type: String,
      required: [true, "Please add a photo"],
      default:
        "https://images.unsplash.com/photo-1518770660439-4636190af475?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=870&q=80",
    },
    comments: [
      {
        text: {
          type: String,
          required: true,
        },
        name: {
          type: String,
        },
        email: {
          type: "String",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // likesCount: {
    //   type: Number,
    //   default: 0,
    // },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("BlogPost", postSchema);

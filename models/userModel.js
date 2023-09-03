const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Schema for both College and Primary Applications
const userSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: [true, "Please add fullname"],
    },
    email: {
      type: String,
      required: [true, "Please add a email"],
      unique: true,
      trim: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
      minLength: [8, "Password must be up to 8 characters"],
    },
    verificationCode: {
      type: String,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    accountNumber: Number,
    accountBalance: {
      type: Number,
      default: 0,
    },
    borrowedBalance: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

//   Encrypt password before saving to DB
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(this.password, salt);
  this.password = hashedPassword;
  next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;

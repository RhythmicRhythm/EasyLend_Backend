const express = require("express");
const router = express.Router();
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const protect = require("../middleWare/authMiddleware");
const verifier = new (require("email-verifier"))(process.env.EMAIL_VERIFY);

// Generate Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};
//Generate Acc no
function generateAccountNumber() {
  const min = 2000000000;
  const max = 2999999999;
  const accountNumber = Math.floor(Math.random() * (max - min + 1)) + min;

  // Convert the account number to a string and pad it with leading zeros if necessary
  const accountNumberString = accountNumber.toString().padStart(11, "0");

  return accountNumberString;
}

router.post("/register", async (req, res) => {
  const { firstname, lastname, password, email } = req.body;

  // Check if user email already exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    return res.status(400).json({ error: "email has already been registered" });
  }

  // Verify email
  verifier.verify(email, (err, data) => {
    if (err) {
      console.error(err);
      return res.status(404).json({ error: "email verifier" });
    }

    if (
      data.formatCheck === "true" &&
      data.disposableCheck === "false" &&
      data.dnsCheck === "true" &&
      data.smtpCheck !== "false"
    ) {
      // Send welcome email to the user
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: 587,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Welcome to EASYLEND",
        html: `
            <html>
              <head>
                <style>
                  body {
                    font-family: Arial, sans-serif;
                    color: #333;
                    background-color: #f9f9f9;
                    margin: 0;
                    padding: 0;
                  }
                  
                  .container {
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #fff;
                  }
                  
                  h1 {
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 20px;
                  }
                  
                  p {
                    margin-bottom: 10px;
                  }
                  
                  .signature {
                    margin-top: 20px;
                    font-style: italic;
                    color: #777;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>Welcome to EASYLEND,</h1>
                  <p><strong>Dear ${firstname} ${lastname},</strong></p>
                  <p>Welcome, We are excited to have you as a member.</p>
                  <p>Thank you for registering with us.</p>
                  <p class="signature">Best regards,<br>EASYLEND Team</p>
                </div>
              </body>
            </html>
          `,
      };

      // Generate a unique account number
      const accountNumber = generateAccountNumber();

      // Attempt to send the welcome email
      transporter.sendMail(mailOptions, (error) => {
        if (error) {
          return res.status(400).json({ error: "error sending mail" });
        } else {
          // Create new user
          const user = User.create({
            firstname,
            lastname,
            email,
            password,
            accountNumber: accountNumber,
          });

          //   Generate Token
          const token = generateToken(user._id);

          // Send HTTP-only cookie
          res.cookie("token", token, {
            path: "/",
            httpOnly: true,
            expires: new Date(Date.now() + 1000 * 86400), // 1 day
            sameSite: "none",
            secure: true,
          });

          if (user) {
            const { _id, firstname, lastname, email, password } = user;
            console.log("success");
            res.status(200).json({
              _id,
              firstname,
              lastname,
              email,
              password,
              token,
            });
          } else {
            res.status(400).json({ error: "error" });
          }
        }
      });
    } else {
      return res.status(400).json({ error: "emai please use a valid " });
    }
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Validate Request
  if (!email || !password) {
    return res.status(400).json({ error: "Please add email & password" });
  }

  // Check if user exists
  const user = await User.findOne({ email });

  if (!user) {
    res.status(400);
    return res.status(400).json({ error: "user not found! please register" });
  }

  // User exists, check if password is correct
  const passwordIsCorrect = await bcrypt.compare(password, user.password);

  //   Generate Token
  const token = generateToken(user._id);

  // Send HTTP-only cookie
  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 86400), // 1 day
    sameSite: "none",
    secure: true,
  });

  if (user && passwordIsCorrect) {
    const { _id, firstname, lastname, email, password } = user;
    res.status(200).json({
      _id,
      firstname,
      lastname,
      email,
      password,
      token,
    });
  } else {
    return res.status(400).json({ error: "invalid email or password" });
  }
});

router.get("/logout", async (req, res) => {
  res.cookie("token", "", {
    path: "/",
    httpOnly: true,
    expires: new Date(0),
    sameSite: "none",
    secure: true,
  });
  return res.status(200).json({ message: "Successfully Logged Out" });
});

router.get("/loggedin", async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json(false);
  }
  // Verify Token
  const verified = jwt.verify(token, process.env.JWT_SECRET);
  if (verified) {
    return res.json(true);
  }
  return res.json(false);
});

// Route for borrowing
router.put("/borrow", protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const amountToBorrow = parseFloat(req.body.amountToBorrow);

    // Find the user by ID (optional, you can directly use userId)
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the user already has an existing debt
    if (user.borrowedBalance > 0) {
      return res
        .status(400)
        .json({
          message: "You must repay your existing debt before borrowing again",
        });
    }

    // Update the borrowed balance and main balance
    user.borrowedBalance = amountToBorrow;
    user.accountBalance = amountToBorrow;

    // Save the updated user
    const updatedUser = await user.save();

    return res.json({
      message: "Borrowed successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;

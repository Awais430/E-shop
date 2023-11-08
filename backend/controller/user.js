const express = require("express");
const path = require("path");
const User = require("../model/user");
const { upload } = require("../multer");
const router = express.Router();
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const sendToken = require("../utils/sendToken");

const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated } = require("../middleware/auth");

router.post("/create-user", upload.single("file"), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const userEmail = await User.findOne({ email });
    if (userEmail) {
      return next(new ErrorHandler("User Already exists", 400));
    }
    const filename = req.file.filename;
    const fileUrl = path.join(filename);

    const user = {
      name: name,
      email: email,
      password: password,
      avatar: fileUrl,
    };

    // Instead of creating activation token here, you can create it in a separate function
    const activationToken = createActivationToken(user);
    const activationUrl = `http://localhost:3000/activation/${activationToken}`;

    try {
      // Send activation email
      await sendMail({
        email: user.email,
        subject: "Activate your account",
        message: `Hello ${user.name}, please click on the link to activate your account: ${activationUrl}`,
      });

      // Send a response
      res.status(201).json({
        success: true,
        message: `Please check your email - ${user.email} to activate your account!`,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Create activation token function
const createActivationToken = (user) => {
  return jwt.sign(user, process.env.ACTIVATION_SECRET, {
    expiresIn: "1h",
  });
};

// Activate user
router.post(
  "/activation",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { activation_token } = req.body;

      // Add a console log to check the received activation_token
      console.log("Received Activation Token: ", activation_token);

      // Verify the activation token
      const newUser = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET
      );

      // Add a console log to check the decoded user data
      console.log("Decoded User Data: ", newUser);

      if (!newUser) {
        return next(new ErrorHandler("Invalid token", 400));
      }

      const { name, email, password, avatar } = newUser;

      // Check if the user already exists in the database by their email
      let user = await User.findOne({ email });

      if (user) {
        return next(new ErrorHandler("User already exists", 400));
      }

      // If the user doesn't exist, create a new user in the database
      user = await User.create({
        name,
        email,
        avatar,
        password,
      });

      // Send a response with a JWT token or any other action you need
      sendToken(newUser, 201, res);
    } catch (err) {
      // Add a console log to check errors
      console.error("Error in activation endpoint: ", err);

      return next(new ErrorHandler(err.message, 500));
    }
  })
);

// login function
router.post(
  "/login-user",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return next(new ErrorHandler("Please provide the all fields!", 400));
      }

      // const user = await User.findOne({ email }.select("+password"));
      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("User doesn;t exists!", 400));
      }
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return next(
          new ErrorHandler("Please provide the correct information ", 400)
        );
      }
      sendToken(user, 201, res);
      console.log(
        "🚀 ~ file: user.js:136 ~ catchAsyncErrors ~ sendToken:",
        sendToken
      );
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// load user

router.get(
  "/getuser",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return next(new ErrorHandler("user doesn't exists", 400));
      }
      res.status(200).json({
        success:true,
        user,
      })
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;

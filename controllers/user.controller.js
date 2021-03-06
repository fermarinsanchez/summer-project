const mongoose = require('mongoose');
const User = require('../models/user.model');
const mailer = require('../config/mailer.config');
const passport = require('passport');

module.exports.login = (req, res, next) => {
  res.render('users/login');
}

// Controller to social login  Slack (passport)

module.exports.doSocialLogin = (req, res, next) => {
  const passportController = passport.authenticate("slack", (error, user) => {
    if (error) {
      next(error);
    } else {
      req.session.userId = user._id;
      res.redirect("/");
    }
  });

  passportController(req, res, next);
}

// Controller to social login  Google (passport)

module.exports.doSocialLoginGoogle = (req, res, next) => {
  const passportControllerGoogle = passport.authenticate('google', {
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email"
    ]
  });

  passportControllerGoogle(req, res, next);
};




// Controller to callback login  Google (passport)

module.exports.googleCallback = (req, res, next) => {
  const googleCallback = passport.authenticate("google",  (error, user) => {
    if (error) {
      next(error)
    } else {
      req.session.userId = user.id
      res.redirect("/projects")
    }
  });
  
  
  googleCallback(req, res, next);
}

// Controller to do login

module.exports.doLogin = (req, res, next) => {
  User.findOne({ email: req.body.email })
    .then(user => {
      if (user) {
        user.checkPassword(req.body.password)
          .then(match => {
            if (match) {
              if (user.activation.active) {
                req.session.userId = user._id

                res.redirect('/projects')
              } else {
                res.render('users/login', {
                  error: {
                    validation: {
                      message: 'Your account is not active, check your email!'
                    }
                  }
                })
              }
            } else {
              res.render('users/login', {
                error: {
                  email: {
                    message: 'user not found'
                  }
                }
              })
            }
          })
      } else {
        res.render("users/login", {
          error: {
            email: {
              message: "user not found",
            },
          },

        });
      }
    })
    .catch(next)
}

// Controller to users/new view

module.exports.new = (req, res, next) => {
  res.render('users/new');
}

// Controller to edit user

module.exports.edit = (req, res, next) => {
  User.findById(req.params.id)
    .then(user => {
      res.render('users/edit', { user })
    })
    .catch(next)
}

// Controller to update user

module.exports.update = (req, res, next) => {
  const body = req.body

  if (req.file) {
    body.avatar = req.file.path
  }

  User.findByIdAndUpdate(req.params.id, body, { runValidators: true, new: true })
    .then(user => {
      if (user) {
        res.redirect(`/users/${user._id}`)
      } else {
        res.redirect('/projects')
      }
    })
    .catch(next)
}

// Controller to show projects

module.exports.show = (req, res, next) => {
  User.findById(req.params.id)
    .populate({
      path: "projects",
      populate: "staff"
    })
    .populate({
      path: "staffProjects",
      populate: "author"
    })
    .then(user => {
      res.render('users/show', { user })
    })
    .catch(next)
};

// Controller to create user and send email with token and validate

module.exports.create = (req, res, next) => {
  const user = new User({
    ...req.body,
    avatar: req.file ? req.file.path : undefined
  });
  console.log(user)

  user.save()
    .then(user => {
      mailer.sendValidationEmail({
        name: user.name,
        email: user.email,
        id: user._id.toString(),
        activationToken: user.activation.token
      })
      
      res.render('users/login', {
        message: 'Check your email for activation'
      })
    })
    .catch((error) => {
      if (error instanceof mongoose.Error.ValidationError) {
        res.render("users/new", { error: error.errors, user });
      } else if (error.code === 11000) { // error when duplicated user
        res.render("users/new", {
          user,
          error: {
            email: {
              message: 'user already exists'
            }
          }
        });
      } else {
        next(error);
      }
    })
    .catch(next)
}

// Controller to activate user. Set user.active to true

module.exports.activateUser = (req, res, next) => {
  User.findOne({ _id: req.params.id, "activation.token": req.params.token })
    .then(user => {
      if (user) {
        user.activation.active = true;

        user.save()
          .then(user => {
            res.render('users/login', {
              message: 'Your account has been activated, log in below!'
            })
          })
          .catch(e => next)
      } else {
        res.render('users/login', {
          error: {
            validation: {
              message: 'Invalid link'
            }
          }
        })
      }
    })
    .catch(e => next)
}

// Controller to logout user

module.exports.logout = (req, res, next) => {
  req.session.destroy()

  res.redirect('/login')
}

// Controller to delete user

module.exports.delete = (req, res, next) => {
  if (req.params.id.toString() === req.currentUser.id.toString()) {
    req.currentUser.remove()
      .then(() => {
        req.session.destroy()
        res.redirect("/login")
      })
      .catch(next)
  } else {
    res.redirect('/projects')
  }
}
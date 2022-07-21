const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const passportJWT = require('passport-jwt')
const bcrypt = require('bcryptjs')

const { Restaurant, User } = require('../models')

const JwtStrategy = passportJWT.Strategy
const ExtractJwt = passportJWT.ExtractJwt

passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
  },

  (req, email, password, done) => {
    User.findOne({ where: { email } })
      .then(user => {
        if (!user) { // 照不到使用者
          return done(null, false, req.flash('error_messages', '帳號或密碼輸入錯誤！'))
        }
        // 使用者存在，所以開始驗證密碼
        bcrypt.compare(password, user.password)
          .then(res => {
            if (!res) return done(null, false, req.flash('error_messages', '帳號或密碼輸入錯誤！')) // 驗證失敗
            return done(null, user) // 驗證成功
          })
      })
  }
))

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 去哪裡找 token，這裡指定了 authorization header 裡的 bearer 項目。
  secretOrKey: process.env.JWT_SECRET
}

// 使用 jwtOptions 的資訊先解開 Token -> 運用 jwtPayload.id 去資料庫找出 user information -> 拋出去
passport.use(new JwtStrategy(jwtOptions, (jwtPayload, done) => {
  User.findByPk(jwtPayload.id, {
    include: [
      { model: Restaurant, as: 'FavoritedRestaurants' },
      { model: Restaurant, as: 'LikeRestaurants' },
      { model: User, as: 'Followers' }, // 撈出追蹤我的人
      { model: User, as: 'Followings' } // 撈出我追蹤的人
    ]
  })
    .then(user => done(null, user))
    .catch(err => done(err))
}))

passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser((id, done) => {
  User.findByPk(id, {
    include: [
      { model: Restaurant, as: 'FavoritedRestaurants' },
      { model: Restaurant, as: 'LikeRestaurants' },
      { model: User, as: 'Followers' }, // 撈出追蹤我的人
      { model: User, as: 'Followings' } // 撈出我追蹤的人
    ]
  })
    .then(user => done(null, user.toJSON()))
    .catch(err => done(err))
})

module.exports = passport

const bcrypt = require('bcryptjs')

const { User, Restaurant, Comment, Favorite, Like, Followship, Sequelize } = require('../../models')

const { imgurFileHandler } = require('../../helpers/file-helpers')

const userController = {
  signUpPage: (req, res) => { // 負責 render 註冊的頁面
    res.render('signup')
  },
  signUp: (req, res, next) => { // 處理實際註冊行為
    // 如果兩次輸入的密碼不同，就建立一個 Error 物件並拋出
    if (req.body.password !== req.body.passwordCheck) throw new Error('Passwords do not match!') // 當此錯誤發生時，會跳出這個function

    User.findOne({ where: { email: req.body.email } })
      .then(user => {
        if (user) throw new Error('Email already exists!') // 當此錯誤發生時，會跳出這個function
        return bcrypt.hash(req.body.password, 10) // 這裡用return是為了讓 .then可以保持在同一層
      })
      .then(hash => User.create({
        name: req.body.name,
        email: req.body.email,
        password: hash
      }))
      .then(() => {
        req.flash('success_message', '已成功註冊帳號，請登入後使用！')
        res.redirect('/signin')
      })
      .catch(err => next(err)) // next是指呼叫下一個middleware
  },
  signInPage: (req, res) => {
    res.render('signin')
  },
  signIn: (req, res) => {
    req.flash('success_messages', '成功登入！')
    res.redirect('/restaurants')
  },
  logout: (req, res) => {
    req.flash('success_messages', '登出成功！')
    req.logout()
    res.redirect('/signin')
  },
  getUser: (req, res, next) => {
    return Promise.all([
      User.findByPk(req.params.id, {
        attributes: ['id', 'name', 'avatar', 'email'],
        include: [
          { model: Restaurant, as: 'FavoritedRestaurants', attributes: ['id', 'image'] },
          { model: User, as: 'Followers', attributes: ['id', 'avatar'] }, // 撈出追蹤這個user的人
          { model: User, as: 'Followings', attributes: ['id', 'avatar'] } // 撈出這user追蹤的人
        ]
      }),
      Comment.findAll({
        attributes: [Sequelize.fn('DISTINCT', Sequelize.col('restaurant_id')), 'restaurantId'],
        where: { userId: req.params.id },
        include: [{ model: Restaurant, attributes: ['image'] }],
        raw: true,
        nest: true
      })
    ])
      .then(([user, comments]) => {
        if (!user) throw new Error("User didn't exist!")

        return res.render('users/profile', {
          user: user.toJSON(),
          commentNumber: comments.length,
          favoritedRestaurantNumber: user.FavoritedRestaurants.length,
          followerNumber: user.Followers.length,
          followingNumber: user.Followings.length,
          comments
        })
      })
      .catch(err => next(err))
  },
  editUser: (req, res, next) => {
    return User.findByPk(req.params.id, { raw: true })
      .then(user => {
        if (!user) throw new Error("User didn't exist!")
        // if (user.id !== req.user.id) throw new Error('Have no access to modify')
        return res.render('users/edit', { user })
      })
      .catch(err => next(err))
  },
  putUser: (req, res, next) => {
    const userId = Number(req.params.id)
    const { name } = req.body
    const { file } = req
    if (!name) throw new Error('User name is required!')
    if (userId !== req.user.id) throw new Error('Have no access to modify')

    return Promise.all([
      User.findByPk(req.params.id),
      imgurFileHandler(file)
    ])
      .then(([user, avatarPath]) => {
        if (!user) throw new Error("User didn't exist!")

        return user.update({
          name,
          avatar: avatarPath || user.avatar
        })
      })
      .then(() => {
        req.flash('success_messages', '使用者資料編輯成功')
        res.redirect(`/users/${userId}`)
      })
      .catch(err => next(err))
  },
  addFavorite: (req, res, next) => {
    const { restaurantId } = req.params

    return Promise.all([
      Restaurant.findByPk(restaurantId), // 確認餐廳是否存在
      Favorite.findOne({ // 確認這個關聯是否存在
        where: {
          userId: req.user.id,
          restaurantId
        }
      })
    ])
      .then(([restaurant, favorite]) => {
        if (!restaurant) throw new Error("Restaurant didn't exist!")
        if (favorite) throw new Error('You have favorited this restaurant!')

        return Favorite.create({
          userId: req.user.id,
          restaurantId
        })
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  removeFavorite: (req, res, next) => {
    return Favorite.findOne({
      where: {
        userId: req.user.id,
        restaurantId: req.params.restaurantId
      }
    })
      .then(favorite => {
        if (!favorite) throw new Error("You haven't favorited this restaurant")

        return favorite.destroy()
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  addLike: (req, res, next) => {
    const { restaurantId } = req.params

    return Promise.all([
      Restaurant.findByPk(restaurantId),
      Like.findOne({
        where: {
          userId: req.user.id,
          restaurantId
        }
      })
    ])
      .then(([restaurant, like]) => {
        if (!restaurant) throw new Error("Restaurant didn't exist!")
        if (like) throw new Error('You have liked this restaurant!')

        return Like.create({
          userId: req.user.id,
          restaurantId
        })
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  removeLike: (req, res, next) => {
    return Like.findOne({
      where: {
        restaurantId: req.params.restaurantId,
        userId: req.user.id
      }
    })
      .then(like => {
        if (!like) throw new Error("You haven't liked this restaurant!")

        return like.destroy()
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  getTopUsers: (req, res, next) => {
    return User.findAll({
      include: [{ model: User, as: 'Followers' }]
    })
      .then(users => {
        const result = users
          .map(user => ({
            ...user.toJSON(),
            followerCount: user.Followers.length, // 計算該user的「追蹤者人數」
            isFollowed: req.user.Followings.some(f => f.id === user.id) // 判斷目前登入的使用者是否已追蹤該 user 物件
          }))
          .sort((a, b) => b.followerCount - a.followerCount)
        res.render('top-users', { users: result })
      })
      .catch(err => next(err))
  },
  addFollowing: (req, res, next) => {
    const { userId } = req.params
    Promise.all([
      User.findByPk(userId),
      Followship.findOne({
        where: {
          followerId: req.user.id,
          followingId: req.params.userId
        }
      })
    ])
      .then(([user, followship]) => {
        if (!user) throw new Error("User didn't exist!")
        if (followship) throw new Error('You are already following this user!')

        return Followship.create({
          followerId: req.user.id,
          followingId: userId
        })
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  removeFollowing: (req, res, next) => {
    Followship.findOne({
      where: {
        followerId: req.user.id,
        followingId: req.params.userId
      }
    })
      .then(followship => {
        if (!followship) throw new Error("You haven't followed this user!")
        return followship.destroy()
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  }
}

module.exports = userController

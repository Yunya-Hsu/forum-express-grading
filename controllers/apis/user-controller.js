const jwt = require('jsonwebtoken')

const userController = {
  signIn: (req, res, next) => {
    try {
      const userData = req.user.toJSON()
      delete userData.password
      // 發出jwt token，效期30天
      // 第一個參數是我們想打包的資訊，因此放入req.user
      // 第二個參數是密鑰，JWT 會用這組密鑰加上 header 和 payload 進行雜湊，產生一組不可反解的亂數，如果 payload 和 header 的資訊被纂改，就會和這組亂數對不起來。密鑰不會以明碼方式直接寫在程式裡，會放在環境變數中。
      const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '30d' })
      res.json({
        status: 'success',
        data: {
          token,
          user: userData
        }
      })
    } catch (err) {
      next(err)
    }
  }
}

module.exports = userController
